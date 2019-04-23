import * as assert from 'assert';

import { EOSManager } from './eosManager';
import { TableRowsResult } from './contracts';

export const untilBlockNumber = async (number: number) => {
	let { head_block_num } = await EOSManager.rpc.get_info();

	while (head_block_num < number) {
		// Assuming 500ms blocks
		await sleep((number - head_block_num) * 500);

		({ head_block_num } = await EOSManager.rpc.get_info());
	}
};

export const sleep = async (delayInMs: number) =>
	new Promise(resolve => setTimeout(resolve, delayInMs));

export const nextBlock = () => sleep(500);

export const assertRowsEqual = async <RowType>(
	getTableRowsResult: Promise<TableRowsResult<RowType>>,
	expected: Array<RowType>
) => {
	const result = await getTableRowsResult;
	assert.deepEqual(result, {
		rows: expected,
		more: false,
	});
};

export const assertRowCount = async (
	getTableRowsResult: Promise<TableRowsResult<any>>,
	expectedRowCount: number
) => {
	const result = await getTableRowsResult;

	assert.equal(
		result.more,
		false,
		`There were more rows pending on the response which was not expected.`
	);

	assert.equal(result.rows.length, expectedRowCount, `Different number of rows than expected.`);
};

export const assertEOSError = async (
	operation: Promise<any>,
	eosErrorName: string,
	description: string
) => {
	try {
		await operation;
	} catch (error) {
		if (error.json && error.json.error && error.json.error.name) {
			assert(
				error.json.error.name === eosErrorName,
				`Expected ${eosErrorName}, got ${error.json.error.name} instead.`
			);
			return;
		} else {
			assert.fail(
				`Expected EOS error ${eosErrorName}, but got ${JSON.stringify(error, null, 4)} instead.`
			);
		}
	}

	assert.fail(`Expected ${description} but operation completed successfully.`);
};

export const assertEOSException = (operation: Promise<any>) =>
	assertEOSError(operation, 'eosio_assert_message_exception', 'assert');

export const assertMissingAuthority = (operation: Promise<any>) =>
	assertEOSError(operation, 'missing_auth_exception', 'missing authority');
