import fetch from 'node-fetch';
import { TextEncoder, TextDecoder } from 'util';
import { Api, JsonRpc } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { Account } from './accounts';
import { ConfigManager } from './configManager';
import { convertLegacyPublicKey } from 'eosjs/dist/eosjs-numeric';

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
	 * @example
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
			textEncoder: new TextEncoder(),
		});
	};

	/**
	 * Ensures our signature provider has the key in question, and if not, adds it.
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @param account Account to be unioned into the signature list.
	 */
	static addSigningAccountIfMissing = (account: Account) => {
		if (!account.publicKey || !account.privateKey) {
			throw new Error(
				`Provided account ${account.name} is missing a key and cannot be used for signing.`
			);
		}

		// If the signature provider doesn't have it
		if (!EOSManager.signatureProvider.keys.get(account.publicKey)) {
			const nonLegacyPublicKey = convertLegacyPublicKey(account.publicKey);
			EOSManager.signatureProvider.keys.set(nonLegacyPublicKey, account.privateKey);
			EOSManager.signatureProvider.availableKeys.push(nonLegacyPublicKey);
		}
	};

	/**
	 * Executes a transaction against a connected EOSjs client
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @param transaction EOSIO transaction object
	 * @param eos Connected EOSjs client
	 * @param options Additional transaction options
	 */
	static transact = (
		transaction: any,
		eos = EOSManager.api,
		options = { blocksBehind: 3, expireSeconds: 30 }
	) => {
		if (ConfigManager.debugTransactions) {
			const calls = transaction.actions.map((action: any) => `${action.account}.${action.name}`);
			console.log(`========== Calling ${calls.join(', ')} ==========`);
			console.log('Transaction: ', JSON.stringify(transaction, null, 4));
			console.log('Options: ', options);
			console.log();
		}

		return eos.transact(transaction, options);
	};
}
