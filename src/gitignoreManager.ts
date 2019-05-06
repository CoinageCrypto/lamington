import * as path from 'path';
import { writeFile as writeFileCallback, exists as existsCallback } from 'fs';
import { promisify } from 'util';

const exists = promisify(existsCallback);
const writeFile = promisify(writeFileCallback);

/* Defaults */
const configDirectory = '.lamington';
const gitignoreFilePath = path.join(configDirectory, '.gitignore');
const encoding = 'utf8';

/**
 * Manages the `.gitignore` file and configuration
 */
export class GitIgnoreManager {
	/**
	 * Creates a `.gitignore` file when it doesn't exist
	 * and configures the base ignore files
	 */
	public static async createIfMissing() {
		if (!(await exists(gitignoreFilePath))) {
			await writeFile(
				gitignoreFilePath,
				`
data/
compiled_contracts/
`,
				encoding
			);
		}
	}
}
