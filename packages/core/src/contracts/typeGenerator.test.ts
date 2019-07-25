import { assert } from 'chai';

import { ConfigManager } from '../configManager';
import { eosIsReady, startEos, buildAll, stopContainer } from '@lamington/cli/src/utils';
import { mapParameterType } from './typeGenerator';

/**
 * Javascript only supports number, so CPP integer types need to be mapped accordingly
 */
const numberTypes = [
	'int8',
	'int16',
	'int32',
	'int64',
	'int128',
	'int256',
	'uint8',
	'uint16',
	'uint32',
	'uint64',
	'uint128',
	'uint256',
	'uint8_t',
	'uint16_t',
	'uint32_t',
	'uint64_t',
	'uint128_t',
	'uint256_t',
];

/**
 * Name types are typically a string or uint64_t and typically represent an identity on the EOS blockchain
 */
const stringNumberTypes = [
	'name',
	'action_name',
	'scope_name',
	'account_name',
	'permission_name',
	'table_name',
];

describe('type generator', function() {
	context('map parameter types', function() {
		it(`should map 'string' to 'string'`, function() {
			assert.equal(mapParameterType('string'), 'string', `'string' types should map to 'string'`);
		});

		it(`should map 'bool' to 'boolean'`, function() {
			assert.equal(mapParameterType('bool'), 'boolean');
		});

		context('eos types', function() {
			it(`should map name types to 'string|number'`, function() {
				stringNumberTypes.map(type =>
					assert.equal(
						mapParameterType(type),
						'string|number',
						`'${type}' type should map to 'string' or 'number'`
					)
				);
			});

			it(`should map 'checksum' to 'string'`, function() {
				assert.equal(
					mapParameterType('checksum'),
					'string',
					`'checksum' type should map to 'string'`
				);
			});
		});

		context('big numbers', function() {
			numberTypes.forEach(type => {
				it(`should map '${type}' to 'number'`, function() {
					assert.equal(
						mapParameterType(type),
						'number',
						`Integer type '${type}' should map to 'number'`
					);
				});
			});
		});

		context('complex types', function() {
			it(`should handle array types`, function() {
				assert.equal(mapParameterType('bool[]'), 'Array<boolean>');
			});

			xit(`should handle vector types`, function() {
				assert.equal(mapParameterType('vector<string>'), 'Array<string>');
			});
		});
	});

	context('type generation integration tests', function() {
		before(async function() {
			// This can take a long time.
			this.timeout(400000);

			await ConfigManager.initWithDefaults();
			// Start the EOSIO container image if it's not running.
			if (!(await eosIsReady())) {
				await startEos();
			}
			// Build all smart contracts
			await buildAll();

			// And stop it if we don't have keepAlive set.
			if (!ConfigManager.keepAlive) {
				await stopContainer();
			}
		});

		it('should generate an expected result from the eosio.token contract file', async function() {
			console.log('yup');
		});
	});
});
