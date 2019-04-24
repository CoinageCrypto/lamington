import { Api } from 'eosjs';
import { convertLegacyPublicKey } from 'eosjs/dist/eosjs-numeric';
import * as ecc from 'eosjs-ecc';

import { Account } from './account';
import { accountNameFromPublicKey } from './utils';
import { EOSManager } from '../eosManager';
import { Contract } from '../contracts';

interface AccountCreationOptions {
	creator?: Account;
	eos?: Api;
}

export class AccountManager {
	static createAccount = async (options?: AccountCreationOptions) => {
		const [account] = await AccountManager.createAccounts(1, options);

		return account;
	};

	static createAccounts = async (numberOfAccounts = 1, options?: AccountCreationOptions) => {
		const accounts = [];

		for (let i = 0; i < numberOfAccounts; i++) {
			const privateKey = await ecc.unsafeRandomKey();
			const publicKey = await ecc.privateToPublic(privateKey);
			const accountName = accountNameFromPublicKey(publicKey);
			const account = new Account(accountName, privateKey);

			await AccountManager.setupAccount(account, options);

			accounts.push(account);
		}

		return accounts;
	};

	static setupAccount = async (account: Account, options?: AccountCreationOptions) => {
		const { creator, eos } = AccountManager.flattenOptions(options);

		if (!account.name) throw new Error('Missing account name.');
		if (!account.publicKey) throw new Error('Missing public key.');
		if (!account.privateKey) throw new Error('Missing private key.');

		if (EOSManager.signatureProvider) {
			const nonLegacyPublicKey = convertLegacyPublicKey(account.publicKey);
			EOSManager.signatureProvider.keys.set(nonLegacyPublicKey, account.privateKey);
			EOSManager.signatureProvider.availableKeys.push(nonLegacyPublicKey);
		}

		const systemContract = await eos.getContract('eosio');

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
			actions.push({
				account: 'eosio',
				name: 'buyrambytes',
				authorization: creator.active,
				data: {
					payer: creator.name,
					receiver: account,
					bytes: 8192,
				},
			});
		}

		// Same deal for delegatebw. Only if it's actually a thing.
		if (systemContract.actions.has('delegatebw')) {
			actions.push({
				account: 'eosio',
				name: 'delegatebw',
				authorization: creator.active,
				data: {
					from: creator.name,
					receiver: account.name,
					stake_net_quantity: '10.0000 SYS',
					stake_cpu_quantity: '10.0000 SYS',
					transfer: false,
				},
			});
		}

		return await EOSManager.transact({ actions }, eos);
	};
	
	/**
	 * Grants `eosio.code` permission to the specified account's `active` key
	 * @note Should be moved to the `contracts/contract.ts` I think?
	 * @note Actually it is `account` based and not specific to contracts...
	 * @author Kevin Brown
	 * @author Mitch Pierias
	 * @param account Account without `eosio.code` permissions
	 */
	static addCodePermission = async (account: Account) => {
		// We need to get their existing permissions, then add in a new eosio.code permission for this contract.
		const { permissions } = await EOSManager.rpc.get_account(account.name);
		const active = permissions.find((permission: any) => permission.perm_name == 'active');
		
		const auth = active.required_auth;
		const existingPermission = auth.accounts.find(
			(account: any) =>
				account.permission.actor === account.name &&
				account.permission.permission === 'eosio.code'
		);

		if (existingPermission) {
			throw new Error(
				`Code permission is already present on account ${account.name} for contract ${
					account.name
				}`
			);
		}

		// Add it in.
		auth.accounts.push({
			permission: { actor: account.name, permission: 'eosio.code' },
			weight: 1,
		});

		const actions: any = [
			{
				account: 'eosio',
				name: 'updateauth',
				authorization: account.owner,
				data: {
					account: account.name,
					permission: 'active',
					parent: 'owner',
					auth,
				},
			},
		];

		//console.log(JSON.stringify(actions, null, '\t'))

		await EOSManager.transact({ actions });
	};

	private static flattenOptions(options?: AccountCreationOptions) {
		const creator = (options && options.creator) || EOSManager.adminAccount;
		const eos = (options && options.eos) || EOSManager.api;

		if (!creator) throw new Error('Creator not provided.');
		if (!eos) throw new Error('EOS instance not provided.');

		return { creator, eos };
	}
}
