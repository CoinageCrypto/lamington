import * as path from 'path';
import { readFile as readFileCallback } from 'fs';
import { promisify } from 'util';
import { Serialize } from 'eosjs';
import * as ecc from 'eosjs-ecc';

const readFile = promisify(readFileCallback);

import { Contract } from './contract';
import { Account, AccountManager } from '../accounts';
import { EOSManager } from '../eosManager';
import { ConfigManager } from '../configManager';
import { ContractLoader } from './contractLoader';

/**
 * Provides a set of methods to manage contract deployment
 */
export class ContractDeployer {
	/**
	 * Deploys contract files to a specified account
	 *
	 * ```typescript
	 * // Create a new account
	 * const account = await AccountManager.createAccount();
	 * // Deploy the contract `mycontract` to the account
	 * ContractDeployer.deployToAccount<MyContractTypeDef>('mycontract', account);
	 * ```
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @param contractIdentifier Contract identifier, typically the contract filename minus the extension
	 * @param account Account to apply contract code
	 * @returns Deployed contract instance
	 */
	public static async deployToAccount<T extends Contract>(
		contractIdentifier: string,
		account: Account
	) {
		// Initialize the serialization buffer
		const buffer = new Serialize.SerialBuffer({
			textEncoder: EOSManager.api.textEncoder,
			textDecoder: EOSManager.api.textDecoder,
		});
		// Construct resource paths
		const abiPath = path.join(
			ConfigManager.outDir,
			'compiled_contracts',
			`${contractIdentifier}.abi`
		);
		const wasmPath = path.join(
			ConfigManager.outDir,
			'compiled_contracts',
			`${contractIdentifier}.wasm`
		);
		// Read resources files for paths
		let abi = JSON.parse(await readFile(abiPath, 'utf8'));
		const wasm = await readFile(wasmPath);
		// Extract ABI types
		const abiDefinition = EOSManager.api.abiTypes.get(`abi_def`);
		// Validate ABI definitions returned
		if (!abiDefinition)
			throw new Error('Could not retrieve abiDefinition from EOS API when flattening ABIs.');
		// Ensure ABI contains all fields from `abiDefinition.fields`
		abi = abiDefinition.fields.reduce(
			(acc, { name: fieldName }) => Object.assign(acc, { [fieldName]: acc[fieldName] || [] }),
			abi
		);
		// Serialize ABI type definitions
		abiDefinition.serialize(buffer, abi);
		// Set the contract code for the account
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

		return await ContractLoader.at<T>(account);
	}

	/**
	 * Deploys contract files to a randomly generated account
	 *
	 * ```typescript
	 * // Deploy the contract with identifier
	 * ContractDeployer.deploy<MyContractTypeDef>('mycontract');
	 * ```
	 *
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @param contractIdentifier Contract identifier, typically the contract filename minus the extension
	 * @returns Deployed contract instance
	 */
	public static async deploy<T extends Contract>(contractIdentifier: string) {
		// Create a new account
		const account = await AccountManager.createAccount();
		// Call the deployToAccount method with the account
		return await ContractDeployer.deployToAccount<T>(contractIdentifier, account);
	}

	/**
	 * Deploys contract files to a specified account name
	 *
	 * ```typescript
	 * // Deploy the `mycontract` contract to the account with name `mycontractname`
	 * ContractDeployer.deployWithName<MyContractTypeDef>('mycontract', 'mycontractname');
	 * ```
	 *
	 * @note Generating a pseudorandom private key is not safe in the cryptographic sense. It can be used for testing.
	 * @author Mitch Pierias <github.com/MitchPierias>
	 * @param contractIdentifier Contract identifier, typically the contract filename minus the extension
	 * @param accountName Account name
	 * @returns Deployed contract instance
	 */
	public static async deployWithName<T extends Contract>(
		contractIdentifier: string,
		accountName: string
	) {
		// Generate a random private key
		const privateKey = await ecc.unsafeRandomKey();

		// Initialize account with name
		const account = new Account(accountName, privateKey);

		console.log('Created account:');
		console.log(`Name: ${accountName}`);
		console.log(`Private Key: ${privateKey}`);

		console.log('Setting up account');
		await AccountManager.setupAccount(account);

		console.log('Success');

		// Call the deployToAccount method with the account
		return await ContractDeployer.deployToAccount<T>(contractIdentifier, account);
	}
}
