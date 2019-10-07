import ora, { Ora } from 'ora';
import * as colors from 'colors';

/** Holds spinner instances */
const cache: { spinner?: Ora } = {};

/**
 * Creates a new spinner instance with the specified message
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param text Output display message
 */
export const create = (text: string) => {
	// Cleanup existing spinner
	if (cache.spinner) {
		cache.spinner.succeed();
		delete cache.spinner;
	}
	// Create and cache spinner
	update(text);
};

/**
 * Updates the text of the current spinner
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param text CLI output text to display
 */
export const update = (text: string) => {
	// Create spinner when missing
	if (!cache.spinner)
		cache.spinner = ora({
			text: colors.white(text),
			color: 'magenta',
		}).start();
	// Update spinner text
	cache.spinner.text = colors.white(text);
};

/**
 * Terminates the current spinner with the specified output message
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param message Output message
 * @param isError Renders output as error toggle
 */
export const end = (message: string = '', isError: boolean = false) => {
	// Check spinner reference
	if (!cache.spinner) return;
	// Handle output
	if (isError) {
		cache.spinner.fail(colors.cyan(message));
	} else {
		cache.spinner.succeed(colors.cyan(message));
	}
	// Clear spinner reference
	delete cache.spinner;
};

/**
 * Terminates the current spinner as an error with output message
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param message Spinner message.
 */
export const fail = (message: string) => {
	end(message, true);
};
