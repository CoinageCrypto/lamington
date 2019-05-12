import { eosIsReady, startEos, stopContainer, buildAll } from './utils';
import { GitIgnoreManager } from '../gitignoreManager';
import { ConfigManager } from '../configManager';

/**
 * Executes a contract build procedure
 * @note Keep alive setup is incomplete
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 */
const run = async () => {
	const contract = process.argv[2];
	// Initialize configuration
	await ConfigManager.initWithDefaults();
	// Stop container if running
	if (!ConfigManager.keepAlive && (await eosIsReady())) {
		await stopContainer();
	}
	// This ensures we have our .gitignore inside the .lamington directory
	await GitIgnoreManager.createIfMissing();
	// Start the EOSIO container image
	if (!(await eosIsReady())) {
		await startEos();
	}
	// Build all smart contracts
	await buildAll([contract]);
};

run().catch(error => {
	stopContainer().then(() => {
		throw error;
	});
});
