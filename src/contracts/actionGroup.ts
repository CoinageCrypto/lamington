import { Account } from '../accounts/account';
import { AccountManager } from '../accounts';
import { EOSManager } from '../eosManager';
import { Api } from 'eosjs';

interface Action {
	account: string;
	name: string;
	authorization: {
		actor: string;
		permission: string;
	}[];
	data: {
		[key: string]: any;
	};
}

interface ActionGroupOptions {
	name?: string;
	eos?: Api;
	debug?: boolean;
}

export class ActionGroup {
	/** @hidden active action groups are stored here. When an action group is finished off with .send() it
	 * ceases to be active. You can have multiple active action groups which nest, but each can only be sent
	 * with a single authorization.
	 */
	private static activeActionGroups: Array<ActionGroup> = [];

	/** The current action group or undefined if there are no action groups which have been opened */
	public static get activeGroup() {
		return ActionGroup.activeActionGroups[ActionGroup.activeActionGroups.length - 1];
	}

	/** A convenience method to create and run an action group */
	public static async run(callback: () => any) {
		const group = new ActionGroup();
		await callback();
		return await group.send();
	}

	private _name: string;
	private _eos?: Api;
	private _debug: boolean;
	private _actions: Array<Action> = [];

	/** The constructor adds this action group as the active action group. Optionally you can supply a name to help trace the code later if you like. */
	constructor(options?: ActionGroupOptions) {
		this._name = (options && options.name) || 'Unnamed Action Group';
		this._eos = options && options.eos;
		this._debug = (options && options.debug) || false;

		ActionGroup.activeActionGroups.push(this);
	}

	/** It's normally not required to call this directly, but it adds an action to the group so it can be sent later. */
	public readonly addAction = (action: Action) => {
		if (ActionGroup.activeGroup !== this) {
			throw new Error(
				`You can't explicitly add actions to the action group named "${
					this._name
				}" while it's not active. You're probably calling addAction() yourself when you don't need to.`
			);
		}

		this._actions.push(action);
	};

	/** This function sends the action group to the EOS network as a single transaction.
	 * @param signingAccounts Optional signingAccounts to be added to the signature provider before sending the action group off. You only need to supply these if you're signing with an authority that you haven't used before now.
	 */
	public readonly send = () =>
		EOSManager.transact(
			{
				actions: this._actions,
			},
			this._eos,
			{ debug: this._debug }
		);
}
