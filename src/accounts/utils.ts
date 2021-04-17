import * as ecc from 'eosjs-ecc';

// TODO: Extract type definitions
export type EosioAction = {
	account: string;
	name: string;
	authorization: { actor: string; permission: string }[];
	data: any;
};

/** Digit pattern expression */
const digitPattern = /[06789]/g;

/** Digit mapping lookup */
const digitMapping: { [key: string]: string } = {
	'0': '1',
	'6': '2',
	'7': '3',
	'8': '4',
	'9': '5',
};

/**
 * Generates an account name from the specified public key.
 * 
 * @param publicKey Valid EOSIO public key
 * @returns EOSIO account name
 */
export const accountNameFromPublicKey = (publicKey: string) => hashToEOSName(ecc.sha256(publicKey));

/**
 * Generates an account name from a hashed public key.
 * 
 * @returns EOSIO account name
 */
export const hashToEOSName = (data: string) =>
	`l${data
		.substring(0, 11)
		.replace(digitPattern, (match) => digitMapping[match])
		.toLowerCase()}`;