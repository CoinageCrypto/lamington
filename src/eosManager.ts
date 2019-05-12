import fetch from 'node-fetch';
import { TextEncoder, TextDecoder } from 'util';
import { Api, JsonRpc } from 'eosjs';
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig';
import { Account } from './accounts';

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
		const adminPrivateKey = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3';
		EOSManager.adminAccount = new Account('eosio', adminPrivateKey);
		EOSManager.signatureProvider = new JsSignatureProvider([adminPrivateKey]);
		// Typecasting as any here to prevent a problem with the types disagreeing for fetch,
		// when this is actually following the getting started docs on EOSJS.
		EOSManager.rpc = new JsonRpc('http://127.0.0.1:8888', { fetch: fetch as any });
		EOSManager.api = new Api({
			rpc: EOSManager.rpc,
			signatureProvider: EOSManager.signatureProvider,
			// Same deal here, type mismatch when there really shouldn't be.
			textDecoder: new TextDecoder() as any,
			textEncoder: new TextEncoder(),
		});
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
		options = { blocksBehind: 0, expireSeconds: 30 }
	) => {
		return eos.transact(transaction, options);
	};
}
