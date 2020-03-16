import { EOSManager } from '../eosManager';
import { Account } from './account';
import { EosioAction } from './utils';

export namespace UpdateAuth {
	export interface PermissionLevel {
		actor: string;
		permission: string;
	}

	interface PermissionLevelWeight {
		permission: PermissionLevel;
		weight: number;
	}

	interface AuthorityToSet {
		threshold: number;
		keys: KeyWait[];
		accounts: PermissionLevelWeight[];
		waits: WeightWait[];
	}

	export interface WeightWait {
		seconds: number;
		weight: number; // not sure if needed
	}

	export interface KeyWait {
		key: string;
		weight: number; // not sure if needed
	}
	/**
	 *
	 * @param authorizations that would be permitted to perform this action on the account.
	 * @param account The account on which the auth is to changed.
	 * @param permission The name of the new permission to set on the account
	 * @param parent The new permission should a child of the parent permission.
	 * @param authToSet The auth to be set as the controller auth for the new permission
	 */
	export async function execUpdateAuth(
		authorizations: PermissionLevel[],
		account: string,
		permission: string,
		parent: string,
		authToSet: AuthorityToSet
	) {
		const actions: EosioAction[] = [
			{
				account: 'eosio',
				name: 'updateauth',
				authorization: authorizations,
				data: {
					account: account,
					permission: permission,
					parent: parent,
					auth: authToSet,
				},
			},
		];
		await EOSManager.transact({ actions });
	}

	export namespace AuthorityToSet {
		export function forContractCode(account: Account): AuthorityToSet {
			return forAccount(account, 'eosio.code');
		}

		/**
		 * Convenience function to get an AuthorityToSet for a given user with a named permission.
		 * Typical usecase for this would be when assigning the control of one account's permission to a different controlling account.
		 * eg. A bookkeeper account should be given `pay` permission on a treasury account.
		 *  This function would supply the AuthorityToSet for a `bookkeeper` with their `active` permission into the `updateAuth` function.
		 * @param account Account to hold the new authority
		 * @param permission The name of the new authority to be added to `account`
		 */
		export function forAccount(account: Account, permission: string): AuthorityToSet {
			return explicitAuthorities(1, [
				{
					permission: { actor: account.name, permission: permission },
					weight: 1,
				},
			]);
		}

		/**
		 * A function to build the Authority to update
		 * @param threshold The threshold required from associated PermissionLevelsWeights, KeyLevelWeights and WaitWeights to activate this auth.
		 * @param permissionLevelWeights The PermissionLevelWeights to contribute to this auth
		 * @param keyWeights The KeyLevelWeights to contribute to this auth
		 * @param waitWeights The WaitWeights to contribute to this auth
		 * If the threshold is set to high for it to be satisfied by the associated permissionWeights the updateAuth action will assert.
		 */
		export function explicitAuthorities(
			threshold: number,
			permissionLevelWeights: PermissionLevelWeight[] = [],
			keyWeights: KeyWait[] = [],
			waitWeights: WeightWait[] = []
		): AuthorityToSet {
			return {
				threshold: threshold,
				accounts: permissionLevelWeights,
				keys: keyWeights,
				waits: waitWeights,
			};
		}
	}

	/**
	 *
	 * @param authorizations The authorizations allowed to make this change
	 * @param account The account to make the changes on
	 * @param code The contract that hold the action for the link_auth to be affected on
	 * @param type The action that should linked to this auth
	 * @param requirement The permission name that should now perform the action
	 */
	export async function execLinkAuth(
		authorizations: PermissionLevel[],
		account: string,
		code: string,
		type: string,
		requirement: string
	) {
		const actions: EosioAction[] = [
			{
				account: 'eosio',
				name: 'linkauth',
				authorization: authorizations,
				data: {
					account: account,
					code: code,
					type: type,
					requirement: requirement,
				},
			},
		];
		await EOSManager.transact({ actions });
	}
}
