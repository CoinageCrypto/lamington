// =====================================================
// WARNING: GENERATED FILE
//
// Any changes you make will be overwritten by Lamington
// =====================================================

import { Account, Contract, GetTableRowsOptions, TableRowsResult } from 'lamington';

// Table row types
export interface ExampleMessages {
	id: number;
	body: string;
	author: string|number;
}

export interface Example extends Contract {
	// Actions
	post(author: string|number, message: string, options?: { from?: Account }): Promise<any>;
	
	// Tables
	messages(options?: GetTableRowsOptions): Promise<TableRowsResult<ExampleMessages>>;
}

