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
	const result = url.match(pattern);
	// Handle result
	if (!result) throw new Error(`Could not extract version number from url: '${url}'`);
	return result[1];
};

/**
 * Constructs the name of the current Lamington Docker image
 * @author Kevin Brown <github.com/thekevinbrown>
 * @returns Docker image name
 */
const dockerImageName = async () => {
	await ConfigManager.initWithDefaults();

	return `lamington:eos.${versionFromUrl(ConfigManager.eos)}-cdt.${versionFromUrl(
		ConfigManager.cdt
	)}`;
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
 */
export const buildImage = async () => {
	// Log notification
	spinner.create('Building docker image');
	// Clear the docker directory if it exists.
	await rimraf(TEMP_DOCKER_DIRECTORY);
	await mkdirp(TEMP_DOCKER_DIRECTORY);
	// Write a Dockerfile so Docker knows what to build.
	await writeFile(
		path.join(TEMP_DOCKER_DIRECTORY, 'Dockerfile'),
		`
		FROM ubuntu:18.04

		RUN apt-get update && apt-get install -y --no-install-recommends wget curl ca-certificates
		RUN wget ${ConfigManager.cdt} && apt-get install -y ./*.deb && rm -f *.deb
		RUN wget ${ConfigManager.eos} && apt-get install -y ./*.deb && rm -f *.deb
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
	spinner.create('Stopping Lamington');

	try {
		await docker.command('stop lamington');
		spinner.end('Stopped Lamington');
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
		await axios.get('http://localhost:8888/v1/chain/get_info');
		return true;
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
		spinner.end("Started EOS docker container")
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
	// Find all existing test file paths
	const files = [
		// All ts and js files under the test folder get added.
		...(await glob('test/**/*.ts')),
		...(await glob('test/**/*.js')),

		// Any .test.ts, .test.js files anywhere in the working tree
		// get added.
		...(await glob('**/*.test.ts')),
		...(await glob('**/*.test.js')),

		// Any .spec.ts, .spec.js files anywhere in the working tree
		// get added.
		...(await glob('**/*.spec.ts')),
		...(await glob('**/*.spec.js')),
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
 * @note Should be configurable with a RegExp or something to prevent all C++ files being compiled
 * @param contracts Optional contract paths to build
 */
export const buildAll = async (contracts?: string[]) => {
	// Find all contract files
	contracts = await glob('./**/*.cpp');
	const errors = [];
	// Log the batch building process
	console.log(`BUILDING ${contracts.length} SMART CONTRACTS`, '\n');
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
	console.log(basename);
	// Compile contract at path
	await compileContract(contractPath);
	// Generate Typescript definitions for contract
	spinner.create(`Generating type definitions`);
	try {
		await generateTypes(pathToIdentifier(contractPath));
		spinner.end(`Generated type definitions`);
	} catch (error) {
		spinner.fail(`Failed to generate type definitions`);
		console.log(` --> ${error.message}`);
	}
};

/**
 * Compiles a C++ EOSIO smart contract at path
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param contractPath Fullpath to C++ contract file
 */
export const compileContract = async (contractPath: string) => {
	// Begin logs
	spinner.create(`Compiling contract`);
	// Get the base filename from path and log status
	const basename = path.basename(contractPath, '.cpp');
	const fullPath = path.join(ConfigManager.outDir, path.dirname(contractPath));
	// Pull docker images
	await docker.command(
		// Arg 1 is filename, arg 2 is contract name.
		`exec lamington /opt/eosio/bin/scripts/compile_contract.sh "/${path.join(
			'opt',
			'eosio',
			'bin',
			'project',
			contractPath
		)}" "${fullPath}" "${basename}"`
	).catch(err => {
		spinner.fail("Failed to compile");
		console.log(` --> ${err}`);
		throw err;
	});
	// Notify build task completed
	spinner.end(`Compiled contract`);
};
