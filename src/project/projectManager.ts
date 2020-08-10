import * as colors from 'colors';
import * as path from 'path';
import * as mkdirpCallback from 'mkdirp';
import {
	readFile as readFileCallback,
	writeFile as writeFileCallback,
	exists as existsCallback,
	readdir as readdirCallback,
} from 'fs';
import { ncp as ncpCallback } from 'ncp';
import * as rimrafCallback from 'rimraf';
import { promisify } from 'util';
import { ConfigManager } from './../configManager';
import * as spinner from './../cli/logIndicator';
import { GitIgnoreManager } from '../gitignoreManager';

const exists = promisify(existsCallback);
const mkdirp = promisify(mkdirpCallback);
const writeFile = promisify(writeFileCallback);
const readFile = promisify(readFileCallback);
const readdir = promisify(readdirCallback);
const rimraf = promisify(rimrafCallback);
const ncp = promisify(ncpCallback);

/** Default encoding */
const ENCODING = 'utf8';

/** Recommended Lamington package scripts */
const DEFAULT_SCRIPTS = {
	build: 'lamington build',
	test: 'lamington test',
};

/** Required project dependencies */
const DEFAULT_DEV_DEPENDENCIES = {
	lamington: 'latest',
	chai: 'latest',
	'@types/chai': 'latest',
	'@types/mocha': 'latest',
};

/**
 * Fetches and stores the latest EOS configuration images
 * @author Mitch Pierias <github.com/MitchPierias>
 */
export class ProjectManager {
	/** @hidden Reference to the local `package.json` file */
	private static cache: {
		scripts?: { [key: string]: string };
		devDependencies?: { [key: string]: string };
	};

	/**
	 * Downloads the example project and integrates aspects where required.
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	public static async initWithDefaults() {
		await ProjectManager.cloneExampleProject();

		await ProjectManager.loadExistingProject();

		await ProjectManager.injectScripts();

		await ProjectManager.configureDependencies();

		await ProjectManager.createDirectoryIfMissing('.lamington');

		await writeFile(
			path.join(process.cwd(), 'package.json'),
			JSON.stringify(ProjectManager.cache, null, 4),
			ENCODING
		);

		await ConfigManager.createConfigIfMissing();

		await GitIgnoreManager.createIfMissing();
	}

	/**
	 * Examines the current directory and loads any existing `package.json` file
	 * into this object cache state.
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @hidden
	 */
	private static async loadExistingProject() {
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

		ProjectManager.cache = JSON.parse(packageJson);
	}

	/**
	 * Injects recommended Lamington scripts into the currently cached package data
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @hidden
	 */
	private static async injectScripts() {
		spinner.create('Injecting recommended scripts');
		const existingScripts = ProjectManager.cache.scripts || {};
		ProjectManager.cache.scripts = { ...existingScripts, ...DEFAULT_SCRIPTS };
		spinner.end('Added recommended scripts');
	}

	/**
	 * Injects the required project dependencies into the currently cached package data
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @hidden
	 */
	private static async configureDependencies() {
		spinner.create('Adding Lamington dependencies');
		const existingDependencies = ProjectManager.cache.devDependencies || {};
		ProjectManager.cache.devDependencies = { ...DEFAULT_DEV_DEPENDENCIES, ...existingDependencies };
		spinner.end('Added required dependencies');
	}

	/**
	 * Downloads the latest example Lamington project from GitHub
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @hidden
	 */
	private static async cloneExampleProject() {
		// Notify cloning task begun
		spinner.create('Pulling example project');
		// Check for existing contract files
		await ProjectManager.createDirectoryIfMissing('contracts');
		const files = await readdir(path.join(process.cwd(), 'contracts'));
		if (files.length > 0) return spinner.end('Existing contracts found');
		// Attempt clone and merge of example project
		try {
			const got = require('got');
			const tar = require('tar');
			const cloneUrl = `https://codeload.github.com/MitchPierias/EOSIO-Lamington-Boilerplate/tar.gz/master`;

			spinner.update('Cloning example project');

			return new Promise(async (resolve, reject) => {
				// Ensure tmp directory exists and capture directory path
				const tmpPath = await ProjectManager.createDirectoryIfMissing('__tmp__');
				// Stream the repo clone and untar
				got
					.stream(cloneUrl)
					.pipe(
						tar.extract({
							cwd: tmpPath,
							strip: 1,
						})
					)
					.on('error', (error: Error) => {
						reject(error);
					})
					.on('end', async () => {
						// Clone example repository into tmp
						const clonedFiles = await readdir(tmpPath);
						if (clonedFiles.length <= 0) throw new Error(`No files cloned from repo ${cloneUrl}`);
						// Merge example contracts into current project
						await ncp(path.join(tmpPath, 'contracts'), path.join(process.cwd(), 'contracts'));
						// Cleanup temporary directory
						spinner.update('Cleaning temporary files');
						await rimraf(tmpPath);
						spinner.end('Created example contracts');
						resolve(true);
					});
			});
		} catch (error) {
			spinner.fail('Failed to clone repository');
			console.log(error);
		}
	}

	/**
	 * Creates a new local directory if missing and returns the path
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @param dirName Directory to create
	 * @returns Path to local directory
	 * @private
	 */
	private static async createDirectoryIfMissing(dirName: string) {
		// Construct directory path
		const dirPath = path.join(process.cwd(), dirName);
		// Create directory if missing
		if (!(await exists(dirPath))) await mkdirp(path.join(process.cwd(), dirName), {});
		// Return the directory name
		return dirPath;
	}
}
