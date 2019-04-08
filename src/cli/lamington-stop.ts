import { stopContainer } from './utils';

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
