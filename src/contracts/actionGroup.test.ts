import { assert } from 'chai';
import { ActionGroup } from './actionGroup';
import { Example } from '../../contracts/example/example';
import { ContractDeployer } from './contractDeployer';

describe('action group', function() {
	context('run() static method', function() {
		it(`should work for a simple case`, async function() {
			const example = await ContractDeployer.deploy<Example>('contracts/example/example');
			await ActionGroup.run(async () => {
				await example.post('account1', 'test 1');
				await example.post('account2', 'test 2');
			});
		});
	});
});
