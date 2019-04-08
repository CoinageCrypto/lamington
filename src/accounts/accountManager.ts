import { Api } from 'eosjs';
import * as ecc from 'eosjs-ecc';

import { Account } from './account';
import { accountNameFromPublicKey } from './utils';
import { EOSManager } from '../eosManager';

interface AccountCreationOptions {
	creator?: Account;
	eos?: Api;
}

export class AccountManager {
	static createAccounts = async (numberOfAccounts = 1, options?: AccountCreationOptions) => {
		const accounts = [];
		for (let i = 0; i < numberOfAccounts; i++) {
			const privateKey = await ecc.unsafeRandomKey();
			const publicKey = await ecc.privateToPublic(privateKey);
			const accountName = accountNameFromPublicKey(publicKey);
			const account = new Account(accountName, privateKey);

			await AccountManager.setupAccount(account, options);

			if (EOSManager.signatureProvider) {
				EOSManager.signatureProvider.keys.set(publicKey, privateKey);
			}

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
			EOSManager.signatureProvider.keys.set(account.publicKey, account.privateKey);
		}

		return await eos.transact(
			{
				actions: [
					{
						account: 'eosio',
						name: 'newaccount',
						authorization: [
							{
								actor: creator.name,
								permission: 'active',
							},
						],
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
					{
						account: 'eosio',
						name: 'buyrambytes',
						authorization: [
							{
								actor: creator.name,
								permission: 'active',
							},
						],
						data: {
							payer: creator.name,
							receiver: account.name,
							bytes: 8192,
						},
					},
					{
						account: 'eosio',
						name: 'delegatebw',
						authorization: [
							{
								actor: creator.name,
								permission: 'active',
							},
						],
						data: {
							from: creator.name,
							receiver: account.name,
							stake_net_quantity: '10.0000 SYS',
							stake_cpu_quantity: '10.0000 SYS',
							transfer: false,
						},
					},
				],
			},
			// {
			// 	actions: [
			// 		{
			// 			newaccount: {
			// 				creator: creator.name,
			// 				name: account.name,
			// 				owner: account.publicKey,
			// 				active: account.publicKey,
			// 			},
			// 		},
			// 		{
			// 			buyrambytes: {
			// 				payer: creator.name,
			// 				receiver: account.name,
			// 				bytes: 8192,
			// 			},
			// 		},
			// 		{
			// 			delegatebw: {
			// 				from: creator.name,
			// 				receiver: account.name,
			// 				stake_net_quantity: '10.0000 SYS',
			// 				stake_cpu_quantity: '10.0000 SYS',
			// 				transfer: 0,
			// 			},
			// 		},
			// 	],
			// },
			{
				blocksBehind: 3,
				expireSeconds: 30,
			}
		);
	};

	private static flattenOptions(options?: AccountCreationOptions) {
		const creator = (options && options.creator) || EOSManager.adminAccount;
		const eos = (options && options.eos) || EOSManager.api;

		if (!creator) throw new Error('Creator not provided.');
		if (!eos) throw new Error('EOS instance not provided.');

		return { creator, eos };
	}
}
