import axios from 'axios';
import * as Mocha from 'mocha';
import * as mkdirpCallback from 'mkdirp';
import * as rimrafCallback from 'rimraf';
import * as qrcode from 'qrcode-terminal';
import { writeFile as writeFileCallback, exists as existsCallback } from 'fs';
import * as globCallback from 'glob';
import * as path from 'path';
import { promisify } from 'util';

const exists = promisify(existsCallback);
const glob = promisify(globCallback);
const mkdirp = promisify(mkdirpCallback);
const rimraf = promisify(rimrafCallback);
const writeFile = promisify(writeFileCallback);

// It's nice to give people proper stack traces when they have a problem with their code.
// Trace shows async traces, and Clarify removes internal Node entries.
// Source Map Support adds proper source map support so line numbers match up to the original TS code.
import 'trace';
import 'clarify';
Error.stackTraceLimit = 20;

import { Docker } from 'docker-cli-js';
export const docker = new Docker();

import { EOSManager } from '../eosManager';
import { sleep } from '../utils';
import { generateTypes } from '../contracts';
import { ConfigManager } from '../configManager';
import * as spinner from './logIndicator';

/** @hidden Current working directory reference */
const WORKING_DIRECTORY = process.cwd();
/** @hidden Temporary docker resource directory */
const TEMP_DOCKER_DIRECTORY = path.join(__dirname, '.temp-docker');
/** @hidden Slowest Expected test duration */
const TEST_EXPECTED_DURATION = 2000;
/** @hidden Maximum test duration */
const TEST_TIMEOUT_DURATION = 10000;
/** @hidden Maximum number of EOS connection attempts before fail */
const MAX_CONNECTION_ATTEMPTS = 8;

/**
 * Extracts the version identifier from a string
 * @author Kevin Brown <github.com/thekevinbrown>
 * @returns Version identifier
 */
const versionFromUrl = (url: string) => {
	// Looks for strings in this format: `/v1.4.6/`
	const pattern = /\/(v\d+\.\d+\.\d+)\//g;
	const result = pattern.exec(url);

	// Handle result
	if (!result) throw new Error(`Could not extract version number from url: '${url}'`);
	return result[1];
};

/**
 * Constructs the name of the current Lamington Docker image
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Johan Nordberg <github.com/jnordberg>
 * @returns Docker image name
 */
const dockerImageName = async () => {
	await ConfigManager.loadConfigFromDisk();

	return `lamington:eos.${versionFromUrl(ConfigManager.eos)}-cdt.${versionFromUrl(
		ConfigManager.cdt
	)}-contracts.${ConfigManager.contracts}`;
};

/**
 * Determines if the docker image exists
 * @author Kevin Brown <github.com/thekevinbrown>
 * @returns Result of search
 */
export const imageExists = async () => {
	// Fetch image name and check existence
	const result = await docker.command(`images ${await dockerImageName()}`);
	return result.images.length > 0;
};

/**
 * Configures and builds the docker image
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @author Johan Nordberg <github.com/jnordberg>
 */
export const buildImage = async () => {
	// Log notification
	spinner.create('Building docker image');
	// Clear the docker directory if it exists.
	await rimraf(TEMP_DOCKER_DIRECTORY);
	await mkdirp(TEMP_DOCKER_DIRECTORY);
	// Write a Dockerfile so Docker knows what to build.
	const systemDeps = [
		'build-essential',
		'ca-certificates',
		'cmake',
		'curl',
		'git',
		'wget',
	]
	await writeFile(
		path.join(TEMP_DOCKER_DIRECTORY, 'Dockerfile'),
		`
		FROM ubuntu:18.04

		RUN apt-get update --fix-missing && apt-get install -y --no-install-recommends ${systemDeps.join(' ')}
		RUN wget ${ConfigManager.cdt} && apt-get install -y ./*.deb && rm -f *.deb
		RUN wget ${ConfigManager.eos} && apt-get install -y ./*.deb && rm -f *.deb
		RUN eos_ver=$(ls /usr/opt/eosio | head -n 1); \
			git clone --depth 1 --branch ${ConfigManager.contracts} https://github.com/EOSIO/eosio.contracts.git /usr/opt/eosio.contracts &&\
			cd /usr/opt/eosio.contracts && ./build.sh -e "/usr/opt/eosio/$eos_ver" -c /usr/opt/eosio.cdt
		RUN apt-get clean && rm -rf /tmp/* /var/tmp/* && rm -rf /var/lib/apt/lists/*
		`.replace(/\t/gm, '')
	);
	// Execute docker build process
	await docker.command(`build -t ${await dockerImageName()} "${TEMP_DOCKER_DIRECTORY}"`);
	// Clean up after ourselves.
	await rimraf(TEMP_DOCKER_DIRECTORY);
	spinner.end('Built docker image');
};

/**
 * Starts the Lamington container
 * @author Kevin Brown <github.com/thekevinbrown>
 */
export const startContainer = async () => {
	await docker.command(
		`run
				--rm
				--name lamington
				-d
				-p 8888:8888
				-p 9876:9876
				--mount type=bind,src="${WORKING_DIRECTORY}",dst=/opt/eosio/bin/project
				--mount type=bind,src="${__dirname}/../scripts",dst=/opt/eosio/bin/scripts
				-w "/opt/eosio/bin/"
				${await dockerImageName()}
				/bin/bash -c "./scripts/init_blockchain.sh"`
			.replace(/\n/gm, '')
			.replace(/\t/gm, ' ')
	);
};

/**
 * Stops the current Lamington container
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @returns Docker command promise
 */
export const stopContainer = async () => {
	spinner.create('Stopping EOS Docker Container');

	try {
		await docker.command('stop lamington');
		spinner.end('Stopped EOS Docker Container');
	} catch (err) {
		spinner.fail(err);
	}
};

/**
 * Sleeps the process until the EOS instance is available
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @returns Connection success or throws error
 */
export const untilEosIsReady = async (attempts: number = MAX_CONNECTION_ATTEMPTS) => {
	// Begin logging
	spinner.create('Waiting for EOS');
	// Repeat attempts every second until threshold reached
	let attempt = 0;
	while (attempt < attempts) {
		attempt++;
		// Check EOS status
		if (await eosIsReady()) {
			spinner.end('EOS is ready');
			return true;
		}
		// Wait one second
		await sleep(1000);
	}
	// Failed to connect within attempt threshold
	spinner.fail(`Failed to connect with an EOS instance`);
	throw new Error(`Could not contact EOS after trying for ${attempts} second(s).`);
};

/**
 * Determines if EOS is available using the `get_info` query response
 * @author Kevin Brown <github.com/thekevinbrown>
 * @returns EOS instance availability
 */
export const eosIsReady = async () => {
	try {
		const info = await axios.get('http://localhost:8888/v1/chain/get_info');
		return info && info.status === 200;
	} catch (error) {
		return false;
	}
};

/**
 * Pulls the EOSIO docker image if it doesn't exist and starts
 * a new EOSIO docker container
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 */
export const startEos = async () => {
	spinner.create('Starting EOS docker container');
	// Ensure an EOSIO build image exists
	if (!(await imageExists())) {
		console.log('--------------------------------------------------------------');
		console.log('Docker image does not yet exist. Building...');
		console.log(
			'Note: This will take a few minutes but only happens once for each version of the EOS tools you use.'
		);
		console.log();
		console.log(`We've prepared some hold music for you: https://youtu.be/6g4dkBF5anU`);
		console.log();
		qrcode.generate('https://youtu.be/6g4dkBF5anU');
		// Build EOSIO image
		await buildImage();
	}
	// Start EOSIO
	try {
		// Start the EOS docker container
		await startContainer();
		// Pause process until ready
		await untilEosIsReady();
		console.log(
			'                                        \n\
==================================================== \n\
                                                     \n\
      EOS running, admin account created.            \n\
                                                     \n\
      RPC: http://localhost:8888                     \n\
	  Docker Container: lamington                    \n\
                                                     \n\
==================================================== \n'
		);
		spinner.end('Started EOS docker container');
	} catch (error) {
		spinner.fail('Failed to start the EOS container');
		console.log(` --> ${error}`);
		process.exit(1);
	}
};

/**
 * Loads all test files and executes with Mocha
 * @author Kevin Brown <github.com/thekevinbrown>
 * @note This is where we should allow configuration over all files or specified files/folder
 */
export const runTests = async () => {
	// Initialize the EOS connection manager
	EOSManager.initWithDefaults();
	// Register ts-mocha if it's a Typescript project
	if (await exists(path.join(WORKING_DIRECTORY, 'tsconfig.json'))) {
		require('ts-mocha');
	}

	// Register their .env file variables if they have one.
	if (await exists(path.join(WORKING_DIRECTORY, '.env'))) {
		require('dotenv').config({ path: path.join(WORKING_DIRECTORY, '.env') });
	}

	// Find all existing test file paths
	const files = [
		// All ts and js files under the test folder get added.
		...(await glob('{test,tests}/**/*.{js,ts}')),

		// Any .test.ts, .test.js, .spec.ts, .spec.js files anywhere in the working tree
		// outside of node_modules get added.
		...(await glob('!(node_modules)/**/*.{test,spec}.{js,ts}')),
	];

	// Instantiate a Mocha instance.
	const mocha = new Mocha();

	for (const testFile of files) {
		mocha.addFile(path.join(WORKING_DIRECTORY, testFile));
	}

	// Our tests are more like integration tests than unit tests. Taking two seconds is
	// pretty reasonable in our case and it's possible a successful test would take 10 seconds.
	mocha.slow(TEST_EXPECTED_DURATION);
	mocha.timeout(TEST_TIMEOUT_DURATION);
	mocha.reporter(ConfigManager.testReporter);

	// Run the tests.
	await new Promise((resolve, reject) =>
		mocha.run(failures => {
			if (failures) return reject(failures);
			return resolve();
		})
	);
};

/**
 * Finds and builds all C++ contracts
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param match Optional specific contract identifiers to build
 */
export const buildAll = async (match?: string[]) => {
	// Find all contract files
	const errors = [];
	let contracts = await glob('!(node_modules)/**/*.cpp');
	// Cleanse ignored contracts
	contracts = filterMatches(onlyMatches(contracts, match || ['\\.cpp$']));

	if (contracts.length === 0) {
		console.error();
		console.error('Could not find any smart contracts to build.');
		process.exit(1);
	}

	// Log the batch building process
	console.log(`BUILDING ${contracts.length} SMART CONTRACT${contracts.length > 1 ? 'S' : ''}\n`);

	// Build each contract and handle errors
	for (const contract of contracts) {
		try {
			await build(contract);
		} catch (error) {
			errors.push({
				message: `Failed to compile contract ${contract}`,
				error,
			});
		}
	}
	// Report any caught errors
	if (errors.length > 0) {
		// Print each error message and source
		for (const error of errors) console.error(error.message, '\n', ' -> ', error.error);
		// Terminate the current process
		throw new Error(
			`${errors.length} contract${errors.length > 0 ? 's' : ''} failed to compile. Quitting.`
		);
	}
};

const onlyMatches = (paths: string[], matches: string[] = []) => {
	return paths.filter(filePath => {
		return matches.reduce<boolean>((result, str) => {
			const pattern = new RegExp(str, 'gi');
			return result || pattern.test(filePath);
		}, false);
	});
};

const filterMatches = (paths: string[]) => {
	return paths.filter(filePath => {
		return !ConfigManager.exclude.reduce<boolean>((result, match) => {
			const pattern = new RegExp(match, 'gi');
			return result || pattern.test(filePath);
		}, false);
	});
};

/**
 * Resolves the path to file identifier.
 * This is the path without trailing file extension
 * @author Kevin Brown <github.com/thekevinbrown>
 * @note What happens when the input path contains no trailing extension?
 * @param filePath Path to file
 * @returns Identifier path
 */
export const pathToIdentifier = (filePath: string) => filePath.substr(0, filePath.lastIndexOf('.'));

/**
 * Builds contract resources for contract at path
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param contractPath Local path to C++ contract file
 */
export const build = async (contractPath: string) => {
	// Get the base filename from path and log status
	const basename = path.basename(contractPath, '.cpp');
	// Compile contract at path
	await compileContract(contractPath);
	// Generate Typescript definitions for contract
	spinner.create(`Generating type definitions:` + contractPath);
	try {
		await generateTypes(pathToIdentifier(contractPath));
		spinner.end(`Generated type definitions: ` + contractPath);
	} catch (error) {
		spinner.fail(`Failed to generate type definitions: ` + contractPath);
		console.log(` --> ${error.message}`);
	}
};

/**
 * Determines the output location for a contract based on the full path of its C++ file.
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param contractPath Full path to C++ contract file
 * @returns Output path for contract compilation artefacts
 */
export const outputPathForContract = (contractPath: string) =>
	path.join(ConfigManager.outDir, 'compiled_contracts', path.dirname(contractPath));

/**
 * Compiles a C++ EOSIO smart contract at path
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param contractPath Full path to C++ contract file
 */
export const compileContract = async (contractPath: string) => {
	// Begin logs
	spinner.create(`Compiling contract: ` + contractPath);

	const basename = path.basename(contractPath, '.cpp');

	if (!(await exists(contractPath))) {
		spinner.fail(
			`Couldn't locate contract at ${contractPath}. Are you sure used the correct contract identifier when trying to build the contract?`
		);

		throw new Error("Contract doesn't exist on disk.");
	}

	const outputPath = outputPathForContract(contractPath);

	// Run the compile contract script inside our docker container.
	await docker
		.command(
			// Arg 1 is filename, arg 2 is contract name.
			`exec lamington /opt/eosio/bin/scripts/compile_contract.sh "/${path.join(
				'opt',
				'eosio',
				'bin',
				'project',
				contractPath
			)}" "${outputPath}" "${basename}"`
		)
		.catch(err => {
			spinner.fail('Failed to compile');
			console.log(` --> ${err}`);
			throw err;
		});
	// Notify build task completed
	spinner.end(`Compiled contract output into folder: ` + outputPath);
};
