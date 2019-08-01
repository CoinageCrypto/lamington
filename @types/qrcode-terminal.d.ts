declare module 'qrcode-terminal' {
	export interface GenerationCallback {
		(result: string): void;
	}

	export interface QRCodeGenerationOptions {
		small?: boolean;
	}

	export function generate(value: string, callback?: GenerationCallback): void;
	export function generate(
		value: string,
		options?: QRCodeGenerationOptions,
		callback?: GenerationCallback
	): void;

	export function setErrorLevel(errorLevel: string): void;
}
