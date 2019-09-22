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
export const mapParameterType = (eosType: string) => {
	// Handle array types
	const type = mapTypes[eosType.replace('[]', '')] || 'string';
	// Handle array types
	if (eosType.endsWith('[]'))
		return `${type}[]`;
	return type;
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
	const imports = ['Account', 'Contract', 'GetTableRowsOptions'];
	if (contractTables.length > 0) imports.push('TableRowsResult');
	// Generate import definitions
	result.push(`import { ${imports.join(', ')} } from '@lamington/core';`);
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
	// Generate tables
	const generatedTables = contractTables.map(
		(table: any) =>
			`${camelCase(
				table.name
			)}(options?: GetTableRowsOptions): Promise<TableRowsResult<${pascalCase(
				contractName
			)}${pascalCase(table.name)}>>;`
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
