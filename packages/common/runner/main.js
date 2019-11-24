const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const shell = require('shelljs');
const logo = require('./logo');
const askTestQuestions = require('./run-tests');
const installPackages = require('./run-setup');

const init = () => {
	// tslint:disable: no-console
	const welcome = figlet.textSync('lamington');
	console.log(chalk.cyan(logo));
	console.log(chalk.cyan(welcome));
};

const askQuestions = () => {
	const initialQuestion = {
		type: 'list',
		name: 'type',
		message: 'What would you like to do?',
		choices: [
			'Link Lamington',
			'Run Tests',
			'Run Code Linting',
			'Run Code Clean',
			'Setup Development Environment',
		],
	};
	return inquirer.prompt(initialQuestion);
};

const run = async () => {
	init();

	// ask questions
	const answers = await askQuestions();
	switch (answers.type) {
		case 'Link Lamington':
			shell.exec('yarn link');
			break;
		case 'Run Tests':
			askTestQuestions();
			break;
		case 'Setup Development Environment':
			installPackages();
			break;
		case 'Run Code Linting':
			shell.exec('yarn lint');
			break;
		case 'Run Code Clean':
			shell.exec('yarn clean');
			break;
	}
};

run();
