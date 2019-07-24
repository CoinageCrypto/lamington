import * as colors from 'colors';

import { ProjectManager } from './../project/projectManager';
import { ConfigManager } from '../configManager';
import * as rimRafCallback from 'rimraf';
import { promisify } from 'util';

const rimraf = promisify(rimRafCallback);

/**
 * Executes a contract build procedure
 * @note Keep alive setup is incomplete
 * @author Mitch Pierias <github.com/MitchPierias>
 */
const run = async () => {
    
    await rimraf('.lamington');

    //await ProjectManager.initWithDefaults();
};

run().catch(error => {
	process.exitCode = 1;
	console.log(error);
});
