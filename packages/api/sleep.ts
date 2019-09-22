import { EOSManager } from '@lamington/core';

/**
 * Pauses the current process until the specified EOS block number occurs
 * @note Assumes blocks will always be produced every 500ms
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param number Process sleep duration
 */
export const untilBlocknumber = async (number: number) => {
	// Loops until current head block number reaches desired
	let { head_block_num } = await EOSManager.rpc.get_info();
	while (head_block_num < number) {
		// Sleep for block duration and update current block number
		await sleep((number - head_block_num) * 500);
		({ head_block_num } = await EOSManager.rpc.get_info());
	}
};

/**
 * Pauses the current process for the specified duration
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param delayInMs Process sleep duration
 */
export const sleep = async (delayInMs: number) =>
	new Promise(resolve => setTimeout(resolve, delayInMs));

/**
 * Pauses the current process for the 500ms EOS block time
 * @note The process will wake during and not on the next block
 * @author Kevin Brown <github.com/thekevinbrown>
 */
export const nextBlock = () => sleep(500);
