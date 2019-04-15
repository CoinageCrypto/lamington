import { Account } from '../accounts';
import { nextBlock } from '../utils';
import { Api } from 'eosjs';
import { Contract as EOSJSContract, Type } from 'eosjs/dist/eosjs-serialize';
import { EOSManager } from '../eosManager';

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

	constructor(
		eos: Api,
		identifier: string,
		account: Account,
		actions: Map<string, Type>,
		types: Map<string, Type>
	) {
		this._eos = eos;
		this._identifier = identifier;
		this._account = account;
		this.actions = actions;
		this.types = types;

		for (const action of actions.values()) {
			if (action.fields.length > 0) {
				(this as any)[action.name] = function(
					params: ContractActionParameters,
					options?: ContractActionOptions
				) {
					let authorization = (options && options.from) || account;

					return EOSManager.transact(
						{
							actions: [
								{
									account: account.name,
									name: action.name,
									authorization: authorization.active,
									data: {
										...params,
									},
								},
							],
						},
						eos
					);
				};
			} else {
				(this as any)[action.name] = function(options?: ContractActionOptions) {
					let authorization = (options && options.from) || account;

					return EOSManager.transact(
						{
							actions: [
								{
									account: account.name,
									name: action.name,
									authorization: authorization.active,
									data: {},
								},
							],
						},
						eos
					);
				};
			}
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
