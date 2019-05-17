import { startEos, eosIsReady, stopContainer } from './utils';
import { ConfigManager } from '../configManager';

/**
 * Stops EOS docker container if it's running, then starts it.
 * @note Keep alive setup is incomplete
 * @author Kevin Brown <github.com/thekevinbrown>
 */
const run = async () => {
	if (!(await ConfigManager.configExists())) {
		console.log('Project has not yet been initialised.');
		console.log('Please run lamington init before running this command.');

		process.exit(1);
	}

	// Stop running instances for fresh test environment
	if (await eosIsReady()) {
		await stopContainer();
	}

	await startEos();
};

run().catch(error => {
	process.exitCode = 1;
	console.log(error);
});
