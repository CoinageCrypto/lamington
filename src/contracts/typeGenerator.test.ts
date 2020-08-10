import { assert } from 'chai';

import { ConfigManager } from '../configManager';
import { eosIsReady, startEos, buildAll, stopContainer } from '../cli/utils';
import { mapParameterType, generateTypesFromString } from './typeGenerator';

/**
 * Javascript only supports 64 bit floating point numbers natively, so CPP integer types need to be mapped accordingly
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

describe('type generator', function () {
	context('map parameter types', function () {
		it(`should map 'string' to 'string'`, function () {
			assert.equal(
				mapParameterType({ eosType: 'string' }),
				'string',
				`'string' types should map to 'string'`
			);
		});

		it(`should map 'bool' to 'boolean'`, function () {
			assert.equal(mapParameterType({ eosType: 'bool' }), 'boolean');
		});

		context('eos types', function () {
			it(`should map name types to 'string|number'`, function () {
				stringNumberTypes.map((eosType) =>
					assert.equal(
						mapParameterType({ eosType }),
						'string|number',
						`'${eosType}' type should map to 'string' or 'number'`
					)
				);
			});

			it(`should map 'checksum' to 'string'`, function () {
				assert.equal(
					mapParameterType({ eosType: 'checksum' }),
					'string',
					`'checksum' type should map to 'string'`
				);
			});
		});

		context('big numbers', function () {
			numberTypes.forEach((eosType) => {
				it(`should map '${eosType}' to 'number'`, function () {
					assert.equal(
						mapParameterType({ eosType }),
						'number',
						`Integer type '${eosType}' should map to 'number'`
					);
				});
			});
		});

		context('complex types', function () {
			it(`should handle array types`, function () {
				assert.equal(mapParameterType({ eosType: 'bool[]' }), 'Array<boolean>');
			});

			it(`should handle custom types from the contract`, function () {
				assert.equal(
					mapParameterType({
						eosType: 'pair_uint8_string',
						contractName: 'TestContract',
						contractStructs: { pair_uint8_string: 'pair_uint8_string' },
					}),
					'TestContractPairUint8String'
				);
			});

			it(`should handle custom types in containers`, function () {
				assert.equal(
					mapParameterType({
						eosType: 'pair_uint8_string[]',
						contractName: 'TestContract',
						contractStructs: { pair_uint8_string: 'pair_uint8_string' },
					}),
					'Array<TestContractPairUint8String>'
				);
			});
		});

		context('generator levels for ABI string', async () => {
			const rawABI = `
			{
				"____comment": "This file was generated with eosio-abigen. DO NOT EDIT ",
				"version": "eosio::abi/1.1",
				"types": [],
				"structs": [{
						"name": "dac",
						"base": "",
						"fields": [{
								"name": "owner",
								"type": "name"
							},
							{
								"name": "dac_id",
								"type": "name"
							},
							{
								"name": "title",
								"type": "string"
							},
							{
								"name": "symbol",
								"type": "extended_symbol"
							},
							{
								"name": "refs",
								"type": "pair_uint8_string[]"
							},
							{
								"name": "accounts",
								"type": "pair_uint8_name[]"
							},
							{
								"name": "dac_state",
								"type": "uint8"
							}
						]
					},
					{
						"name": "extended_symbol",
						"base": "",
						"fields": [{
								"name": "symbol",
								"type": "symbol"
							},
							{
								"name": "contract",
								"type": "name"
							}
						]
					},
					{
						"name": "pair_uint8_name",
						"base": "",
						"fields": [{
								"name": "key",
								"type": "uint8"
							},
							{
								"name": "value",
								"type": "name"
							}
						]
					},
					{
						"name": "pair_uint8_string",
						"base": "",
						"fields": [{
								"name": "key",
								"type": "uint8"
							},
							{
								"name": "value",
								"type": "string"
							}
						]
					},
					{
						"name": "regaccount",
						"base": "",
						"fields": [{
								"name": "dac_id",
								"type": "name"
							},
							{
								"name": "account",
								"type": "name"
							},
							{
								"name": "type",
								"type": "uint8"
							}
						]
					},
					{
						"name": "regdac",
						"base": "",
						"fields": [{
								"name": "owner",
								"type": "name"
							},
							{
								"name": "dac_id",
								"type": "name"
							},
							{
								"name": "dac_symbol",
								"type": "extended_symbol"
							},
							{
								"name": "title",
								"type": "string"
							},
							{
								"name": "refs",
								"type": "pair_uint8_string[]"
							},
							{
								"name": "accounts",
								"type": "pair_uint8_name[]"
							}
						]
					}
				],
				"actions": [{
						"name": "regaccount",
						"type": "regaccount",
						"ricardian_contract": "## ACTION: regaccount**PARAMETERS:*** __dac_name__ is an eosio account name uniquely identifying the DAC. * __account__ is an eosio account name to be associated with the DAC* __type__ a number representing type of the association with the DAC**INTENT:** The intent of regaccount is create a releationship between an eosio account and the DAC for a particular purpose. ####Warning: This action will store the content on the chain in the history logs and the data cannot be deleted later."
					},
					{
						"name": "regdac",
						"type": "regdac",
						"ricardian_contract": "## ACTION: <regdac>**PARAMETERS:*** __owner__ is an eosio account name for the owner account of the DAC. * __dac_name__ is an eosio account name uniquely identifying the DAC. * __dac_symbol__ is an eosio symbol name representing the primary token used in the DAC. *  __title__ is a string that for the title of the DAC.* __refs__* __accounts__ a map of the key accounts used in the DACs**INTENT** The intent of regdac register a new DAC with all the required key accounts #### Warning: This action will store the content on the chain in the history logs and the data cannot be deleted later so therefore should only store a unidentifiable hash of content rather than human readable content."
					}
				],
				"tables": [{
					"name": "dacs",
					"type": "dac",
					"index_type": "i64",
					"key_names": [],
					"key_types": []
				}],
				"ricardian_clauses": [{
						"id": "ENTIRE AGREEMENT",
						"body": "This contract contains the entire agreement of the parties, for all described actions, and there are no other promises or conditions in any other agreement whether oral or written concerning the subject matter of this Contract. This contract supersedes any prior written or oral agreements between the parties."
					},
					{
						"id": "BINDING CONSTITUTION",
						"body": "All the the action descibed in this contract are subject to the EOSDAC consitution as held at http://eosdac.io. This includes, but is not limited to membership terms and conditions, dispute resolution and severability."
					}
				],
				"variants": []
			}
			`;
			let result: string[] = [];
			before(async () => {
				const rawResult = await generateTypesFromString(rawABI, 'TestContractName');
				result = rawResult.split('\n');

				// Uncomment below to help debug tests
				// result.forEach((v, i) => {
				// 	console.log(i + ' ' + JSON.stringify(v));
				// });
			});

			it('should have the correct number of elements', async () => {
				assert.equal(result.length, 59);
			});
			it('should add file header constants', async () => {
				assert.equal(result[1], '// WARNING: GENERATED FILE');
			});
			it('should add Table Row type defs', async () => {
				assert.equal(result[9], 'export interface TestContractNameDac {');
				assert.equal(result[19], 'export interface TestContractNameExtendedSymbol {');
				assert.equal(result[20], '\tsymbol: string;');
			});

			it('should add Action type defs', async () => {
				assert.equal(result[49], 'export interface TestContractName extends Contract {');
				assert.equal(
					result[51],
					'\tregaccount(dac_id: string|number, account: string|number, type: number, options?: { from?: Account, auths?: ActorPermission[] }): Promise<any>;'
				);
			});
		});
	});

	context('type generation integration tests', function () {
		before(async function () {
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
	});
});
