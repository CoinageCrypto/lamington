import { stopContainer, eosIsReady } from './utils';
import { ConfigManager } from '../configManager';

/**
 * Stops the current Lamington docker container
 * @author Kevin Brown <github.com/thekevinbrown>
 */
const run = async () => {
	if (!(await ConfigManager.configExists())) {
		console.log('Project has not yet been initialised.');
		console.log('Please run lamington init before running this command.');

		process.exit(1);
	}

	if (!(await eosIsReady())) {
		console.log(`Can't stop the container as EOS is already not running.`);

		process.exit(1);
	}

	await stopContainer();
};

run().catch(error => {
	process.exitCode = 1;
	console.log(error);
});
