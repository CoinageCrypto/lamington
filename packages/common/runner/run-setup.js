const chalk = require('chalk');
const shell = require('shelljs');

module.exports = () => {
	var opsys = process.platform;
	let cmd = 'yarn globals:windows';
	if (opsys === 'darwin') {
		cmd = 'yarn globals:mac';
	}
	console.log(chalk.green(cmd));
	shell.exec(cmd);
};
