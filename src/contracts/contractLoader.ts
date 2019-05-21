import { Contract } from './contract';
import { Account } from '../accounts';
import { EOSManager } from '../eosManager';

/**
 * Provides a set of methods to create contract references for already existing contracts
 */
export class ContractLoader {
	/**
	 * Loads a contract instance for a contract which is already deployed to the blockchain.
	 *
	 * ```typescript
	 * ContractLoader.at<MyContractTypeDef>(myContractAccount);
	 *
	 * // or
	 *
	 * ContractLoader.at<MyContractTypeDef>('my.contract');
	 * ```
	 * @author Kevin Brown <github.com/thekevinbrown>
	 * @param accountOrName The account or account name where the contract is already deployed.
	 * @returns Contract instance
	 */
	public static async at<T extends Contract>(accountOrName: Account | string) {
		const account = accountOrName instanceof Account ? accountOrName : new Account(accountOrName);

		// Load the ABI from the blockchain.
		const { abi } = await EOSManager.rpc.get_abi(account.name);

		if (!abi) throw new Error(`Could not load ABI for contract at '${account.name}'.`);

		// Fetch the contract actions and types
		const { actions, types } = await EOSManager.api.getContract(account.name);

		// Return our newly deployed contract instance
		return new Contract({
			eos: EOSManager.api,
			account,
			abi,
			actions,
			types,
		}) as T;
	}
}
