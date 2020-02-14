// =====================================================
// WARNING: GENERATED FILE
//
// Any changes you make will be overwritten by Lamington
// =====================================================

import { Account, Contract, GetTableRowsOptions, ExtendedAsset, ExtendedSymbol, ActorPermission, TableRowsResult } from 'lamington';

// Table row types
export interface ExampleMessageStruct {
	id: number;
	body: string;
	author: string|number;
}

export interface ExamplePost {
	author: string|number;
	message: string;
}

export interface Example extends Contract {
	// Actions
	post(author: string|number, message: string, options?: { from?: Account, auths?: ActorPermission[] }): Promise<any>;
	
	// Tables
	messagesTable(options?: GetTableRowsOptions): Promise<TableRowsResult<ExampleMessageStruct>>;
}

