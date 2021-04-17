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

/**
 * @hidden Configuration object structure
 * 
 * TODO: Extract type definitions amd create BaseConfig
 */
export interface LamingtonConfig {
	cdt: string;
	eos: string;
	contracts: string;
	keepAlive?: boolean;
	outDir?: string;
	include?: Array<string>;
	exclude?: Array<string>;
	debugTransactions?: boolean;
	debug: LamingtonDebugLevel;
	reporter?: string;
	reporterOptions?: any;
	bailOnFailure: boolean;
}

/**
 * Level of debug output
 * 
 * TODO: Extract type definitions
 */
export enum LamingtonDebugLevel {
	NONE = 0, // No debug logging
	MINIMAL, // Brief summary of actions as executed
	VERBOSE, // Verbose output from actions including all transaction output
}

export namespace LamingtonDebugLevel {
	export function isNone(debugLevel: LamingtonDebugLevel) {
		return debugLevel == LamingtonDebugLevel.NONE;
	}

	export function isMin(debugLevel: LamingtonDebugLevel) {
		return debugLevel == LamingtonDebugLevel.MINIMAL;
	}

	export function isVerbose(debugLevel: LamingtonDebugLevel) {
		return debugLevel == LamingtonDebugLevel.VERBOSE;
	}
}

/**
 * Default configuration values which are merged in
 * as the base layer config. Users can override these
 * values by specifying them in their `.lamingtonrc`
 */
const DEFAULT_CONFIG:LamingtonConfig = {
	eos: '',
	cdt: '',
	contracts: 'v1.8.0-rc1',
	debug: LamingtonDebugLevel.NONE,
	debugTransactions: false,
	keepAlive: false,
	outDir: CACHE_DIRECTORY,
	include: ['.*'],
	exclude: [],
	bailOnFailure: false,
};

/**
 * Manages Lamington configuration setup and caching
 */
export class ConfigManager {
	/** @hidden EOSIO and EOSIO.CDT configuration settings */
	private static config: LamingtonConfig;

	/**
	 * Initialize application configuration using the user
	 * defined configurations and defaults.
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
	 * returns the assets matching the specified filter.
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
		await mkdirp(CACHE_DIRECTORY, {});
		// Fetch the latest repository configuration
		const defaultConfig: LamingtonConfig = {
			...DEFAULT_CONFIG,
			cdt: await ConfigManager.getAssetURL('EOSIO', 'eosio.cdt', 'amd64.deb'),
			eos: await ConfigManager.getAssetURL('EOSIO', 'eos', 'ubuntu-18.04'),
		};
		// Cache the configuration file to disk
		await writeFile(atPath, JSON.stringify(defaultConfig, null, 4), ENCODING);
	}

	/**
	 * Checks the existence of the configuration file at the
	 * default [[CONFIGURATION_FILE_NAME]] or optional path.
	 * @param atPath Optional file path for lookup
	 * @returns Config exists determiner
	 */
	public static configExists(atPath: string = CONFIGURATION_FILE_NAME) {
		// Should filter out any trailing filename and concatonate
		// the default filename
		return exists(atPath);
	}

	/**
	 * Loads an existing configuration file into the `config` state.
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
	 * Returns the current EOSIO configuration.
	 */
	static get eos() {
		return (ConfigManager.config && ConfigManager.config.eos) || '';
	}

	/**
	 * Returns the current EOSIO.CDT configuration.
	 */
	static get cdt() {
		return (ConfigManager.config && ConfigManager.config.cdt) || '';
	}

	/**
	 * Returns the current eosio.contracts configuration.
	 */
	static get contracts() {
		return (ConfigManager.config && ConfigManager.config.contracts) || 'master';
	}

	/**
	 * Returns the container keep alive setting or `false`.
	 */
	static get keepAlive() {
		return (ConfigManager.config && ConfigManager.config.keepAlive) || DEFAULT_CONFIG.keepAlive;
	}

	/**
	 * Returns the container's debug log output setting.
	 */
	static get debugTransactions() {
		return (
			(ConfigManager.config && ConfigManager.config.debugTransactions) ||
			DEFAULT_CONFIG.debugTransactions
		);
	}

	/**
	 * Returns the container's `debugLevel` output setting.
	 */
	static get debugLevel() {
		return (ConfigManager.config && ConfigManager.config.debug) || DEFAULT_CONFIG.debug;
	}

	/**
	 * Returns the container's `debugLevel` output setting
	 */
	static get debugLevelNone() {
		return LamingtonDebugLevel.isNone(this.debugLevel);
	}

	static get debugLevelMin() {
		return LamingtonDebugLevel.isMin(this.debugLevel);
	}

	static get debugLevelVerbose() {
		return LamingtonDebugLevel.isVerbose(this.debugLevel);
	}

	/**
	 * Returns the output build directory or the default `CACHE_DIRECTORY`.
	 */
	static get outDir() {
		return (ConfigManager.config && ConfigManager.config.outDir) || DEFAULT_CONFIG.outDir;
	}

	/**
	 * Returns the array of included strings or patterns. Defaults to
	 * include all `*.cpp` files.
	 */
	static get include() {
		return (ConfigManager.config && ConfigManager.config.include) || DEFAULT_CONFIG.include;
	}

	/**
	 * Returns the array of excluded strings or patterns.
	 */
	static get exclude() {
		return (ConfigManager.config && ConfigManager.config.exclude) || DEFAULT_CONFIG.exclude;
	}

	/**
	 * Returns the array of excluded strings or patterns.
	 */
	static get testReporter() {
		return (ConfigManager.config && ConfigManager.config.reporter) || Mocha.reporters.Min;
	}

	/**
	 * Returns the array of excluded strings or patterns.
	 */
	static get bailOnFailure() {
		return (
			(ConfigManager.config && ConfigManager.config.bailOnFailure) || DEFAULT_CONFIG.bailOnFailure
		);
	}
}
