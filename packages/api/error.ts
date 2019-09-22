import * as assert from 'assert';

/**
 * Asserts EOS throws an error and validates the error output name matches the expected `eosErrorName`
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param operation Operation promise
 * @param eosErrorName Expected EOS error name
 * @param withMessage (optional) Expected exception output message
 */
export const assertEOSError = async (
	operation: Promise<any>,
	eosErrorName: string,
	withMessage?: string
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
			// Check the error details contain the optional message
			if (withMessage && error.json.error.details.length > 0) {
				assert.deepEqual(error.json.error.details[0], {
					message: `assertion failure with message: ${withMessage}`,
				});
			}
			return;
		} else {
			// Fail if error not thrown by EOS
			assert.fail(
				`Expected EOS error ${eosErrorName}, but got ${JSON.stringify(error, null, 4)} instead.`
			);
		}
	}
	// Fail if no exception thrown
	assert.fail(`Expected ${withMessage || 'error'} but operation completed successfully.`);
};

/**
 * Asserts operation throws an `eosio_assert_message_exception` error
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param operation Operation promise
 * @param message (optional) Expected exception message
 */
export const assertEOSException = (operation: Promise<any>, message?: string) =>
	assertEOSError(operation, 'eosio_assert_message_exception', message || 'assert');

/**
 * Asserts operation is missing the required authority by throwing a `missing_auth_exception` error
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param operation Operation promise
 */
export const assertMissingAuthority = (operation: Promise<any>) =>
	assertEOSError(operation, 'missing_auth_exception', 'missing authority');
