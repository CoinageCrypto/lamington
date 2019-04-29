import { stopContainer } from './utils';

/**
 * Stops the current Lamington docker container
 * @author Kevin Brown <github.com/thekevinbrown>
 */
stopContainer()
	.then(() => console.log('Lamington container stopped.'))
	.catch(error => {
		console.log();
		console.log('Could not stop container. Is it running?');
		console.log();
		console.log('Error from docker:');
		console.error(error);

		process.exit(2);
	});
