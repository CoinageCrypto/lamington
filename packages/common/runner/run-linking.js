const inquirer = require('inquirer');
const shell = require('shelljs');

module.exports = () => {
	inquirer
		.prompt({
			type: 'list',
			name: 'run_linking',
			message: 'What would you like to do?',
			choices: ['Publish Locally', 'Push Updates', 'Remove Locally'],
		})
		.then(answer => {
			switch (answer.run_linking) {
				case 'Local Development':
					inquirer
						.prompt({
							type: 'confirm',
							name: 'run_update',
							message: 'Update instead?',
							default: false,
						})
						.then(subAnswer => {
							if (subAnswer.run_update) {
								shell.exec(`yarn publish:local`);
							} else {
								shell.exec(`yarn publish:local:update`);
							}
						});
					break;
				case 'Push Updates':
					shell.exec(`yarn publish:local:update`);
					break;
				case 'Remove Locally':
					shell.exec(`yarn clean:link`);
					break;
			}
		});
};
