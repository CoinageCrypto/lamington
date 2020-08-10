import * as colors from 'colors';

import { ProjectManager } from './../project/projectManager';
import { ConfigManager } from '../configManager';

/**
 * Executes a contract build procedure
 * @note Keep alive setup is incomplete
 * @author Mitch Pierias <github.com/MitchPierias>
 * @author Kevin Brown <github.com/thekevinbrown>
 */
const run = async () => {
	await ProjectManager.initWithDefaults();

	console.log(
		colors.white(`

    .                                       .                 
    /       ___  , _ , _   \` , __     ___. _/_     __.  , __  
    |      /   \` |' \`|' \`. | |'  \`. .'   \`  |    .'   \ |'  \`.
    |     |    | |   |   | | |    | |    |  |    |    | |    |
    /---/ \`.__/| /   '   / / /    |  \`---|  \\__/  \`._.' /    |
                                     \___/                    
   
   `)
	);
};

run().catch((error) => {
	process.exitCode = 1;
	console.log(error);
});
