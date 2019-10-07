import { Account, AccountManager } from '../accounts';
import { nextBlock } from '../utils';
import { Api } from 'eosjs';
import { Contract as EOSJSContract, Type } from 'eosjs/dist/eosjs-serialize';
import { EOSManager } from '../eosManager';
import { Abi } from 'eosjs/dist/eosjs-rpc-interfaces';
import { camelCase } from './utils';

export interface ContractActionParameters {
	[key: string]: any;
}

export interface ContractActionOptions {
	from?: Account;
	debug?: boolean;
}

export interface ContractConstructorArgs {
	eos: Api;
	identifier?: string;
	account: Account;
	abi: Abi;
	actions: Map<string, Type>;
	types: Map<string, Type>;
}

export interface GetTableRowsOptions {
	scope?: string;
	tableKey?: string;
	lowerBound?: any;
	upperBound?: any;
	indexPosition?: any;
	keyType?: any;
	limit?: number;
	reverse?: boolean;
	showPayer?: boolean;
}

export interface ActorPermission {
	actor: string;
	permission: string;
}

/**
 * Adds additional functionality to the EOSJS `Contract` class
 */
export class Contract implements EOSJSContract {
	/** @hidden EOSJS api reference */
	private _eos: Api;
	/** @hidden Current contract account */
	private _account: Account;
	/** @hidden Contract identifier. Typically the contract file name minus the extension.
	 * Can be undefined when the contract is loaded as already deployed and we're never given an indentifier to map it back to. */
	private _identifier?: string;
	/** @hidden Current contract ABI */
	private _abi: Abi;
	/** Deployed contract actions */
	public actions: Map<string, Type> = new Map();
	/** Deployed contract types */
	public types: Map<string, Type> = new Map();

	/**
	 * Gets the currently configured contract account
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @returns Current contract account
	 */
	public get account() {
		return this._account;
	}

	/**
	 * Gets the current contract identifier
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @returns Contract identifier
	 */
	public get identifier() {
		return this._identifier;
	}

	constructor({ eos, identifier, account, abi, actions, types }: ContractConstructorArgs) {
		// Store contract arguments
		this._eos = eos;
		this._identifier = identifier;
		this._account = account;
		this._abi = abi;
		this.actions = actions;
		this.types = types;
		// Set up all the actions as methods on the contract.
		for (const action of actions.values()) {
			(this as any)[action.name] = function() {
				const data: { [key: string]: any } = {};

				// Copy the params across for the call.
				if (arguments.length < action.fields.length) {
					throw new Error(
						`Insufficient arguments supplied to ${action.name}. Expected ${action.fields.length} got ${arguments.length}.`
					);
				}

				if (arguments.length > action.fields.length + 1) {
					throw new Error(
						`Too many arguments supplied to ${action.name}. Expected ${action.fields.length} got ${arguments.length}.`
					);
				}

				for (let i = 0; i < action.fields.length; i++) {
					data[action.fields[i].name] = arguments[i];
				}

				// Who are we acting as?
				// We default to sending transactions from the contract account.
				let authorization: Array<ActorPermission> = account.active;
				const options = arguments[action.fields.length];

				if (options) {
					if (options.from && options.from instanceof Account) {
						authorization = options.from.active;

						// Ensure we have the key to sign with.
						EOSManager.addSigningAccountIfMissing(options.from);
					} else if (options.auths && options.auths instanceof Array) {
						authorization = options.auths;
					}
				}

				return EOSManager.transact(
					{
						actions: [
							{
								account: account.name,
								name: action.name,
								authorization: authorization,
								data,
							},
						],
					},
					eos,
					{ debug: options && options.debug }
				);
			};
		}
		// And now the tables.
		for (const table of abi.tables) {
			(this as any)[camelCase(table.name) + 'Table'] = function() {
				return this.getTableRows(table.name, arguments[0]);
			};
		}
	}

	/**
	 * Retrieves table rows with the specified table name and optional scope
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @note Implements a temporary patch for the EOSjs `bool` mapping error
	 * @param table The table name
	 * @param scope Optional table scope, defaults to the table name
	 * @note The original EOSJS typings for this are just `any`. I'd love to improve that.
	 */
	public getTableRows = async (table: string, options?: GetTableRowsOptions) => {
		// Wait for the next block to appear before we query the values.
		await nextBlock();

		const result = await this._eos.rpc.get_table_rows({
			code: this.account.name,
			scope: (options && options.scope) || this.account.name,
			table_key: options && options.tableKey,
			lower_bound: options && options.lowerBound,
			upper_bound: options && options.upperBound,
			index_position: options && options.indexPosition,
			key_type: options && options.keyType,
			limit: options && options.limit,
			reverse: options && options.reverse,
			show_payer: options && options.showPayer,
			table,
			json: true,
		});

		// EOSJS gives us values that don't match up with our Typescript types,
		// for example, the ABI bool type gets returned as a number (0 or 1) instead
		// of a boolean. This is confusing and weird when trying to deep equal
		// and other types of comparisons, so we'll go ahead and use the ABI
		// to map the types to what we consider to be more canonical types.
		// This mapping will always be limited to just the types we do special
		// things with in Lamington world, and will always match the generated
		// types for table rows. Other values will pass through untouched.
		const tableAbi = this._abi.tables.find(tableAbi => tableAbi.name === table);
		if (!tableAbi) throw new Error(`Could not find ABI for table ${table}`);
		const tableRowType = this.types.get(tableAbi.type);
		if (!tableRowType) throw new Error(`Could not find table row type for table ${table}`);

		// Bool is the only type we need to fiddle with at the moment, so only do this if
		// there's a field with a bool type in it.
		const booleanFields = tableRowType.fields.filter(field => field.typeName === 'bool');

		if (booleanFields.length > 0) {
			// Map all `bool` fields from numbers to booleans
			for (const row of result.rows) {
				for (const field of booleanFields) {
					const currentValue = row[field.name];

					if (currentValue !== 0 && currentValue !== 1) {
						throw new Error(
							`Invalid value while casting to boolean for ${field.name} field on row. Got ${currentValue}, expected 0 or 1.`
						);
					}

					row[field.name] = currentValue ? true : false;
				}
			}
		}

		// Bool is the only type we need to fiddle with at the moment, so only do this if
		// there's a field with a bool type in it.
		const dateFields = tableRowType.fields.filter(field => field.typeName === 'time_point_sec');

		if (dateFields.length > 0) {
			// Map all `time_point_sec` fields from numbers to Date
			for (const row of result.rows) {
				for (const field of dateFields) {
					const currentValue = row[field.name];

					let date = new Date(currentValue + 'Z');
					console.log('trying to parse date: ' + date.toUTCString() + ' raw: ' + currentValue);

					if (date === undefined) {
						throw new Error(
							`Invalid value while casting to Date for ${field.name} field on row. Got ${currentValue}, expected as ISO date string.`
						);
					}

					row[field.name] = date;
				}
			}
		}

		return result;
	};

	/**
	 * Grants `eosio.code` permission to the contract account's `active` key
	 * @note Can also be called from AccountManager, as the action is technically an account based action.
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @author Mitch Pierias <github.com/MitchPierias>
	 */
	public addCodePermission = () => AccountManager.addCodePermission(this._account);
}
