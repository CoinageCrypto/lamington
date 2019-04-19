import { assert } from 'chai';
import {
    mapParameterType
} from './typeGenerator';

/**
 * Big Number Types
 * @desc Javascript only supports number, so CPP integer types need to be mapped accordingly
 */
const numberTypes = [
    'int8','int16','int32','int64','int128','int256',
    'uint8','uint16','uint32','uint64','uint128','uint256',
    'uint8_t','uint16_t','uint32_t','uint64_t','uint128_t','uint256_t'
];

/**
 * EOS Name Types
 * @desc Name types are typically a string or uint64_t and typically represent an identity on the EOS blockchain
 */
const stringNumberTypes = ['name','action_name','scope_name','account_name','permission_name','table_name'];

describe("type generator", () => {

    context('map paramater types', () => {

        it(`should map 'string' to 'string'`, () => {
            assert.equal(mapParameterType('string'), 'string', `'string' types should map to 'string'`)
        });

        it(`should map 'bool' to 'boolean'`, () => {
            assert.equal(mapParameterType('bool'), 'boolean');
        });

        context('eos types', () => {

            it(`should map name types to 'string|number'`, () => {
                stringNumberTypes.map(type =>
                    assert.equal(mapParameterType(type), 'string|number', `'${type}' type should map to 'string' or 'number'`))
            });

            it(`should map 'checksum' to 'string'`, () => {
                assert.equal(mapParameterType('checksum'), 'string', `'checksum' type should map to 'string'`)
            });
        });

        context('big numbers', () => {
            numberTypes.forEach(type => {
                it(`should map '${type}' to 'number'`, () => {
                    assert.equal(mapParameterType(type), 'number', `Integer type '${type}' should map to 'number'`);
                });
            });
        });

        context('complex types', () => {

            it(`should handle array types`, () => {
                assert.equal(mapParameterType('bool[]'), 'Array<boolean>');
            });
    
            xit(`should handle vector types`, () => {
                assert.equal(mapParameterType('vector<string>'), 'Array<string>');
            });
        });
    });
});