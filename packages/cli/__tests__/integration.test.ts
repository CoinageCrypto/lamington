import { ConfigManager } from '@lamington/core';
import { eosIsReady, startEos, stopContainer, buildAll } from '../utils';

context('type generation integration tests', function() {
	before(async function() {
		// This can take a long time.
		this.timeout(400000);

		await ConfigManager.initWithDefaults();
		// Start the EOSIO container image if it's not running.
		if (!(await eosIsReady())) {
			await startEos();
		}
		// Build all smart contracts
		await buildAll();

		// And stop it if we don't have keepAlive set.
		if (!ConfigManager.keepAlive) {
			await stopContainer();
		}
	});

	it('should generate an expected result from the eosio.token contract file', async function() {
		console.log('yup');
	});
});
