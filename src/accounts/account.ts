import { Permissions } from './permissions';
import * as ecc from 'eosjs-ecc';
import { Contract } from '../contracts';
import { AccountManager } from './accountManager';

export class Account {
	public name: string;
	public publicKey: string;
	public privateKey: string;
	public permissions: Permissions;

	constructor(name: string, privateKey: string, publicKey?: string) {
		this.name = name;
		this.privateKey = privateKey;
		this.publicKey = publicKey || ecc.privateToPublic(privateKey);

		this.permissions = {
			active: {
				actor: name,
				permission: 'active',
			},
			owner: {
				actor: name,
				permission: 'owner',
			},
		};
	}

	public get active() {
		return [
			{
				actor: this.name,
				permission: 'active',
			},
		];
	}

	public get owner() {
		return [
			{
				actor: this.name,
				permission: 'owner',
			},
		];
	}

	public addCodePermission = async (contract: Contract) => {
		await AccountManager.addCodePermission(this, contract);
	};
}
