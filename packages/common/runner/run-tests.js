const inquirer = require('inquirer');
const shell = require('shelljs');

const unitTestOLO = () => {
	let cmd = 'yarn test';
	inquirer
		.prompt([
			{
				type: 'list',
				name: 'run_type',
				message: 'What would you like to run?',
				choices: ['Run all Tests', 'Run Current Tests'],
			},
			{
				type: 'confirm',
				name: 'watch',
				message: 'Watch?',
				default: false,
			},
			{
				type: 'confirm',
				name: 'update',
				message: 'Update Snapshots?',
				default: false,
			},
		])
		.then(answer => {
			switch (answer.run_type) {
				case 'Run all Tests':
					cmd += ':all';
					break;
				case 'Run Current Tests':
					break;
			}
			if (answer.update) {
				cmd += ' -u';
			}
			if (answer.watch) {
				cmd += ' --watch';
			}
			shell.exec(cmd);
		});
};

const e2eOLO = () => {
	inquirer
		.prompt([
			{
				type: 'list',
				name: 'run_type',
				message: 'Which platform would you like to run on',
				choices: ['Run iOS', 'Run Android'],
			},
			{
				type: 'confirm',
				name: 'install',
				message: 'Install App?',
				default: false,
			},
		])
		.then(answer => {
			switch (answer.run_type) {
				case 'Run iOS':
					const testCmd = answer.install ? 'yarn start:olo:ios && ' : '';
					shell.exec(`${testCmd}cd ./e2e/olo.native && yarn test:ios:ci`);
					break;
				case 'Run Android':
					const testAndroidCmd = answer.install ? 'yarn start:olo:android && ' : '';
					shell.exec(`${testAndroidCmd}cd ./e2e/olo.native && yarn test:android:ci`);
					break;
			}
		});
};

module.exports = () => {
	inquirer
		.prompt({
			type: 'list',
			name: 'run_type',
			message: 'What would you like to run?',
			choices: ['Run Unit Tests', 'Run E2E Tests'],
		})
		.then(answer => {
			switch (answer.run_type) {
				case 'Run Unit Tests':
					unitTestOLO();
					break;
				case 'Run E2E Tests':
					e2eOLO();
					break;
			}
		});
};
