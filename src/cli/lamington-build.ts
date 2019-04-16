import { eosIsReady, startEos, runTests, stopContainer, buildAll } from './utils';
import { GitIgnoreManager } from '../gitignoreManager';
import { ConfigManager } from '../configManager';

const run = async () => {
	if (await eosIsReady()) {
		console.log('EOS is running. Stopping...');
		await stopContainer();
	}

	// This initialises the config
	console.log('Getting configuration...');
	await ConfigManager.initWithDefaults();

	// This ensures we have our .gitignore inside the .lamington directory
	await GitIgnoreManager.createIfMissing();

	console.log('Starting EOS...');
	await startEos();

	console.log('Building smart contracts...');
	await buildAll();

	console.log('Stopping EOS...');
	await stopContainer();
};

run().catch(error => {
	console.log('Stopping EOS...');
	stopContainer().then(() => {
		throw error;
	});
});
