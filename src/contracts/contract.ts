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
		this.actions = actions;
		this.types = types;

		// Set up all the actions as methods on the contract.
		for (const action of actions.values()) {
			(this as any)[action.name] = function() {
				const data: { [key: string]: any } = {};

				// Copy the params across for the call.
				if (
					arguments.length != action.fields.length &&
					arguments.length + 1 != action.fields.length
				) {
					throw new Error(
						`Insufficient arguments supplied to ${action.name}. Expected ${
							action.fields.length
						} got ${arguments.length}.`
					);
				}

				for (let i = 0; i < action.fields.length; i++) {
					data[action.fields[i].name] = arguments[i];
				}

				// Who are we acting as?
				// We default to sending transactions from the contract account.
				let authorization = account;

				if (arguments[action.fields.length] instanceof Account) {
					authorization = arguments[action.fields.length];
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

		return await this._eos.rpc.get_table_rows({
			code: this.account.name,
			scope: scope || this.account.name,
			table,
			json: true,
		});
	};
}
