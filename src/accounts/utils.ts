import * as ecc from 'eosjs-ecc';

export const accountNameFromPublicKey = (publicKey: string) => hashToEOSName(ecc.sha256(publicKey));

const digitMapping: { [key: string]: string } = {
	'0': '1',
	'6': '2',
	'7': '3',
	'8': '4',
	'9': '5',
};

const digitPattern = /[06789]/g;

export const hashToEOSName = (data: string) =>
	`l${data
		.substring(0, 11)
		.replace(digitPattern, match => digitMapping[match])
		.toLowerCase()}`;
