import * as globWithCallbacks from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const glob = promisify(globWithCallbacks);

const pascalCase = (value: string) => {
	const snakePattern = /[_.]+./g;
	const upperFirst = value[0].toUpperCase() + value.slice(1);
	return upperFirst.replace(snakePattern, match => match[match.length - 1].toUpperCase());
};

type IndentedGeneratorLevel = { [key: string]: Array<string> | IndentedGeneratorLevel };
type GeneratorLevel = Array<string | IndentedGeneratorLevel>;

// Everything is a string right now.
const mapParameterType = (eosType: string) => {
	switch (eosType) {
		case 'bool':
			return 'boolean';
		default:
			return 'string';
	}
};

export const generateAllTypes = async () => {
	// Make sure there are files to even generate from.
	const files = await glob('**/*.abi');

	if (files.length === 0) {
		throw new Error('No ABI files to generate from. Exiting.');
	}

	for (const file of files) {
		await generateTypes(file);
	}
};

export const generateTypes = async (contractIdentifier: string) => {
	console.log(`Generating types for ${contractIdentifier}`);

	const result: GeneratorLevel = [
		'// =====================================================',
		'// WARNING: GENERATED FILE',
		'//',
		'// Any changes you make will be overwritten by Lamington',
		'// =====================================================',
		'',
		`import { Account, Contract } from 'lamington';`,
		'',
	];

	const contractName = path.basename(contractIdentifier);
	const abiPath = path.join('.lamington', 'compiled_contracts', `${contractIdentifier}.abi`);
	const abi = JSON.parse(fs.readFileSync(path.resolve(abiPath), 'utf8'));
	let contractActions = abi.actions;
	let contractTables = abi.tables;
	let contractStructs = Object.assign(
		{},
		...abi.structs.map((struct: any) => ({ [struct['name']]: struct }))
	);

	// Generate table row types from ABI
	for (const table of contractTables) {
		const tableInterface = {
			[`export interface ${pascalCase(contractName)}${pascalCase(table.name)}`]: contractStructs[
				table.type
			].fields.map((field: any) => `${field.name}: ${mapParameterType(field.type)}`),
		};

		result.push(tableInterface);
	}

	// Generate the types of the function arguments for each function.
	for (const action of contractActions) {
		if (contractStructs[action.name].fields.length > 0) {
			const paramInterface = {
				[`export interface ${pascalCase(contractName)}${pascalCase(
					action.name
				)}Params`]: contractStructs[action.name].fields.map(
					(parameter: any) => `${parameter.name}: ${mapParameterType(parameter.type)}`
				),
			};

			result.push(paramInterface);
			result.push('');
		}
	}

	// Generate contract type from ABI
	const contractInterface = {
		[`export interface ${pascalCase(contractName)} extends Contract`]: contractActions.map(
			(action: any) => {
				if (contractStructs[action.name].fields.length > 0) {
					return `${action.name}(params: ${pascalCase(contractName)}${pascalCase(
						action.name
					)}Params, options?: { from?: Account }): Promise<any>`;
				} else {
					return `${action.name}(options?: { from?: Account }): Promise<any>`;
				}
			}
		),
	};

	result.push(contractInterface);

	await saveInterface(contractIdentifier, result);
};

const saveInterface = async (
	contractIdentifier: string,
	contract: GeneratorLevel | IndentedGeneratorLevel
) => {
	const file = fs.createWriteStream(`${contractIdentifier}.ts`);

	let indentLevel = 0;
	const write = (value: string) => file.write('\t'.repeat(indentLevel) + value + '\n');
	const writeIndented = (level: IndentedGeneratorLevel) => {
		for (const outerWrapper of Object.keys(level)) {
			write(`${outerWrapper} {`);

			indentLevel++;
			writeLevel(level[outerWrapper]);
			indentLevel--;

			write('}');
		}
	};
	const writeLevel = (level: GeneratorLevel | IndentedGeneratorLevel) => {
		if (Array.isArray(level)) {
			for (const entry of level) {
				if (typeof entry === 'string') {
					write(entry);
				} else {
					writeIndented(entry);
				}
			}
		} else {
			writeIndented(level);
		}
	};

	writeLevel(contract);

	file.close();
};
