import { Account } from '@lamington/core';
import { Api } from 'eosjs';
import { Abi } from 'eosjs/dist/eosjs-rpc-interfaces';
import { Type } from 'eosjs/dist/eosjs-serialize';

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
