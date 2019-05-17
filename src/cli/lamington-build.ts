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

	if (!(await ConfigManager.configExists())) {
		console.log('Project has not yet been initialised.');
		console.log('Please run lamington init before running this command.');

		process.exit(1);
	}

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

run().catch(async error => {
	process.exitCode = 1;
	console.log(error);

	if (!ConfigManager.keepAlive && (await eosIsReady())) {
		await stopContainer();
	}
});
