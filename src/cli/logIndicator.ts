import ora, { Ora } from 'ora';
import * as colors from 'colors';

/** Holds spinner instances */
const cache:{ spinner?:Ora } = {};

/** Alters output based on the process being piped */
const isTTY:boolean = process.env.CI ? false : process.stdout.isTTY!;

/**
 * Creates a new spinner instance with the specified message
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param text Output display message
 */
export const create = (text:string) => {
    // Handle process piping
    if (!isTTY) {
        console.log(`lamington - ${text}`);
        return;
    }
    // Cleanup existing spinner
    if (cache.spinner) {
        cache.spinner.succeed();
        delete cache.spinner;
    }
    // Create and cache spinner
    cache.spinner = ora({
        text,
        color: 'magenta'
    }).start();
}

/**
 * Terminates the current spinner with the specified output message
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param message Output message
 * @param isError Renders output as error toggle
 */
export const end = (message?:string, isError:boolean = false) => {
    // Handle process piping
    if (!isTTY) {
        console.log(`create-react-app - ${message}`);
        return;
    }
    // Handle existing spinner
    if (cache.spinner) {
        (isError ? cache.spinner.fail() : cache.spinner.succeed());
        delete cache.spinner;
    }
    // Output closure message
    if (!message || message == '') return;
    const prefix = isError ? colors.red('ERROR:') : colors.green('DONE!');
    console.log(`
${prefix} ${message}
`);
}

/**
 * Terminates the current spinner as an error with output message
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param message Spinner message.
 */
export const fail = (message:string) => {
    end(message, true);
    process.exit(1);
}