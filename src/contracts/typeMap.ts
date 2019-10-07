/**
 * Type Mappings
 * @note I've kept this as a TypeScript file and not JSON cause I wasn't sure if we could
 * // do some kind of fancy auto compiling from a TypeScript interface definition to
 * // JSON object type map?
 */

export interface ExtendedSymbol {
	contract: string;
	symbol: string;
}

export interface ExtendedAsset {
	contract: string;
	quantity: string;
}

const types: { [key: string]: string } = {
	string: 'string',
	bool: 'boolean',
	name: 'string|number',
	action_name: 'string|number',
	scope_name: 'string|number',
	account_name: 'string|number',
	permission_name: 'string|number',
	table_name: 'string|number',
	checksum: 'string',
	checksum256: 'string',
	extended_symbol: 'ExtendedSymbol',
	extended_asset: 'ExtendedAsset',
	time_point_sec: 'Date',
	int8: 'number',
	int16: 'number',
	int32: 'number',
	int64: 'number',
	int128: 'number',
	int256: 'number',
	uint8: 'number',
	uint16: 'number',
	uint32: 'number',
	uint64: 'number',
	uint128: 'number',
	uint256: 'number',
	uint8_t: 'number',
	uint16_t: 'number',
	uint32_t: 'number',
	uint64_t: 'number',
	uint128_t: 'number',
	uint256_t: 'number',
};

export default types;
