import { EOSManager } from './eosManager';

export const untilBlockNumber = async (number: number) => {
	let { head_block_num } = await EOSManager.rpc.get_info();

	while (head_block_num < number) {
		// Assuming 500ms blocks
		await sleep((number - head_block_num) * 500);

		({ head_block_num } = await EOSManager.rpc.get_info());
	}
};

export const sleep = async (delayInMs: number) =>
	new Promise(resolve => setTimeout(resolve, delayInMs));
