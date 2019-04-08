import { Api, RpcError } from 'eosjs';
import * as ecc from 'eosjs-ecc';
import { Account } from './account';
import { EOSManager } from '../eosManager';
import { sleep } from '../cli/utils';

export const accountNameFromPublicKey = (publicKey: string) => hashToEOSName(ecc.sha256(publicKey));

interface DigitMap {
	[key: string]: string;
}

const digitMapping: DigitMap = {
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

export const untilBlockNumber = async (number: number) => {
	let { head_block_num } = await EOSManager.rpc.get_info();

	while (head_block_num < number) {
		// Assuming 500ms blocks
		await sleep((number - head_block_num) * 500);

		({ head_block_num } = await EOSManager.rpc.get_info());
	}
};
