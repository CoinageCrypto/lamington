import { eosIsReady, startEos, runTests, stopContainer, buildAll } from './utils';
import { GitIgnoreManager } from '../gitignoreManager';
import { ConfigManager } from '../configManager';
import { sleep } from '../utils';

/**
 * Starts an EOSIO docker container if none is found,
 * and executes a smart contract build and test flow.
 */
const run = async () => {
	// Initialize the configuration
	await ConfigManager.initWithDefaults();
	const args = process.argv;

	// Stop running instances for fresh test environment
	if (await eosIsReady()) {
		await stopContainer();
	}

	// Start an EOSIO instance if not running
	if (!(await eosIsReady())) {
		await startEos();
	}
	// Start compiling smart contracts
	if (!args.includes('skip-build')) {
		await buildAll();
	} else {
		await sleep(4000);
	}
	// Begin running tests
	await runTests();
	// Stop EOSIO instance if keepAlive is false
	if (!ConfigManager.keepAlive) {
		await stopContainer();
	}
};

run().catch(async (error) => {
	process.exitCode = 1;
	console.log(error);

	if (!ConfigManager.keepAlive && (await eosIsReady())) {
		await stopContainer();
	}
});
