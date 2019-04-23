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

const WORKING_DIRECTORY = process.cwd();
const TEMP_DOCKER_DIRECTORY = path.join(__dirname, '.temp-docker');
const TEST_EXPECTED_DURATION = 2000;
const TEST_TIMEOUT_DURATION = 10000;

const versionFromUrl = (url: string) => {
	// Looks for strings in this format:
	// '/v1.4.6/'
	// Allows us to pull just the version part out with the group.
	const pattern = /\/(v\d+\.\d+\.\d+)\//g;
	const result = url.match(pattern);

	if (!result) throw new Error(`Could not extract version number from url: '${url}'`);

	return result[1];
};

const dockerImageName = async () => {
	await ConfigManager.initWithDefaults();

	return `lamington:eos.${versionFromUrl(ConfigManager.eos)}-cdt.${versionFromUrl(
		ConfigManager.cdt
	)}`;
};

export const imageExists = async () => {
	const result = await docker.command(`images ${await dockerImageName()}`);

	return result.images.length > 0;
};

export const buildImage = async () => {
	// Clear the docker directory if it exists.
	await rimraf(TEMP_DOCKER_DIRECTORY);
	await mkdirp(TEMP_DOCKER_DIRECTORY);

	// Write a Dockerfile so docker knows what to build.
	await writeFile(
		path.join(TEMP_DOCKER_DIRECTORY, 'Dockerfile'),
		`
FROM ubuntu:18.04

RUN apt-get update && apt-get install -y --no-install-recommends wget curl ca-certificates
RUN wget ${ConfigManager.cdt} && apt-get install -y ./*.deb && rm -f *.deb
RUN wget ${ConfigManager.eos} && apt-get install -y ./*.deb && rm -f *.deb
RUN apt-get clean && rm -rf /tmp/* /var/tmp/* && rm -rf /var/lib/apt/lists/*
`
	);

	await docker.command(`build -t ${await dockerImageName()} "${TEMP_DOCKER_DIRECTORY}"`);

	// Clean up after ourselves.
	await rimraf(TEMP_DOCKER_DIRECTORY);
};

export const startContainer = async () => {
	await docker.command(
		`run --rm --name lamington -d -p 8888:8888 -p 9876:9876 --mount type=bind,src="${WORKING_DIRECTORY}",dst=/opt/eosio/bin/project --mount type=bind,src="${__dirname}/../scripts",dst=/opt/eosio/bin/scripts -w "/opt/eosio/bin/" ${await dockerImageName()} /bin/bash -c "./scripts/init_blockchain.sh"`
	);
};

export const stopContainer = () => {
	spinner.create('Stopping EOS container');
	return docker.command('stop lamington')
	.then(() => spinner.end())
	.catch(err => spinner.fail(err));
}

export const untilEosIsReady = async (attempts = 8) => {
	let attempt = 0;

	while (attempt < attempts) {
		attempt++;

		if (await eosIsReady()) return true;

		await sleep(1000);
	}

	throw new Error(`Could not contact EOS after trying for ${attempts} second(s).`);
};

export const eosIsReady = async () => {
	try {
		await axios.get('http://localhost:8888/v1/chain/get_info');
		return true;
	} catch (error) {
		return false;
	}
};

/**
 * Start a new EOSIO docker image
 * @author Kevin Brown <github.com/thekevinbrown>
 */
export const startEos = async () => {
	// Create build result cache directories
	await mkdirp(path.join(WORKING_DIRECTORY, '.lamington', 'compiled_contracts'));
	await mkdirp(path.join(WORKING_DIRECTORY, '.lamington', 'data'));
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
		spinner.create('Starting EOS');
		// Start the EOS docker container
		await startContainer();
		// Pause process until ready
		await untilEosIsReady();
		spinner.end();
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
	} catch (error) {
		console.error('Could not start EOS blockchain. Error: ', error);
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
export const buildAll = async (contracts?:string[]) => {
	// Start log output
	spinner.create('Building smart contracts...');
	// Find all contract files
	contracts = await glob('./**/*.cpp');
	const errors = [];
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
		// Close error report
		spinner.fail(`\n${errors.length} contract(s) failed to compile. Quitting.`);
		// Terminate the current process
		process.exit(1);
	} else {
		spinner.end();
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
export const pathToIdentifier = (filePath: string) =>
	filePath.substr(0, filePath.lastIndexOf('.'));

/**
 * Compiles an EOSIO contract and generates Typescript definitions
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param contractPath Fullpath to the CPP contract file
 */
export const build = async (contractPath: string) => {
	// Get the base filename from path and log status
	const basename = path.basename(contractPath, '.cpp');
	spinner.create(`Compiling ${basename}`);
	// Pull docker images
	await docker.command(
		// Arg 1 is filename, arg 2 is contract name.
		`exec lamington /opt/eosio/bin/scripts/compile_contract.sh "/${path.join(
			'opt',
			'eosio',
			'bin',
			'project',
			contractPath
		)}" "${path.dirname(contractPath)}" "${basename}"`
	);
	spinner.end();
	// Generate Typescript definitions for contract
	await generateTypes(pathToIdentifier(contractPath));
	// Notify build task completed
	spinner.end(`Compiled ${basename}`)
};
