import { ProjectManager } from './../project/projectManager';
import { ConfigManager } from './../configManager';
import * as colors from 'colors';

/**
 * Executes a contract build procedure
 * @note Keep alive setup is incomplete
 * @author Mitch Pierias <github.com/MitchPierias>
 */
const run = async () => {

    await ProjectManager.initWithDefaults();
    
    await ConfigManager.createConfigWhenMissing();

    console.log(colors.white(`

    .                                       .                 
    /       ___  , _ , _   \` , __     ___. _/_     __.  , __  
    |      /   \` |' \`|' \`. | |'  \`. .'   \`  |    .'   \ |'  \`.
    |     |    | |   |   | | |    | |    |  |    |    | |    |
    /---/ \`.__/| /   '   / / /    |  \`---|  \\__/  \`._.' /    |
                                     \___/                    
   
   `))
};

run().catch(error => {
    throw error;
});
