import fetch from 'node-fetch';
import { TextEncoder, TextDecoder } from 'util';
import { Api, JsonRpc } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { Account } from './accounts';
import { ConfigManager, LamingtonDebugLevel } from './configManager';
import { convertLegacyPublicKey } from 'eosjs/dist/eosjs-numeric';
import { timer } from './utils';
import * as chalk from 'chalk';

interface InitArgs {
	adminAccount: Account;
	chainId?: string;
	httpEndpoint: string;
}

/**
 * Manages client connection and communication with a local EOSIO node
 */
export class EOSManager {
	/** Defaults to `eosio` administration account */
	static adminAccount: Account;
	/** Development signature provider */
	static signatureProvider: JsSignatureProvider;
	/** Configured EOSjs client */
	static api: Api;
	/** RPC connection with the local EOSIO node at `http://127.0.0.1:8888` */
	static rpc: JsonRpc;

	/**
	 * Initializes a default connection to the local EOSIO node on port `8888` and
	 * assigns the default `eosio` account with administration keys
	 * @author Kevin Brown <github.com/thekevinbrown>
	 */
	static initWithDefaults = () => {
		// Create eosio account and configure signature provider
		// NOTE: This is a known EOS development key used in the EOS docs. It is
		// UNSAFE to use this key on any public network.
		const adminAccount = new Account(
			'eosio',
			'5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'
		);

		EOSManager.init({ httpEndpoint: 'http://127.0.0.1:8888', adminAccount });
	};
	/**
	 * Initializes a connection to any EOSIO node and sets the administration keys which
	 * Lamington uses to deploy contracts, create accounts, etc.
	 * @author Kevin Brown <github.com/thekevinbrown>
	 */
	static init = ({ httpEndpoint, adminAccount, chainId }: InitArgs) => {
		// Create eosio account and configure signature provider
		EOSManager.adminAccount = adminAccount;

		// If we have a key to sign with, go ahead and hook it up.
		if (adminAccount.privateKey) {
			EOSManager.signatureProvider = new JsSignatureProvider([adminAccount.privateKey]);
		}

		// Typecasting as any here to prevent a problem with the types disagreeing for fetch,
		// when this is actually following the getting started docs on EOSJS.
		EOSManager.rpc = new JsonRpc(httpEndpoint, { fetch: fetch as any });
		EOSManager.api = new Api({
			rpc: EOSManager.rpc,
			chainId,
			signatureProvider: EOSManager.signatureProvider,
			// Same deal here, type mismatch when there really shouldn't be.
			textDecoder: new TextDecoder() as any,
			textEncoder: new TextEncoder() as any,
		});
	};

	/**
	 * Ensures our signature provider has the key in question, and if not, adds it.
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @param account Account to be unioned into the signature list.
	 */
	static addSigningAccountIfMissing = (account: Account) => {
		// If there are keys and signature provider doesn't have it, add it on in.
		if (account.publicKey && account.privateKey) {
			const nonLegacyPublicKey = convertLegacyPublicKey(account.publicKey);

			if (!EOSManager.signatureProvider.keys.get(nonLegacyPublicKey)) {
				EOSManager.signatureProvider.keys.set(nonLegacyPublicKey, account.privateKey);
				EOSManager.signatureProvider.availableKeys.push(nonLegacyPublicKey);
			}
		}
	};

	/**
	 * Executes a transaction against a connected EOSjs client
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @param transaction EOSIO transaction object
	 * @param eos Connected EOSjs client
	 * @param options Additional transaction options
	 */
	static transact = async (
		transaction: any,
		eos = EOSManager.api,
		options?: {
			debug?: boolean;
			debugLevel?: LamingtonDebugLevel;
			blocksBehind?: number;
			expireSeconds?: number;
			logMessage?: string;
		}
	) => {
		const flattenedOptions = Object.assign({ blocksBehind: 1, expireSeconds: 30 }, options);

		const transactionTimer = timer();

		async function logOutput(verboseOutput: string) {
			const legacyDebugOption = ConfigManager.debugTransactions || flattenedOptions.debug;

			if (ConfigManager.debugLevelMin || ConfigManager.debugLevelVerbose || legacyDebugOption) {
				let consoleHeader = '';
				const calls = transaction.actions.map((action: any) => `${action.account}.${action.name}`);
				consoleHeader += `========== Calling ${calls.join(', ')} ==========`;
				console.log(chalk.cyan(consoleHeader) + chalk.blue(' (%s)'), transactionTimer.ms);
			}
			if (ConfigManager.debugLevelVerbose) {
				console.log(verboseOutput);
				console.log('Options: ', options);
			}
		}

		return await eos
			.transact(transaction, flattenedOptions)
			.then((value) => {
				logOutput(chalk.green('Succeeded: ') + JSON.stringify(value, null, 4));
				return value;
			})
			.catch((error) => {
				logOutput(
					chalk.red('Threw error: ') +
						error +
						'\n' +
						chalk.cyan('Payload causing the above error: ') +
						JSON.stringify(transaction, null, 4)
				);
				throw error;
			});
	};
}
