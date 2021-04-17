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
 * Parses a C++ type definition into a Typescript definition.
 * 
 * @param eosType The type from the ABI we want to map over to a Typescript type
 * @param contractName (optional) The name of the contract to prefix the mapped type with if this is a contract struct type
 * @param contractStructs (optional) Structs in the contract used to match against, falling back to built in types if not found
 */
export const mapParameterType = ({
	eosType,
	contractName,
	contractStructs,
}: {
	eosType: string;
	contractName?: string;
	contractStructs?: any;
}) => {
	// Handle array types
	const wrapper = eosType.endsWith('[]') ? 'Array' : undefined;
	const parameterType = eosType.replace('[]', '');
	const type =
		contractStructs && contractName && contractStructs[parameterType]
			? pascalCase(contractName) + pascalCase(parameterType)
			: mapTypes[parameterType] || 'string';
	if (wrapper) {
		return `${wrapper}<${type}>`;
	} else {
		return type;
	}
};

// TODO: Document method
export const generateTypesFromString = async (
	rawABI: string,
	contractName: string
): Promise<string> => {
	const abi = JSON.parse(rawABI);
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
		'ExtendedAsset',
		'ExtendedSymbol',
		'ActorPermission',
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
				(field: any) => `${field.name}: ${mapParameterType({ contractName, eosType: field.type })};`
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
				`${parameter.name}: ${mapParameterType({
					contractName,
					contractStructs,
					eosType: parameter.type,
				})}`
		);
		// Optional parameter at the end on every contract method.
		parameters.push('options?: { from?: Account, auths?: ActorPermission[] }');

		return `${action.name}(${parameters.join(', ')}): Promise<any>;`;
	});
	// Generate tables
	const generatedTables = contractTables.map(
		(table: any) =>
			`${
				camelCase(table.name) + 'Table'
			}(options?: GetTableRowsOptions): Promise<TableRowsResult<${pascalCase(
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
	return flattenGeneratorLevels(result);
};

/**
 * Loads all `.abi` files and generates types.
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
 * Generates a Typescript definition file from a contract ABI file.
 * 
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
	const rawABI = fs.readFileSync(path.resolve(abiPath), 'utf8');

	const generaterLevels = await generateTypesFromString(rawABI, contractName);
	await saveInterface(contractIdentifier, generaterLevels);
};

// TODO: Document method
const flattenGeneratorLevels = (interfaceContent: GeneratorLevel): string => {
	let result = '';
	let indentLevel = 0;
	const write = (value: string) => (result += '\t'.repeat(indentLevel) + value + '\n');
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
	return result;
};

/**
 * Writes the contract interface to file.
 * 
 * @param contractIdentifier Path to file without extension
 * @param interfaceContent Generated contract interface as a string
 */
const saveInterface = async (contractIdentifier: string, interfaceContent: string) => {
	// Open a write stream to file
	const file = fs.createWriteStream(`${contractIdentifier}.ts`);

	file.write(interfaceContent, (error) => {
		if (error) {
			throw error;
		}
	});
	
	file.close();
};
