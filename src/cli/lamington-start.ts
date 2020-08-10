import { startEos, eosIsReady, stopContainer } from './utils';
import { ConfigManager } from '../configManager';

/**
 * Stops EOS docker container if it's running, then starts it.
 * @note Keep alive setup is incomplete
 * @author Kevin Brown <github.com/thekevinbrown>
 */
const run = async () => {
	await ConfigManager.initWithDefaults();
	// Stop running instances for fresh test environment
	if (await eosIsReady()) {
		await stopContainer();
	}

	await startEos();
};

run().catch((error) => {
	process.exitCode = 1;
	console.log(error);
});
