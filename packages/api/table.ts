import * as assert from 'assert';
import * as chai from 'chai';
import * as deepEqualInAnyOrder from 'deep-equal-in-any-order';
import { TableRowsResult } from '@lamington/interfaces';
// Extend Chai expect methods
chai.use(deepEqualInAnyOrder);

/**
 * Compares table rows against expected rows irrespective of order
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param getTableRowsResult Get table rows result promise
 * @param expected Expected table row query results
 * @param strict Strict comparison flag
 */
export const assertRowsEqual = async <RowType>(
	getTableRowsResult: Promise<TableRowsResult<RowType>>,
	expected: Array<RowType>,
	strict: boolean = false
) => {
	// Pass-through strict comparison
	if (strict) {
		assertRowsEqualStrict(getTableRowsResult, expected);
		return;
	}
	// Call table row query and assert results eventually equal expected
	const result = await getTableRowsResult;
	// @ts-ignore - Not sure how to add this extended method `equalInAnyOrder`?
	chai.expect(result).to.deep.equalInAnyOrder({
		rows: expected,
		more: false,
	});
};

/**
 * Performs a strict comparison of queried table rows against expected rows
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param getTableRowsResult Get table rows result promise
 * @param expected Expected table row query results
 */
export const assertRowsEqualStrict = async <RowType>(
	getTableRowsResult: Promise<TableRowsResult<RowType>>,
	expected: Array<RowType>
) => {
	// Call the table row query and assert results equal expected
	const result = await getTableRowsResult;

	assert.deepStrictEqual(result, {
		rows: expected,
		more: false,
	});
};

/**
 * Validates the number of rows returned is equal to the expected count
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
