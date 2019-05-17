import * as colors from 'colors';
import * as path from 'path';
import * as mkdirpCallback from 'mkdirp';
import {
	readFile as readFileCallback,
	writeFile as writeFileCallback,
	exists as existsCallback,
	readdir as readdirCallback,
} from 'fs';
import { promisify } from 'util';
import { ConfigManager, LamingtonConfig } from './../configManager';
import * as spinner from './../cli/logIndicator';
import { sleep } from '../utils';
import { GitIgnoreManager } from '../gitignoreManager';

const exists = promisify(existsCallback);
const mkdirp = promisify(mkdirpCallback);
const writeFile = promisify(writeFileCallback);
const readFile = promisify(readFileCallback);
const readdir = promisify(readdirCallback);

/** Default encoding */
const ENCODING = 'utf8';

/**
 * Fetches and stores the latest EOS configuration images
 * @author Mitch Pierias <github.com/MitchPierias>
 */
export class ProjectManager {
	/** @hidden Reference to the local `package.json` file */
	private static pkg: {
		scripts?: { [key: string]: string };
		devDependencies?: { [key: string]: string };
	};

	/**
	 * Downloads the example project and integrates aspects where required.
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	public static async initWithDefaults() {
		let packageJson = '';
		try {
			packageJson = await readFile(path.join(process.cwd(), 'package.json'), ENCODING);
		} catch (error) {
			console.error();
			console.error(
				colors.red(
					'Could not read project package.json file in this folder. Is this a node project folder?'
				)
			);
			console.error();

			process.exit(1);
		}

		ProjectManager.pkg = JSON.parse(packageJson);

		await ProjectManager.configureScripts();

		await ProjectManager.configureDependencies();

		await ProjectManager.createProjectStructure();

		await ProjectManager.pullExampleProject();

		await writeFile(
			path.join(process.cwd(), 'package.json'),
			JSON.stringify(ProjectManager.pkg, null, 4),
			ENCODING
		);

		await ConfigManager.createConfigIfMissing();

		await GitIgnoreManager.createIfMissing();
	}

	/**
	 * Configures the projects `package.json` scripts for a standard Lamington environment
	 * @note Should merge the scripts provided in the example project with existing
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @hidden
	 */
	private static async configureScripts() {
		spinner.create('Adding scripts');
		const { scripts } = ProjectManager.pkg;
		const defaultScripts = {
			build: 'lamington build',
			test: 'lamington test',
		};
		ProjectManager.pkg.scripts = { ...defaultScripts, ...scripts };
		spinner.end('Added scripts');
	}

	private static async configureDependencies() {
		spinner.create('Adding dependencies');
		const { devDependencies } = ProjectManager.pkg;
		const defaultDependencies = {
			lamington: 'latest',
		};
		ProjectManager.pkg.devDependencies = { ...defaultDependencies, ...devDependencies };
		spinner.end('Added recommended dependencies');
	}

	/**
	 * Downloads the latest example Lamington project from GitHub
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @hidden
	 */
	private static async pullExampleProject() {
		const files = await readdir(path.join(process.cwd(), 'contracts'));
		spinner.create('Pulling example project');

		await sleep(1000);
		if (files.length <= 0) {
			spinner.end('Included example project');
		} else {
			spinner.end('Project contained contracts');
		}
	}

	/**
	 * Creates the standard directories and files for a Lamington project
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @hidden
	 */
	private static async createProjectStructure() {
		spinner.create('Creating directory structure');

		await ProjectManager.createDirectoryIfMissing('contracts');

		await ProjectManager.createDirectoryIfMissing('.lamington');

		spinner.end('Created directory structure');
	}

	private static async createDirectoryIfMissing(dirName: string) {
		if (!(await exists(path.join(process.cwd(), dirName)))) {
			await mkdirp(path.join(process.cwd(), dirName));
		}
	}
}
