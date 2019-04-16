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

const workingDirectory = process.cwd();

import { EOSManager } from '../eosManager';
import { sleep } from '../utils';
import { generateTypes } from '../contracts';
import { ConfigManager } from '../configManager';

const TEMP_DOCKER_DIRECTORY = path.join(__dirname, '.temp-docker');

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
		`run --rm --name lamington -d -p 8888:8888 -p 9876:9876 --mount type=bind,src="${workingDirectory}",dst=/opt/eosio/bin/project --mount type=bind,src="${__dirname}/../scripts",dst=/opt/eosio/bin/scripts -w "/opt/eosio/bin/" ${await dockerImageName()} /bin/bash -c "./scripts/init_blockchain.sh"`
	);
};

export const stopContainer = () => docker.command('stop lamington');

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

export const startEos = async () => {
	await mkdirp(path.join(workingDirectory, '.lamington', 'compiled_contracts'));
	await mkdirp(path.join(workingDirectory, '.lamington', 'data'));

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

		await buildImage();
	}

	try {
		await startContainer();

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
===================================================='
		);
	} catch (error) {
		console.error('Could not start EOS blockchain. Error: ', error);
		process.exit(1);
	}
};

export const runTests = async () => {
	// Initialise Lamington with defaults.
	// This creates EOSJS and initialises the admin account.
	EOSManager.initWithDefaults();

	// Only need to register ts-mocha if it's a typescript project.
	if (await exists(path.join(workingDirectory, 'tsconfig.json'))) {
		require('ts-mocha');
	}

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
		mocha.addFile(path.join(workingDirectory, testFile));
	}

	// Our tests are more like integration tests than unit tests. Taking two seconds is
	// pretty reasonable in our case.
	mocha.slow(2000);

	// Run the tests.
	await new Promise((resolve, reject) =>
		mocha.run(failures => {
			if (failures) return reject(failures);

			return resolve();
		})
	);
};

export const buildAll = async () => {
	const contracts = await glob('./**/*.cpp');
	const errors = [];

	for (const contract of contracts) {
		try {
			await build(contract);
		} catch (error) {
			errors.push({
				error: `Failed to compile contract ${contract}`,
				underlyingError: error,
			});
		}
	}

	if (errors.length > 0) {
		for (const error of errors) {
			console.error(error.error);
			console.error(' -> ', error.underlyingError);
		}

		console.error();
		console.error(`${errors.length} contract(s) failed to compile. Quitting.`);

		process.exit(1);
	}
};

export const pathToIdentifier = (contractPath: string) =>
	contractPath.substr(0, contractPath.lastIndexOf('.'));

export const build = async (contractPath: string) => {
	const basename = path.basename(contractPath, '.cpp');

	console.log(`- Compiling ${basename}:`);

	await docker.command(
		// Arg 1 is filename, arg 2 is contract name. They're the same for us.
		`exec lamington /opt/eosio/bin/scripts/compile_contract.sh "/${path.join(
			'opt',
			'eosio',
			'bin',
			'project',
			contractPath
		)}" "${path.dirname(contractPath)}" "${basename}"`
	);

	await generateTypes(pathToIdentifier(contractPath));
};
