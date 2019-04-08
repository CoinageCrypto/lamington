import { Permissions } from './permissions';
import * as ecc from 'eosjs-ecc';

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
}
