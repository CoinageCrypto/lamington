import { startEos, eosIsReady, stopContainer } from './utils';

/**
 * Stops EOS docker container if it's running, then starts it.
 * @note Keep alive setup is incomplete
 * @author Kevin Brown <github.com/thekevinbrown>
 */
const run = async () => {
	// Stop running instances for fresh test environment
	if (await eosIsReady()) {
		await stopContainer();
	}

	await startEos();
};

run().catch(async error => {
	process.exitCode = 1;
	console.log(error);
});
