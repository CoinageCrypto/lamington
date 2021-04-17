import * as colors from 'colors';

import { ProjectManager } from './../project/projectManager';
import { ConfigManager } from '../configManager';

/**
 * Bootstraps a basic Lamington project setup ready
 * for smart contract development.
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
