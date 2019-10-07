import axios from 'axios';
import * as path from 'path';
import * as mkdirpCallback from 'mkdirp';
import * as Mocha from 'mocha';
import {
	readFile as readFileCallback,
	writeFile as writeFileCallback,
	exists as existsCallback,
} from 'fs';
import { promisify } from 'util';

const exists = promisify(existsCallback);
const mkdirp = promisify(mkdirpCallback);
const writeFile = promisify(writeFileCallback);
const readFile = promisify(readFileCallback);

/** @hidden Root config directory path */
const CACHE_DIRECTORY = '.lamington';
/** @hidden Default encoding */
const ENCODING = 'utf8';
/** @hidden Configuration file name */
const CONFIGURATION_FILE_NAME = '.lamingtonrc';

/** @hidden Configuration object structure */
export interface LamingtonConfig {
	cdt: string;
	eos: string;
	keepAlive?: boolean;
	outDir?: string;
	exclude?: Array<string>;
	debugTransactions?: boolean;
	debug: LamingtonDebugLevel;
	reporter?: string;
	reporterOptions?: any;
}

/** Level of debug output */
export enum LamingtonDebugLevel {
	NONE = 0,
	TRANSACTIONS,
	ALL,
}

/**
 * Default configuration values which are merged in
 * as the base layer config. Users can override these
 * values by specifying them in their `.lamingtonrc`
 */
const DEFAULT_CONFIG = {
	eos: '',
	cdt: '',
	debug: LamingtonDebugLevel.NONE,
	debugTransactions: false,
	keepAlive: false,
	outDir: CACHE_DIRECTORY,
	exclude: [],
};

/**
 * Manages Lamington configuration setup and caching
 */
export class ConfigManager {
	/** @hidden EOSIO and EOSIO.CDT configuration settings */
	private static config: LamingtonConfig;

	/**
	 * Initialize application configuration using the user
	 * defined configurations and defaults
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	public static async initWithDefaults() {
		DEFAULT_CONFIG.cdt = await ConfigManager.getAssetURL('EOSIO', 'eosio.cdt', 'amd64.deb');
		DEFAULT_CONFIG.eos = await ConfigManager.getAssetURL('EOSIO', 'eos', 'ubuntu-18.04');

		if (!(await ConfigManager.configExists())) {
			console.log('Project has not yet been initialized.');
			console.log('Please run lamington init before running this command.');

			process.exit(1);
		}

		await ConfigManager.loadConfigFromDisk();
	}

	/**
	 * Downloads the organization's latest repository release image and
	 * returns the assets matching the specified filter
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @param organization Asset's case-sensitive repository organization
	 * @param repository Asset's case-sensitive repository name
	 * @param filter Resource filter
	 * @hidden
	 */
	private static async getAssetURL(organization: string, repository: string, filter: string) {
		// Get the projects latest GitHub repository release
		const result = await axios.get(
			`https://api.github.com/repos/${organization}/${repository}/releases/latest`
		);
		// Handle failed GitHub request
		if (!result.data || !result.data.assets || !Array.isArray(result.data.assets)) {
			console.error(result);
			throw new Error('Unexpected response from GitHub API. Please try again later.');
		}
		// Capture the GitHub url from response
		const asset = result.data.assets.find((asset: any) =>
			asset.browser_download_url.includes(filter)
		);
		// Handle no assets found
		if (!asset)
			throw new Error(
				`Could not locate asset with ${filter} in the download URL in the ${organization}/${repository} repository`
			);
		// Return captured download url
		return asset.browser_download_url as string;
	}

	public static async isValidConfig(config: object) {
		return true;
	}

	/**
	 * Creates a default configuration file if it doesn't exist at the specified path.
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @param atPath Optional configuration file path. Defaults to `.lamingtonrc`.
	 */
	public static async createConfigIfMissing(atPath = CONFIGURATION_FILE_NAME) {
		// Prevent overwriting existing configuration when valid
		if (
			(await ConfigManager.configExists(atPath)) &&
			(await ConfigManager.isValidConfig(ConfigManager.config))
		)
			return;
		// Create the config directory
		await mkdirp(CACHE_DIRECTORY);
		// Fetch the latest repository configuration
		const defaultConfig: LamingtonConfig = {
			cdt: await ConfigManager.getAssetURL('EOSIO', 'eosio.cdt', 'amd64.deb'),
			eos: await ConfigManager.getAssetURL('EOSIO', 'eos', 'ubuntu-18.04'),
			...DEFAULT_CONFIG,
		};
		// Cache the configuration file to disk
		await writeFile(atPath, JSON.stringify(defaultConfig, null, 4), ENCODING);
	}

	/**
	 * Checks the existence of the configuration
	 * file at the default [[CONFIGURATION_FILE_NAME]] or
	 * optional path
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @param atPath Optional file path for lookup
	 * @returns Config exists determiner
	 */
	public static configExists(atPath: string = CONFIGURATION_FILE_NAME) {
		// Should filter out any trailing filename and concatonate
		// the default filename
		return exists(atPath);
	}

	/**
	 * Loads an existing configuration file into [[ConfigManager.config]]
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @param atPath Optional file path for lookup
	 */
	public static async loadConfigFromDisk(atPath = CONFIGURATION_FILE_NAME) {
		// Read existing configuration and store
		ConfigManager.config = {
			...DEFAULT_CONFIG,
			...JSON.parse(await readFile(atPath, ENCODING)),
		};
	}

	/**
	 * Returns the current EOSIO configuration
	 * @author Kevin Brown <github.com/thekevinbrown>
	 */
	static get eos() {
		return (ConfigManager.config && ConfigManager.config.eos) || '';
	}

	/**
	 * Returns the current EOSIO.CDT configuration
	 * @author Kevin Brown <github.com/thekevinbrown>
	 */
	static get cdt() {
		return (ConfigManager.config && ConfigManager.config.cdt) || '';
	}

	/**
	 * Returns the container keep alive setting or false
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	static get keepAlive() {
		return (ConfigManager.config && ConfigManager.config.keepAlive) || DEFAULT_CONFIG.keepAlive;
	}

	/**
	 * Returns the container's debug log output setting
	 * @author Kevin Brown <github.com/thekevinbrown>
	 */
	static get debugTransactions() {
		return (
			(ConfigManager.config && ConfigManager.config.debugTransactions) ||
			DEFAULT_CONFIG.debugTransactions
		);
	}

	/**
	 * Returns the output build directory or [[CACHE_DIRECTORY]]
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	static get outDir() {
		return (ConfigManager.config && ConfigManager.config.outDir) || DEFAULT_CONFIG.outDir;
	}

	/**
	 * Returns the array of excluded strings or patterns
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	static get exclude() {
		return (ConfigManager.config && ConfigManager.config.exclude) || DEFAULT_CONFIG.exclude;
	}

	/**
	 * Returns the array of excluded strings or patterns
	 * @author Dallas Johnson <github.com/dallasjohnson>
	 */
	static get testReporter() {
		return (ConfigManager.config && ConfigManager.config.reporter) || Mocha.reporters.Min;
	}
}
