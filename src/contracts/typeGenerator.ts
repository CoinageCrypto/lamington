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
	const wrapper = eosType.endsWith('[]') ? 'Array' : undefined;
	let type;

	switch (eosType.replace('[]', '')) {
		case 'bool':
			type = 'boolean';
			break;
		default:
			type = 'string';
			break;
	}

	if (wrapper) {
		return `${wrapper}<${type}>`;
	} else {
		return type;
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

	const contractName = path.basename(contractIdentifier);
	const abiPath = path.join('.lamington', 'compiled_contracts', `${contractIdentifier}.abi`);
	const abi = JSON.parse(fs.readFileSync(path.resolve(abiPath), 'utf8'));
	let contractActions = abi.actions;
	let contractTables = abi.tables;
	let contractStructs = Object.assign(
		{},
		...abi.structs.map((struct: any) => ({ [struct['name']]: struct }))
	);

	const result: GeneratorLevel = [
		'// =====================================================',
		'// WARNING: GENERATED FILE',
		'//',
		'// Any changes you make will be overwritten by Lamington',
		'// =====================================================',
		'',
	];

	// Imports
	const imports = ['Account', 'Contract'];
	if (contractTables.length > 0) imports.push('TableRowsResult');

	result.push(`import { ${imports.join(', ')} } from 'lamington';`);
	result.push('');
	result.push('// Table row types');

	// Generate table row types from ABI
	for (const table of contractTables) {
		const tableInterface = {
			[`export interface ${pascalCase(contractName)}${pascalCase(table.name)}`]: contractStructs[
				table.type
			].fields.map((field: any) => `${field.name}: ${mapParameterType(field.type)};`),
		};

		result.push(tableInterface);
		result.push('');
	}

	// Generate contract type from ABI
	const generatedContractActions = contractActions.map((action: any) => {
		// With a function for each action
		const parameters = contractStructs[action.name].fields.map(
			(parameter: any) => `${parameter.name}: ${mapParameterType(parameter.type)}`
		);

		// Optional parameter at the end on every contract method.
		parameters.push('options?: { from?: Account }');

		return `${action.name}(${parameters.join(', ')}): Promise<any>;`;
	});

	const generatedTables = contractTables.map(
		(table: any) =>
			`${table.name}(scope?: string): Promise<TableRowsResult<${pascalCase(
				contractName
			)}${pascalCase(table.name)}>>;`
	);

	const contractInterface = {
		[`export interface ${pascalCase(contractName)} extends Contract`]: [
			'// Actions',
			...generatedContractActions,
			'',
			'// Tables',
			...generatedTables,
		],
	};

	result.push(contractInterface);
	result.push('');

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
