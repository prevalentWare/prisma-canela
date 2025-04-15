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
 * Parses the Prisma schema file and returns a structured representation.
 *
 * @param schemaPath The path to the schema.prisma file.
 * @returns A promise that resolves to the parsed schema structure.
 * @throws If the schema file cannot be read or parsed.
 */
export const parsePrismaSchema = async (
  schemaPath: string = 'prisma/schema.prisma'
): Promise<ParsedSchema> => {
  const absoluteSchemaPath = path.resolve(process.cwd(), schemaPath);

  console.log(`Attempting to parse schema at: ${absoluteSchemaPath}`);

  try {
    const schemaContent = await fs.readFile(absoluteSchemaPath, 'utf-8');
    console.log('Successfully read schema file.');

    // --- Reverted to using datamodel key as per type definitions ---
    const dmmf: DMMF.Document = await getDMMF({
      datamodel: schemaContent,
    });
    console.log('Successfully generated DMMF from schema.');

    const parsedSchema: ParsedSchema = mapDmmfToParsedSchema(dmmf);

    return parsedSchema;
  } catch (error) {
    console.error(
      `Error parsing Prisma schema at ${absoluteSchemaPath}:`,
      error
    );
    throw new Error(
      `Failed to parse Prisma schema: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Maps the DMMF structure to the ParsedSchema interface.
 *
 * @param dmmf The DMMF document obtained from Prisma.
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
    relationInfo: relationInfo,
    // Default value details might not be needed if hasDefaultValue is sufficient
  };
};
