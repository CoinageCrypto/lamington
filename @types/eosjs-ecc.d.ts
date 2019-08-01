declare module 'eosjs-ecc' {
	export function randomKey(): Promise<string>;
	export function unsafeRandomKey(): Promise<string>;
	export function privateToPublic(privateKey: string): string;
	export function sha256(data: string | Buffer): string;
	export function isValidPublic(key: string | Buffer, prefix: string): boolean;
	export function isValidPrivate(key: string | Buffer): boolean;
}
