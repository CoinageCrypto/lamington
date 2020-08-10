import { stopContainer, eosIsReady } from './utils';
import { ConfigManager } from '../configManager';

/**
 * Stops the current Lamington docker container
 * @author Kevin Brown <github.com/thekevinbrown>
 */
const run = async () => {
	await ConfigManager.initWithDefaults();

	if (!(await eosIsReady())) {
		console.log(`Can't stop the container as EOS is already not running.`);

		process.exit(1);
	}

	await stopContainer();
};

run().catch((error) => {
	process.exitCode = 1;
	console.log(error);
});
