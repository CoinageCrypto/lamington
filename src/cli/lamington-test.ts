import { eosIsReady, startEos, runTests, stopContainer, buildAll } from './utils';

const run = async () => {
	if (await eosIsReady()) {
		console.log('EOS is running. Stopping...');
		await stopContainer();
	}

	console.log('Starting EOS...');
	await startEos();

	console.log('Building smart contracts...');
	await buildAll();

	console.log('Running tests...');
	await runTests();

	// console.log('Cleaning up...');
	// await stopContainer();
};

run().catch(error => {
	throw error;
});
