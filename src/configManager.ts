import axios from 'axios';
import * as path from 'path';
import * as mkdirpCallback from 'mkdirp';
import * as rimrafCallback from 'rimraf';
import {
	readFile as readFileCallback,
	writeFile as writeFileCallback,
	exists as existsCallback,
} from 'fs';
import { promisify } from 'util';

const exists = promisify(existsCallback);
const mkdirp = promisify(mkdirpCallback);
const rimraf = promisify(rimrafCallback);
const writeFile = promisify(writeFileCallback);
const readFile = promisify(readFileCallback);

const configDirectory = '.lamington';
const configFilePath = path.join(configDirectory, 'config.json');
const encoding = 'utf8';

export interface LamingtonConfig {
	cdt: string;
	eos: string;
}

export class ConfigManager {
	private static config: LamingtonConfig;

	private static async getAssetURL(organisation: string, repository: string, filter: string) {
		// Get the latest releases from GitHub and search for the asset.
		const result = await axios.get(
			`https://api.github.com/repos/${organisation}/${repository}/releases/latest`
		);

		if (!result.data || !result.data.assets || !Array.isArray(result.data.assets)) {
			console.error(result);
			throw new Error('Unexpected response from GitHub API.');
		}

		const asset = result.data.assets.find((asset: any) =>
			asset.browser_download_url.includes(filter)
		);

		if (!asset) {
			throw new Error(
				`Could not locate asset with ${filter} in the download URL in the ${organisation}/${repository} repository`
			);
		}

		return asset.browser_download_url as string;
	}

	public static async initWithDefaults() {
		// Get the latest releases from GitHub, then freeze them into a config file
		// so as people work the versions don't change.
		if (!(await exists(configFilePath))) {
			const defaultConfig: LamingtonConfig = {
				cdt: await ConfigManager.getAssetURL('EOSIO', 'eosio.cdt', 'amd64.deb'),
				eos: await ConfigManager.getAssetURL('EOSIO', 'eos', 'ubuntu-18.04'),
			};

			await mkdirp(configDirectory);
			await writeFile(configFilePath, JSON.stringify(defaultConfig, null, 4), encoding);
		}

		await ConfigManager.loadConfigFromDisk();
	}

	private static async loadConfigFromDisk() {
		ConfigManager.config = JSON.parse(await readFile(configFilePath, encoding));
	}

	static get eos() {
		return ConfigManager.config.eos;
	}

	static get cdt() {
		return ConfigManager.config.cdt;
	}
}
