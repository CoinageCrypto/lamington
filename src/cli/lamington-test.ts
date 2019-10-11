import { eosIsReady, startEos, runTests, stopContainer, buildAll } from './utils';
import { GitIgnoreManager } from '../gitignoreManager';
import { ConfigManager } from '../configManager';

export var verbose_logging: Boolean;

/**
 * Executes a build and test procedure
 * @note Keep alive setup is incomplete
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 */
const run = async () => {
	// Initialize the configuration
	await ConfigManager.initWithDefaults();
	const args = process.argv;

	console.log('args: ' + args);

	if (args.includes('verbose')) {
		verbose_logging = true;
		console.log('`verbose_logging` set to `true`');
	}

	// Stop running instances for fresh test environment
	if (await eosIsReady()) {
		await stopContainer();
	}

	// Start an EOSIO instance if not running
	if (!(await eosIsReady())) {
		await startEos();
	}
	// Start compiling smart contracts
	if (!args.includes('skip-build')) {
		await buildAll();
	}
	// Begin running tests
	await runTests();
	// Stop EOSIO instance if keepAlive is false
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
