import { Permissions } from './permissions';
import * as ecc from 'eosjs-ecc';
import { Contract } from '../contracts';
import { AccountManager } from './accountManager';

export class Account {
	/** EOSIO account name */
	public name: string;
	/** EOSIO account public key */
	public publicKey: string;
	/** EOSIO account private key */
	public privateKey: string;
	/** EOSIO account permissions */
	public permissions: Permissions;

	constructor(name: string, privateKey: string, publicKey?: string) {
		// Store references
		this.name = name;
		this.privateKey = privateKey;

		this.publicKey = ecc.privateToPublic(privateKey);

		if (publicKey && publicKey !== this.publicKey) {
			throw new Error(
				`Supplied public key does not match private key. Supplied key: ${publicKey} Expected key: ${ecc.privateToPublic(
					privateKey
				)} This is usually caused by using the legacy key format vs the new style key format.`
			);
		}

		// Set default permissions
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

	/**
	 * Returns a configured active key permission
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @returns Valid active key
	 */
	public get active() {
		return [
			{
				actor: this.name,
				permission: 'active',
			},
		];
	}

	/**
	 * Returns a configured owner key permission
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @returns Valid owner key
	 */
	public get owner() {
		return [
			{
				actor: this.name,
				permission: 'owner',
			},
		];
	}

	/**
	 * Adds the `eosio.code` permission to this account
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @returns Add permission transaction promise
	 */
	public addCodePermission = async () => {
		await AccountManager.addCodePermission(this);
	};
}
