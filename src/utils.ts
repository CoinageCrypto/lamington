import * as assert from 'assert';
import * as chai from 'chai';
// @ts-ignore
import * as deepEqualInAnyOrder from 'deep-equal-in-any-order';

import { EOSManager } from './eosManager';
import { TableRowsResult } from './contracts';

// Exected Chai's expect methods
chai.use(deepEqualInAnyOrder);

/**
 * Sleep Until Block
 * @desc Pauses the current process until the specified EOS block number occurs
 * @note Assumes blocks will always be produced every 500ms
 * @param number Process sleep duration
 * @author Kevin Brown <github.com/thekevinbrown>
 */
export const untilBlockNumber = async (number: number) => {
	// Loops until current head block number reaches desired
	let { head_block_num } = await EOSManager.rpc.get_info();
	while (head_block_num < number) {
		// Sleep for block and update current block number
		await sleep((number - head_block_num) * 500);
		({ head_block_num } = await EOSManager.rpc.get_info());
	}
};

/**
 * Sleep Process
 * @desc Pauses the current process for the specified duration
 * @param delayInMs Process sleep duration
 * @author Kevin Brown <github.com/thekevinbrown>
 */
export const sleep = async (delayInMs: number) =>
	new Promise(resolve => setTimeout(resolve, delayInMs));

/**
 * Sleep Block
 * @desc Pauses the current process for the 500ms EOS block time
 * @note The process will wake during and not on the next block
 * @author Kevin Brown <github.com/thekevinbrown>
 */
export const nextBlock = () => sleep(500);

/**
 * Assert table rows equal expected
 * @desc Compares table rows match expected rows
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param getTableRowsResult Get table rows result promise
 * @param expected Expected table row query results
 */
export const assertRowsEqual = async <RowType>(
	getTableRowsResult: Promise<TableRowsResult<RowType>>,
	expected: Array<RowType>
) => {
	// Call the table row query and assert results equal expected
	const result = await getTableRowsResult;
	assert.deepEqual(result, {
		rows: expected,
		more: false,
	});
};

/**
 * Assert table rows eventually equal expected
 * @desc Order irrespective comparison of table rows against expected rows
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param getTableRowsResult Get table rows result promise
 * @param expected Expected table row query results
 */
export const assertRowsEqualLazy = async <RowType>(
	getTableRowsResult: Promise<TableRowsResult<RowType>>,
	expected: Array<RowType>
) => {
	// Call table row query and assert results eventually equal expected
	const result = await getTableRowsResult;
	// @ts-ignore - Not sure how to add this extended method `equalInAnyOrder`?
	chai.expect(result).to.deep.equalInAnyOrder({
		rows: expected,
		more: false,
	});
};

/**
 * Assert table row result count
 * @desc Validates the number of rows returned is equal to the expected count
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param getTableRowsResult Get table rows result promise
 * @param expectedRowCount Expected number of table rows
 */
export const assertRowCount = async (
	getTableRowsResult: Promise<TableRowsResult<any>>,
	expectedRowCount: number
) => {
	const result = await getTableRowsResult;
	// Precheck table rows don't extend beyond returned result
	assert.equal(
		result.more,
		false,
		`There were more rows pending on the response which was not expected.`
	);
	// Validate the number of rows returned equals the expected count
	assert.equal(result.rows.length, expectedRowCount, `Different number of rows than expected.`);
};

/**
 * Assert EOS Error
 * @desc Asserts EOS throws an error and validates the error output name matches the expected `eosErrorName`
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param operation The operation result promise
 * @param eosErrorName Expected EOS error name
 * @param description Output message description
 */
export const assertEOSError = async (
	operation: Promise<any>,
	eosErrorName: string,
	description: string
) => {
	// Execute operation and handle exceptions
	try {
		await operation;
	} catch (error) {
		if (error.json && error.json.error && error.json.error.name) {
			// Compare error and fail if the error doesn't match the expected
			assert(
				error.json.error.name === eosErrorName,
				`Expected ${eosErrorName}, got ${error.json.error.name} instead.`
			);
			return;
		} else {
			// Fail if error not thrown by EOS
			assert.fail(`Expected EOS error ${eosErrorName}, but got ${JSON.stringify(error, null, 4)} instead.`);
		}
	}
	// Fail if no exception thrown
	assert.fail(`Expected ${description} but operation completed successfully.`);
};

/**
 * Assert EOS Exception
 * @desc Asserts operation throws an `eosio_assert_message_exception` error
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param operation The operation result promise
 */
export const assertEOSException = (operation: Promise<any>) =>
	assertEOSError(operation, 'eosio_assert_message_exception', 'assert');

/**
 * Assert Missing EOS Authority
 * @desc Asserts operation is missing the required authority by throwing a `missing_auth_exception` error
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param operation The operation result promise
 */
export const assertMissingAuthority = (operation: Promise<any>) =>
	assertEOSError(operation, 'missing_auth_exception', 'missing authority');
