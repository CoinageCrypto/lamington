import { Api } from 'eosjs';
import { convertLegacyPublicKey } from 'eosjs/dist/eosjs-numeric';
import * as ecc from 'eosjs-ecc';

import { Account } from './account';
import { accountNameFromPublicKey } from './utils';
import { EOSManager } from '../eosManager';
import { ConfigManager, LamingtonDebugLevel } from '../configManager';
import * as chalk from 'chalk';

interface AccountCreationOptions {
	creator?: Account;
	eos?: Api;
	privateKey?: string;
	bytesToBuy?: Number;
}

export class AccountManager {
	/**
	 * Generates a new random account.
	 * 
	 * @param accountName Optional name for the account to create
	 * @param options Optional account creation settings
	 * @returns Result returned from `createAccounts()`
	 */
	static createAccount = async (accountName?: string, options?: AccountCreationOptions) => {
		let accountNameArray = accountName ? [accountName] : undefined;
		const [account] = await AccountManager.createAccounts(1, accountNameArray, options);
		return account;
	};

	/**
	 * Generates a specified number of random accounts.
	 * 
	 * @param numberOfAccounts Number of accounts to generate
	 * @param accountNames Array of account names. If array is provided then the numberOfAccounts is ignored.
	 * @returns Array of created account transaction promises
	 */
	static createAccounts = async (
		numberOfAccounts = 1,
		accountNames?: string[],
		options?: AccountCreationOptions
	) => {
		const accounts = [];
		if (accountNames) {
			for (let accountName of accountNames) {
				const resolvedPrivateKey = options?.privateKey ?? (await ecc.unsafeRandomKey());
				const publicKey = await ecc.privateToPublic(resolvedPrivateKey);
				const account = new Account(accountName, resolvedPrivateKey);
				// Publish the new account and store result
				await AccountManager.setupAccount(account, options);
				accounts.push(account);
			}
		} else {
			// Repeat account creation for specified
			for (let i = 0; i < numberOfAccounts; i++) {
				const resolvedPrivateKey = options?.privateKey ?? (await ecc.unsafeRandomKey());

				const seedKey = await ecc.unsafeRandomKey();
				const publicKey = await ecc.privateToPublic(seedKey);
				const accountName = accountNameFromPublicKey(publicKey);
				const account = new Account(accountName, resolvedPrivateKey);
				// Publish the new account and store result
				await AccountManager.setupAccount(account, options);
				accounts.push(account);
			}
		}
		// Return created accounts
		return accounts;
	};

	/**
	 * Publishes a new account and allocates ram where possible.
	 * 
	 * @param account [[Account]] to publish
	 * @param options Optional account settings
	 * @returns Transaction result promise
	 */
	static setupAccount = async (account: Account, options?: AccountCreationOptions) => {
		let logMessage = `Create account: ${account.name}`;
		if (options?.privateKey) {
			logMessage += ` private key: ${options.privateKey} `;
		}
		const { creator, eos } = AccountManager.flattenOptions(options);
		// Validate account contains required values

		if (!account.name) throw new Error('Missing account name.');
		if (!account.publicKey) throw new Error('Missing public key.');
		if (!account.privateKey) throw new Error('Missing private key.');

		// Configure the Signature Provider if available
		EOSManager.addSigningAccountIfMissing(account);

		// Get the system contract
		const systemContract = await eos.getContract('eosio');
		// Build account creation actions
		const actions: any = [
			{
				account: 'eosio',
				name: 'newaccount',
				authorization: creator.active,
				data: {
					creator: creator.name,
					name: account.name,
					owner: {
						threshold: 1,
						keys: [
							{
								key: account.publicKey,
								weight: 1,
							},
						],
						accounts: [],
						waits: [],
					},
					active: {
						threshold: 1,
						keys: [
							{
								key: account.publicKey,
								weight: 1,
							},
						],
						accounts: [],
						waits: [],
					},
				},
			},
		];

		// Note: You can deploy the system without system contracts. In this scenario,
		// newaccount alone is enough. If there is a system contract with the buyrambytes action,
		// then we definitely need to do it, but if there isn't, then trying to call it is an error.
		if (systemContract.actions.has('buyrambytes')) {
			const bytesToBuy = options?.bytesToBuy ?? 4000000;
			logMessage += ` with ram: ${bytesToBuy}`;

			actions.push({
				account: 'eosio',
				name: 'buyrambytes',
				authorization: creator.active,
				data: {
					payer: creator.name,
					receiver: account.name,
					bytes: bytesToBuy,
				},
			});
		}
		// Same deal for delegatebw. Only if it's actually a thing.
		if (systemContract.actions.has('delegatebw')) {
			const delegateAmount = '10.0000 EOS';
			logMessage += ` bandwidth: ${delegateAmount} for net and cpu`;

			actions.push({
				account: 'eosio',
				name: 'delegatebw',
				authorization: creator.active,
				data: {
					from: creator.name,
					receiver: account.name,
					stake_net_quantity: delegateAmount,
					stake_cpu_quantity: delegateAmount,
					transfer: false,
				},
			});
		}
		if (ConfigManager.debugLevelMin || ConfigManager.debugLevelVerbose) {
			console.log(chalk.cyan(logMessage));
		}

		// Execute the transaction
		return await EOSManager.transact({ actions }, eos, {
			logMessage: logMessage,
		});
	};

	/**
	 * Grants `eosio.code` permission to the specified account's `active` key,
	 * where `account` is the owner of a contract.
	 * 
	 * @param account Account without `eosio.code` permissions
	 */
	public static addCodePermission = async (account: Account) => {
		// We need to get their existing permissions, then add in a new eosio.code permission for this contract.
		const { permissions } = await EOSManager.rpc.get_account(account.name);
		const { required_auth } = permissions.find(
			(permission: any) => permission.perm_name == 'active'
		);
		// Check if `eosio.code` has already been set
		const existingPermission = required_auth.accounts.find(
			(account: any) =>
				account.permission.actor === account.name && account.permission.permission === 'eosio.code'
		);
		// Throw if permission exists
		if (existingPermission) {
			throw new Error(
				`Code permission is already present on account ${account.name} for contract ${account.name}`
			);
		}

		// Ensure we're good to sign this transaction.
		EOSManager.addSigningAccountIfMissing(account);

		// Append the `eosio.code` permission to existing
		required_auth.accounts.push({
			permission: { actor: account.name, permission: 'eosio.code' },
			weight: 1,
		});
		// Construct the update actions
		const actions: any = [
			{
				account: 'eosio',
				name: 'updateauth',
				authorization: account.owner,
				data: {
					account: account.name,
					permission: 'active',
					parent: 'owner',
					auth: required_auth,
				},
			},
		];
		// Execute the transaction actions
		await EOSManager.transact({ actions });
	};

	/**
	 * Flattens account creation options.
	 * 
	 * @returns Account creation options
	 */
	private static flattenOptions(options?: AccountCreationOptions) {
		const creator = (options && options.creator) || EOSManager.adminAccount;
		const eos = (options && options.eos) || EOSManager.api;

		if (!creator) throw new Error('Creator not provided.');
		if (!eos) throw new Error('EOS instance not provided.');

		return { creator, eos };
	}
}
