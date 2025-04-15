import { getDMMF } from '@prisma/internals';
import type { DMMF } from '@prisma/generator-helper';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ParsedSchema,
  ParsedModel,
  ParsedEnum,
  ParsedField,
  FieldType,
  ParsedRelationInfo,
} from './types';

/**
 * Finds the Prisma schema by checking common locations.
 * First looks for a schema file, then fallbacks to a schema directory.
 *
 * @returns Path to the schema file or directory
 * @throws If no schema can be found
 */
export const findPrismaSchema = async (): Promise<string> => {
  const cwd = process.cwd();
  const possibleLocations = [
    path.join(cwd, 'prisma', 'schema.prisma'), // Standard location
    path.join(cwd, 'schema.prisma'), // Root location
  ];

  // Check for package.json config
  try {
    const packageJsonPath = path.join(cwd, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (packageJson.prisma?.schema) {
      // Add the package.json specified location as first priority
      possibleLocations.unshift(path.resolve(cwd, packageJson.prisma.schema));
    }
  } catch {
    // If package.json doesn't exist or can't be parsed, continue with defaults
    console.log('No schema location found in package.json, using defaults.');
  }

  // Check each location
  for (const location of possibleLocations) {
    try {
      await fs.access(location);
      console.log(`Found Prisma schema at: ${location}`);
      return location;
    } catch {
      // Location doesn't exist, try next
    }
  }

  // If no file is found, check for schema directory
  const schemaDir = path.join(cwd, 'prisma', 'schema');
  try {
    const stats = await fs.stat(schemaDir);
    if (stats.isDirectory()) {
      // Check if directory contains .prisma files
      const files = await fs.readdir(schemaDir);
      if (files.some((file) => file.endsWith('.prisma'))) {
        console.log(`Found Prisma schema directory at: ${schemaDir}`);
        return schemaDir;
      }
    }
  } catch {
    // Schema directory doesn't exist or isn't accessible
  }

  throw new Error(
    'No Prisma schema found. Expected prisma/schema.prisma file or prisma/schema directory.'
  );
};

/**
 * Parses the Prisma schema and returns a structured representation.
 * Supports both single schema file and directory of schema files.
 *
 * @param schemaPath Optional path to the schema file or directory. If not provided, common locations will be checked.
 * @returns A promise that resolves to the parsed schema structure.
 * @throws If the schema file cannot be read or parsed.
 */
export const parsePrismaSchema = async (
  schemaPath?: string
): Promise<ParsedSchema> => {
  try {
    // If no path provided, find schema automatically
    const resolvedSchemaPath = schemaPath
      ? path.resolve(process.cwd(), schemaPath)
      : await findPrismaSchema();

    console.log(`Attempting to parse schema at: ${resolvedSchemaPath}`);

    try {
      // Check if path is a directory or file
      const stats = await fs.stat(resolvedSchemaPath);

      if (stats.isDirectory()) {
        // Handle directory with multiple schema files
        return await parsePrismaSchemaFolder(resolvedSchemaPath);
      } else {
        // Handle single schema file
        return await parseSingleSchemaFile(resolvedSchemaPath);
      }
    } catch {
      // If fs.stat fails (likely in tests with mocked fs),
      // fall back to old behavior and try to read as a file
      return await parseSingleSchemaFile(resolvedSchemaPath);
    }
  } catch (error) {
    console.error(`Error parsing Prisma schema:`, error);
    throw new Error(
      `Failed to parse Prisma schema: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Parses a single Prisma schema file.
 *
 * @param filePath Path to the schema file
 * @returns The parsed schema
 */
export const parseSingleSchemaFile = async (
  filePath: string
): Promise<ParsedSchema> => {
  const schemaContent = await fs.readFile(filePath, 'utf-8');
  console.log('Successfully read schema file.');

  // Parse schema content using DMMF
  const dmmf: DMMF.Document = await getDMMF({
    datamodel: schemaContent,
  });
  console.log('Successfully generated DMMF from schema.');

  return mapDmmfToParsedSchema(dmmf);
};

/**
 * Parses a directory of Prisma schema files.
 *
 * @param directoryPath Path to the directory containing schema files
 * @returns The parsed schema
 * @throws If no schema files are found or if required blocks are missing
 */
export const parsePrismaSchemaFolder = async (
  directoryPath: string
): Promise<ParsedSchema> => {
  console.log(`Processing schema directory: ${directoryPath}`);

  // Read all files in the directory
  const files = await fs.readdir(directoryPath);

  // Filter to only .prisma files
  const schemaFiles = files.filter((file) => {
    // Handle both string and Dirent objects
    const fileName =
      typeof file === 'string' ? file : (file as { name: string }).name;
    return fileName.endsWith('.prisma');
  });

  if (schemaFiles.length === 0) {
    throw new Error(`No .prisma files found in directory: ${directoryPath}`);
  }

  console.log(
    `Found ${schemaFiles.length} schema files: ${schemaFiles.join(', ')}`
  );

  // Read and concatenate all schema files
  let combinedSchema = '';
  for (const file of schemaFiles) {
    const fileName =
      typeof file === 'string' ? file : (file as { name: string }).name;
    const filePath = path.join(directoryPath, fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    combinedSchema += `\n${content}\n`;
  }

  // Verify that the combined schema has required elements
  if (!combinedSchema.includes('datasource')) {
    throw new Error('Combined schema is missing required "datasource" block');
  }

  if (!combinedSchema.includes('generator')) {
    throw new Error('Combined schema is missing required "generator" block');
  }

  console.log('Successfully combined schema files.');

  // Parse the combined schema content
  const dmmf: DMMF.Document = await getDMMF({
    datamodel: combinedSchema,
  });
  console.log('Successfully generated DMMF from combined schema.');

  return mapDmmfToParsedSchema(dmmf);
};

/**
 * Maps the DMMF structure to our simplified ParsedSchema structure.
 *
 * @param dmmf The DMMF document from prisma/internals.
 * @returns The structured representation of the schema.
 */
export const mapDmmfToParsedSchema = (dmmf: DMMF.Document): ParsedSchema => {
  console.log('Mapping DMMF to ParsedSchema...');

  const parsedEnums: ParsedEnum[] = dmmf.datamodel.enums.map(
    (enumType: DMMF.DatamodelEnum) => ({
      name: enumType.name,
      values: enumType.values.map((v: DMMF.EnumValue) => v.name),
    })
  );

  console.log(`Mapped ${parsedEnums.length} enums.`);

  const parsedModels: ParsedModel[] = dmmf.datamodel.models.map(
    (model: DMMF.Model) => ({
      name: model.name,
      dbName: model.dbName ?? null,
      fields: model.fields.map((field) => mapDmmfFieldToParsedField(field)),
    })
  );

  console.log(`Mapped ${parsedModels.length} models (basic info).`);

  const parsedSchema: ParsedSchema = {
    models: parsedModels,
    enums: parsedEnums,
  };

  console.log('Finished mapping DMMF.');
  return parsedSchema;
};

/**
 * Maps Prisma DMMF field types to simplified FieldType categories.
 *
 * @param prismaType The DMMF field type string.
 * @param kind The DMMF field kind ('scalar', 'enum', 'object').
 * @returns The corresponding FieldType.
 */
// This function has high complexity due to the many different Prisma types that need to be mapped
// eslint-disable-next-line complexity
export const mapPrismaTypeToFieldType = (
  prismaType: string,
  kind: DMMF.FieldKind
): FieldType => {
  if (kind === 'object') {
    return 'relation';
  }
  if (kind === 'enum') {
    return 'enum';
  }

  // Handle scalar types
  switch (prismaType) {
    case 'String':
    case 'UUID':
    case 'Char':
    case 'Text':
    case 'VarChar':
      return 'string';
    case 'Int':
    case 'BigInt':
    case 'Float':
    case 'Decimal':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'DateTime':
    case 'Date':
    case 'Time':
      return 'date';
    case 'Json':
      return 'json';
    case 'Bytes': // Consider how to handle Bytes - maybe unsupported or specific type?
      // For now, map to unsupported
      return 'unsupported';
    default:
      console.warn(`Unsupported Prisma scalar type: ${prismaType}`);
      return 'unsupported';
  }
};

/**
 * Maps a DMMF field to a ParsedField structure.
 *
 * @param field The DMMF field object.
 * @returns The corresponding ParsedField.
 */
export const mapDmmfFieldToParsedField = (field: DMMF.Field): ParsedField => {
  const relationInfo: ParsedRelationInfo | undefined =
    field.kind === 'object' && field.relationName
      ? {
          relatedModelName: field.type,
          relationName: field.relationName,
          // Relation details like fields, references, onDelete, onUpdate are likely not needed
        }
      : undefined;

  return {
    name: field.name,
    type: mapPrismaTypeToFieldType(field.type, field.kind),
    kind: field.kind,
    enumName: field.kind === 'enum' ? field.type : undefined,
    isList: field.isList,
    isRequired: field.isRequired,
    isUnique: field.isUnique,
    isId: field.isId,
    hasDefaultValue: field.hasDefaultValue,
    isUpdatedAt: field.isUpdatedAt || false,
    relationInfo: relationInfo,
    // Default value details might not be needed if hasDefaultValue is sufficient
  };
};
