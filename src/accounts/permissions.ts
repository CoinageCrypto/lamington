export interface Permissions {
	[permission: string]: {
		actor: string;
		permission: string;
	};
}
