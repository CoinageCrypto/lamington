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
const CONFIG_DIRECTORY = '.lamington';
/** Config file fullpath */
const CONFIG_FILE_PATH = path.join(CONFIG_DIRECTORY, 'config.json');
/** Default encoding */
const ENCODING = 'utf8';

/** EOSIO and EOSIO.CDT configuration file paths */
export interface LamingtonConfig {
	cdt: string;
	eos: string;
	keepAlive: boolean;
}

/**
 * Fetches and stores the latest EOS configuration images
 * @author Kevin Brown <github.com/thekevinbrown>
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
	 */
	private static async getAssetURL(organization: string, repository: string, filter: string) {
		// Get the projects latest GitHub repository release
		const result = await axios.get(`https://api.github.com/repos/${organization}/${repository}/releases/latest`);
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
		if (!asset) throw new Error (
			`Could not locate asset with ${filter} in the download URL in the ${organization}/${repository} repository`
		);
		// Return captured download url
		return asset.browser_download_url as string;
	}

	/**
	 * Fetches the latest EOS repository release and freezes version changes
	 * in [[CONFIG_FILE_PATH]] to maintain a consistent development environment
	 * @author Kevin Brown <github.com/thekevinbrown>
	 */
	public static async initWithDefaults() {
		// Check if configuration exists
		if (!(await exists(CONFIG_FILE_PATH))) {
			// Fetch the latest repository configuration
			const defaultConfig: LamingtonConfig = {
				cdt: await ConfigManager.getAssetURL('EOSIO', 'eosio.cdt', 'amd64.deb'),
				eos: await ConfigManager.getAssetURL('EOSIO', 'eos', 'ubuntu-18.04'),
				keepAlive:false
			};
			// Create and/or update configuration file
			await mkdirp(CONFIG_DIRECTORY);
			await writeFile(CONFIG_FILE_PATH, JSON.stringify(defaultConfig, null, 4), ENCODING);
		}
		// Load existing configuration
		await ConfigManager.loadConfigFromDisk();
	}

	/**
	 * Loads the existing configuration file into [[ConfigManager.config]]
	 * @author Kevin Brown <github.com/thekevinbrown>
	 */
	private static async loadConfigFromDisk() {
		// Read existing configuration and store
		ConfigManager.config = JSON.parse(await readFile(CONFIG_FILE_PATH, ENCODING));
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
	 * Returns the EOSIO keep alive setting or false
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	static get keepAlive() {
		return ConfigManager.config.keepAlive || false;
	}
}
