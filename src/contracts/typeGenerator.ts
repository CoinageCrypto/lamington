import * as globWithCallbacks from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import mapTypes from './typeMap';
import { ConfigManager } from '../configManager';
import { pascalCase, camelCase } from './utils';

const glob = promisify(globWithCallbacks);

type IndentedGeneratorLevel = { [key: string]: Array<string> | IndentedGeneratorLevel };
type GeneratorLevel = Array<string | IndentedGeneratorLevel>;

/**
 * Parses a C++ type definition into a Typescript definition
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param eosType
 */
export const mapParameterType = (contractName: string, contractStructs: any, eosType: string) => {
	// Handle array types
	const wrapper = eosType.endsWith('[]') ? 'Array' : undefined;
	const parameterType = eosType.replace('[]', '');
	const type = contractStructs[parameterType]
		? pascalCase(contractName) + pascalCase(parameterType)
		: mapTypes[parameterType] || 'string';
	if (wrapper) {
		return `${wrapper}<${type}>`;
	} else {
		return type;
	}
};

/**
 * Loads all `.abi` files and generates types
 * @author Kevin Brown <github.com/thekevinbrown>
 */
export const generateAllTypes = async () => {
	// Load all `.abi` files
	const files = await glob('**/*.abi');
	// Handle no files found
	if (files.length === 0) throw new Error('No ABI files to generate from. Exiting.');
	// Generate types for each file
	for (const file of files) await generateTypes(file);
};

/**
 * Generates a Typescript definition file from a contract ABI file
 * @author Kevin Brown <github.com/thekevinbrown>
 * @author Mitch Pierias <github.com/MitchPierias>
 * @param contractIdentifier Path to file without extension
 */
export const generateTypes = async (contractIdentifier: string) => {
	// Create contract details
	const contractName = path.basename(contractIdentifier);
	const abiPath = path.join(
		ConfigManager.outDir,
		'compiled_contracts',
		`${contractIdentifier}.abi`
	);
	// Handle ABI file loading
	if (!fs.existsSync(path.resolve(abiPath)))
		throw new Error(`Missing ABI file at path '${path.resolve(abiPath)}'`);
	const abi = JSON.parse(fs.readFileSync(path.resolve(abiPath), 'utf8'));
	let contractActions = abi.actions;
	let contractTables = abi.tables;
	let contractStructs = Object.assign(
		{},
		...abi.structs.map((struct: any) => ({ [struct['name']]: struct }))
	);

	// console.log('tables: ' + JSON.stringify(contractTables));
	// console.log('structs: ' + JSON.stringify(contractStructs));
	// Prepend warning text
	const result: GeneratorLevel = [
		'// =====================================================',
		'// WARNING: GENERATED FILE',
		'//',
		'// Any changes you make will be overwritten by Lamington',
		'// =====================================================',
		'',
	];
	// Define imports
	const imports = [
		'Account',
		'Contract',
		'GetTableRowsOptions',
		'ActorPermission',
		'ExtendedAsset',
		'ExtendedSymbol',
	];
	if (contractTables.length > 0) imports.push('TableRowsResult');
	// Generate import definitions
	result.push(`import { ${imports.join(', ')} } from 'lamington';`);
	result.push('');
	result.push('// Table row types');
	// Generate structs from ABI
	for (const key in contractStructs) {
		const structInterface = {
			[`export interface ${pascalCase(contractName)}${pascalCase(key)}`]: contractStructs[
				key
			].fields.map(
				(field: any) => `${field.name}: ${mapParameterType(contractName, {}, field.type)};`
			),
		};

		result.push(structInterface);
		result.push('');
	}
	// Generate contract type from ABI
	const generatedContractActions = contractActions.map((action: any) => {
		// With a function for each action
		const parameters = contractStructs[action.name].fields.map(
			(parameter: any) =>
				`${parameter.name}: ${mapParameterType(contractName, contractStructs, parameter.type)}`
		);
		// Optional parameter at the end on every contract method.
		parameters.push('options?: { from?: Account, auths?: ActorPermission[] }');

		return `${action.name}(${parameters.join(', ')}): Promise<any>;`;
	});
	// Generate tables
	const generatedTables = contractTables.map(
		(table: any) =>
			`${camelCase(table.name) +
				'Table'}(options?: GetTableRowsOptions): Promise<TableRowsResult<${pascalCase(
				contractName
			)}${pascalCase(table.type)}>>;`
	);
	// Generate the contract interface with actions and tables
	const contractInterface = {
		[`export interface ${pascalCase(contractName)} extends Contract`]: [
			'// Actions',
			...generatedContractActions,
			'',
			'// Tables',
			...generatedTables,
		],
	};
	// Cache contract result
	result.push(contractInterface);
	result.push('');
	// Save generated contract
	await saveInterface(contractIdentifier, result);
};

/**
 * Writes the contract interface to file
 * @author Kevin Brown <github.com/thekevinbrown>
 * @param contractIdentifier Path to file without extension
 * @param interfaceContent Generated contract interface
 */
const saveInterface = async (
	contractIdentifier: string,
	interfaceContent: GeneratorLevel | IndentedGeneratorLevel
) => {
	// Open a write stream to file
	const file = fs.createWriteStream(`${contractIdentifier}.ts`);
	// Write formatted blocks
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
	// Write block content or indent again
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
	// Write interface to file and close
	writeLevel(interfaceContent);
	file.close();
};
