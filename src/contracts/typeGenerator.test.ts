import { assert } from 'chai';
import {
    mapParameterType
} from './typeGenerator';

const validTypes = ['string','bool','name']

const numberTypes = ['uint8','uint16','uint32','uint64','uint128','uint256'];

describe("type generator", () => {

    context('map paramater types', () => {

        it(`should map 'string' to 'string'`, () => {
            assert.equal(mapParameterType('string'), 'string', `'string' types should map to 'string'`)
        });

        it(`should map 'bool' to 'boolean'`, () => {
            assert.equal(mapParameterType('bool'), 'boolean');
        });

        context('eos types', () => {
            it(`should map 'name' to 'string|number'`, () => {
                assert.equal(mapParameterType('name'), 'string|number', `'name' type should map to 'string' or 'number'`)
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