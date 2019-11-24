import { Api } from 'eosjs';
import { Account } from '@lamington/core';

export interface AccountCreationOptions {
	creator?: Account;
	eos?: Api;
}
