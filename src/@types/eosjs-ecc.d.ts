declare module 'eosjs-ecc' {
	export function randomKey(): Promise<string>;
	export function unsafeRandomKey(): Promise<string>;
	export function privateToPublic(privateKey: string): string;
	export function sha256(data: string | Buffer): string;
}
