import { assert } from 'chai';
import { ContractDeployer, assertRowsEqual, AccountManager, Account } from 'lamington';
import { Example } from './example';

describe("Example", () => {

    let contract:Example;
    let user:Account;

    beforeEach(async () => {
        contract = await ContractDeployer.deploy<Example>("contracts/example/example");
        user = await AccountManager.createAccount();
    });

    it("Should initialize with account name", () => {
        return assert.isString(contract.account.name, "Contract name should be 'example'");
    });
    
    it("Should store a message", async () => {
        await contract.post(user.name, 'Test message', {from:user});
        assertRowsEqual(contract.getTableRows('messages'), [
            {
                id:0,
                body:'Test message',
                author:user.name
            }
        ]);
    });
})