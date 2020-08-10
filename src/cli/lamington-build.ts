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
	// Capture CLI defined contract identifiers
	const contract = process.argv[2];
	// Initialize Lamington configuration
	await ConfigManager.initWithDefaults();
	// Start the EOSIO container image if it's not running.
	if (!(await eosIsReady())) {
		await startEos();
	}
	// Build all smart contracts
	await buildAll([contract]);
	// And stop it if we don't have keepAlive set.
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
