import { eosIsReady, startEos, runTests, stopContainer } from './utils';

const run = async () => {
	if (await eosIsReady()) {
		console.log('EOS is running. Stopping...');
		await stopContainer();
	}

	console.log('Starting EOS...');
	await startEos();

	console.log('Running tests...');
	await runTests();

	// console.log('Cleaning up...');
	// await stopContainer();
};

run().catch(error => {
	throw error;
});
