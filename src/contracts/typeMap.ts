/**
 * Type Mappings
 * @note I've kept this as a TypeScript file and not JSON cause I wasn't sure if we could
 * // do some kind of fancy auto compiling from a TypeScript interface definition to
 * // JSON object type map?
 */

interface TypeMapping {
    [key:string]:string
}

const types:TypeMapping = {
    'string':'string',
    'bool':'boolean',
    'name':'string|number',
    'int8':'number',
    'int16':'number',
    'int32':'number',
    'int64':'number',
    'int128':'number',
    'int256':'number',
    'uint8':'number',
    'uint16':'number',
    'uint32':'number',
    'uint64':'number',
    'uint128':'number',
    'uint256':'number',
    'uint8_t':'number',
    'uint16_t':'number',
    'uint32_t':'number',
    'uint64_t':'number',
    'uint128_t':'number',
    'uint256_t':'number'
}

export default types;