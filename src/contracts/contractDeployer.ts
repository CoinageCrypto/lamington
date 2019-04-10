import * as path from 'path';
import { readFile as readFileCallback } from 'fs';
import { promisify } from 'util';
import { Serialize } from 'eosjs';

const readFile = promisify(readFileCallback);

import { Contract } from './contract';
import { Account, AccountManager } from '../accounts';
import { EOSManager } from '../eosManager';

export class ContractDeployer {
	public static async deployAtName<T extends Contract>(
		account: Account,
		contractIdentifier: string
	) {
		const buffer = new Serialize.SerialBuffer({
			textEncoder: EOSManager.api.textEncoder,
			textDecoder: EOSManager.api.textDecoder,
		});

		const abiPath = path.join('.lamington', 'compiled_contracts', `${contractIdentifier}.abi`);
		const wasmPath = path.join('.lamington', 'compiled_contracts', `${contractIdentifier}.wasm`);

		let abi = JSON.parse(await readFile(abiPath, 'utf8'));
		const wasm = await readFile(wasmPath);

		const abiDefinition = EOSManager.api.abiTypes.get(`abi_def`);

		// We need to make sure the abi has every field in abiDefinition.fields
		// otherwise serialize throws
		if (!abiDefinition)
			throw new Error('Could not retrieve abiDefinition from EOS API when flattening ABIs.');

		abi = abiDefinition.fields.reduce(
			(acc, { name: fieldName }) => Object.assign(acc, { [fieldName]: acc[fieldName] || [] }),
			abi
		);
		abiDefinition.serialize(buffer, abi);

		await EOSManager.transact({
			actions: [
				{
					account: 'eosio',
					name: 'setcode',
					authorization: account.active,
					data: {
						account: account.name,
						vmtype: 0,
						vmversion: 0,
						code: wasm.toString('hex'),
					},
				},
				{
					account: 'eosio',
					name: 'setabi',
					authorization: account.active,
					data: {
						account: account.name,
						abi: Buffer.from(buffer.asUint8Array()).toString(`hex`),
					},
				},
			],
		});

		return new Contract();
	}

	public static async deployClean<T extends Contract>(contractIdentifier: string) {
		const account = await AccountManager.createAccount();

		return await ContractDeployer.deployAtName<T>(account, contractIdentifier);
	}
}
