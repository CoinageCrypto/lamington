import axios from 'axios';
import * as path from 'path';
import * as mkdirpCallback from 'mkdirp';
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

/** Root config directory path */
const CACHE_DIRECTORY = '.lamington';
/** Config file fullpath */
const CONFIG_FILE_PATH = path.join(CACHE_DIRECTORY, 'config.json');
/** Default encoding */
const ENCODING = 'utf8';
/** Configuration file name */
const CONFIGURATION_FILE_NAME = '.lamingtonrc';

/** EOSIO and EOSIO.CDT configuration file paths */
export interface LamingtonConfig {
	cdt: string;
	eos: string;
	keepAlive?: boolean;
	outDir?: string;
	exclude?: string | RegExp | Array<string | RegExp>;
}

/**
 * Manages Lamington configuration setup and caching
 */
export class ConfigManager {
	/** @hidden EOSIO and EOSIO.CDT configuration settings */
	private static config: LamingtonConfig;

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
			throw new Error('Unexpected response from GitHub API.');
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

	/**
	 * Fetches the latest EOS repository and freezes version changes
	 * in [[CONFIG_FILE_PATH]] to maintain a consistent development environment
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	public static async initWithDefaults() {
		// Load existing configuration
		const userConfig = {
			outDir: CACHE_DIRECTORY,
			keepAlive: false,
			exclude: [],
			...(await ConfigManager.readConfigFromProject()),
		};
		// Check if configuration exists
		if (!(await ConfigManager.configExists())) {
			// Create the config directory
			await mkdirp(CACHE_DIRECTORY);
			// Fetch the latest repository configuration
			const defaultConfig: LamingtonConfig = {
				cdt: await ConfigManager.getAssetURL('EOSIO', 'eosio.cdt', 'amd64.deb'),
				eos: await ConfigManager.getAssetURL('EOSIO', 'eos', 'ubuntu-18.04'),
			};
			// Freeze repository image
			await writeFile(CONFIG_FILE_PATH, JSON.stringify(defaultConfig, null, 4), ENCODING);
		}
		// Load cached config
		const existingConfig = JSON.parse(await readFile(CONFIG_FILE_PATH, ENCODING));
		// Save cached configuration
		await writeFile(
			CONFIG_FILE_PATH,
			JSON.stringify(
				{
					...existingConfig,
					...userConfig,
				},
				null,
				4
			),
			ENCODING
		);
		// Load existing configuration
		await ConfigManager.loadConfigFromDisk();
	}

	/**
	 * Checks the existence of the configuration
	 * file at the default [[CONFIG_FILE_PATH]]
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @returns Config exists determiner
	 */
	public static async configExists() {
		return await exists(CONFIG_FILE_PATH);
	}

	/**
	 * Loads the existing configuration file into [[ConfigManager.config]]
	 * @author Kevin Brown <github.com/thekevinbrown>
	 */
	public static async loadConfigFromDisk() {
		// Read existing configuration and store
		ConfigManager.config = JSON.parse(await readFile(CONFIG_FILE_PATH, ENCODING));
	}

	/**
	 * Reads the user defined config file if it exists
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @returns User defined configuration or object
	 * @hidden
	 */
	private static async readConfigFromProject() {
		return (await exists(CONFIGURATION_FILE_NAME))
			? JSON.parse(await readFile(CONFIGURATION_FILE_NAME, ENCODING))
			: {};
	}

	/**
	 * Returns the current EOSIO configuration
	 * @author Kevin Brown <github.com/thekevinbrown>
	 */
	static get eos() {
		return ConfigManager.config.eos;
	}

	/**
	 * Returns the current EOSIO.CDT configuration
	 * @author Kevin Brown <github.com/thekevinbrown>
	 */
	static get cdt() {
		return ConfigManager.config.cdt;
	}

	/**
	 * Returns the container keep alive setting or false
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	static get keepAlive() {
		return ConfigManager.config.keepAlive || false;
	}

	/**
	 * Returns the output build directory or [[CACHE_DIRECTORY]]
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	static get outDir() {
		return ConfigManager.config.outDir || CACHE_DIRECTORY;
	}

	/**
	 * Returns the array of excluded strings or patterns
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	static get exclude() {
		return ConfigManager.config.exclude || [];
	}
}
