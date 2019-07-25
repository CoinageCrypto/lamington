#!/usr/bin/env node

import * as program from 'commander';
const packageConfig = require('../../package.json');

program
	.allowUnknownOption(false)
	.version(packageConfig.version)
	.description(packageConfig.description)
	.command('init', 'initialize a lamington project')
	.command('build [contract_path]', 'build all smart contracts')
	.command('start', 'start the eos blockchain in docker')
	.command('stop', 'stop the eos blockchain in docker')
	.command('test', 'run your unit / integration tests')
	.on('*', () => {
		console.log('Unknown Command: ' + program.args.join(' '));
		program.help();
	})
	.parse(process.argv);
