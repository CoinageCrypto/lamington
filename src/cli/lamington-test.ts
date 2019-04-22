import { eosIsReady, startEos, runTests, stopContainer, buildAll } from './utils';
import { GitIgnoreManager } from '../gitignoreManager';
import { ConfigManager } from '../configManager';

const run = async () => {
	// Initialize the configuration
	await ConfigManager.initWithDefaults();
	// Stop running instances when keepAlive is false
	if (!ConfigManager.keepAlive && await eosIsReady()) {
		await stopContainer();
	}
	// Ensures we have our .gitignore inside the .lamington directory
	await GitIgnoreManager.createIfMissing();
	// Start an EOSIO instance if not running
	if (!await eosIsReady()) {
		await startEos();
	}
	// Start compiling smart contracts
	await buildAll();
	// Begin running tests
	await runTests();
	// Stop EOSIO instance if keepAlive is false
	if (!ConfigManager.keepAlive) {
		await stopContainer();
	}
};

run().catch(error => {
	throw error;
});
