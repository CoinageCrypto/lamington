import { Account } from '../accounts';
import { nextBlock } from '../utils';
import { Api } from 'eosjs';
import { Contract as EOSJSContract, Type } from 'eosjs/dist/eosjs-serialize';
import { EOSManager } from '../eosManager';
import { Abi } from 'eosjs/dist/eosjs-rpc-interfaces';

export interface ContractActionParameters {
	[key: string]: any;
}

export interface ContractActionOptions {
	from?: Account;
}

export class Contract implements EOSJSContract {
	private _eos: Api;
	private _account: Account;
	private _identifier: string;
	private _abi: Abi;
	public actions: Map<string, Type> = new Map();
	public types: Map<string, Type> = new Map();

	public get account(): Account {
		return this._account;
	}

	public get identifier(): string {
		return this._identifier;
	}

	constructor(
		eos: Api,
		identifier: string,
		account: Account,
		abi: Abi,
		actions: Map<string, Type>,
		types: Map<string, Type>
	) {
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
						`Insufficient arguments supplied to ${action.name}. Expected ${
							action.fields.length
						} got ${arguments.length}.`
					);
				}

				if (arguments.length > action.fields.length + 1) {
					throw new Error(
						`Too many arguments supplied to ${action.name}. Expected ${action.fields.length} got ${
							arguments.length
						}.`
					);
				}

				for (let i = 0; i < action.fields.length; i++) {
					data[action.fields[i].name] = arguments[i];
				}

				// Who are we acting as?
				// We default to sending transactions from the contract account.
				let authorization = account;
				const options = arguments[action.fields.length];

				if (options && options.from && options.from instanceof Account) {
					authorization = options.from;
				}

				return EOSManager.transact(
					{
						actions: [
							{
								account: account.name,
								name: action.name,
								authorization: authorization.active,
								data,
							},
						],
					},
					eos
				);
			};
		}

		// And now the tables.
		for (const table of abi.tables) {
			(this as any)[table.name] = function() {
				return this.getTableRows(table.name, arguments[0]);
			};
		}
	}

	getTableRows = async (table: string, scope?: string) => {
		// Wait for the next block to appear before we query the values.
		await nextBlock();

		const result = await this._eos.rpc.get_table_rows({
			code: this.account.name,
			scope: scope || this.account.name,
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
			// Ok, we need to map.
			for (const row of result.rows) {
				for (const field of booleanFields) {
					const currentValue = row[field.name];

					if (currentValue !== 0 && currentValue !== 1) {
						throw new Error(
							`Invalid value while casting to boolean for ${
								field.name
							} field on row. Got ${currentValue}, expected 0 or 1.`
						);
					}

					row[field.name] = currentValue ? true : false;
				}
			}
		}

		return result;
	};
}
