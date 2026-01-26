import type { ParsedModel, ParsedField, ParsedEnum } from '@parser/types';
import { pascalCase } from '@utils/pascalCase';
import { camelCase } from '@utils/camelCase';
import { getPrismaPath } from './getPrismaPath';

/**
 * Generates the Zod schema string for a given model.
 *
 * @param model The parsed model definition.
 * @param enums List of parsed enums (used to find names).
 * @returns An object containing the schema content string and any required imports.
 */
export const generateZodSchema = async (
  model: ParsedModel,
  enums: ParsedEnum[]
): Promise<{ content: string; imports: string[] }> => {
  // Get the Prisma client path
  const prismaClientPath = await getPrismaPath();

  // Return content and imports
  const { name, fields } = model;
  const modelNamePascal = pascalCase(name); // Use pascalCase for schema names
  const _modelNameCamel = camelCase(name);

  const requiredImports: string[] = []; // Track required imports

  const usedEnumNames = new Set<string>();
  fields.forEach((field) => {
    if (field.kind === 'enum' && field.enumName) {
      // Ensure the enum name exists in the parsed enums list
      if (enums.some((e) => e.name === field.enumName)) {
        usedEnumNames.add(field.enumName);
      } else {
        console.warn(
          `Field ${model.name}.${field.name} refers to an enum ${field.enumName} not found in the schema's enums list.`
        );
      }
    }
  });

  // Generate enum import statement if needed
  const enumImportStatement =
    usedEnumNames.size > 0
      ? `import { ${[...usedEnumNames].join(', ')} } from '${prismaClientPath}';` // Assume enums are available from @prisma/client
      : null;
  if (enumImportStatement) {
    requiredImports.push(enumImportStatement);
  }

  // Generate fields for the main model schema (matches Prisma model structure)
  const zodFields = fields
    .filter((field) => field.kind !== 'object') // Exclude relation fields
    .map((field) => {
      const zodType = mapFieldTypeToZodType(field);
      let fieldDefinition = `  ${field.name}: ${zodType}`;

      // Add common refinements based on field name or type (example: email)
      if (
        field.type === 'string' &&
        field.name.toLowerCase().includes('email')
      ) {
        fieldDefinition += '.email({ message: "Invalid email format" })';
      }
      // TODO: Add more refinements based on Prisma attributes (e.g., @length, @url) if needed

      // Handle optionality based on Prisma schema (`?`) and ID field status
      if (!field.isRequired && !field.isId) {
        fieldDefinition += '.optional().nullable()'; // Allow optional and null for non-required, non-ID fields
      } else if (field.isId && !field.isRequired) {
        // Note: This case (optional ID) is unusual but technically possible in some DBs
        // Adjust as needed based on expected schema patterns. Defaulting to required for ID.
        console.warn(
          `Field ${model.name}.${field.name} is an optional ID, which might be unexpected. Treating as required in base schema.`
        );
      }

      return fieldDefinition;
    })
    .join(',\n');

  // --- Generate Create Schema ---
  const fieldsToOmitOnCreate: string[] = [];
  model.fields.forEach((field) => {
    // Omit fields with default values or updatedAt directive
    if (field.hasDefaultValue || field.isUpdatedAt) {
      fieldsToOmitOnCreate.push(`"${field.name}"`);
    }
  });
  const createSchemaOmit =
    fieldsToOmitOnCreate.length > 0
      ? `.omit({ ${fieldsToOmitOnCreate.join(': true, ')}: true })`
      : '';

  // --- Generate Update Schema ---
  // Update schema: partial, omit ID and updatedAt fields
  const fieldsToOmitOnUpdate: string[] = [];
  model.fields.forEach((field) => {
    if (field.isId || field.isUpdatedAt) {
      fieldsToOmitOnUpdate.push(`"${field.name}"`);
    }
  });
  const updateSchemaOmit =
    fieldsToOmitOnUpdate.length > 0
      ? `.omit({ ${fieldsToOmitOnUpdate.join(': true, ')}: true })`
      : '';

  // --- Assemble Schema Content ---
  const schemaContent = `
import { z } from 'zod';
${requiredImports.length > 0 ? requiredImports.join('\n') + '\n' : ''}
// Base schema for ${modelNamePascal} (matches Prisma model structure)
export const ${modelNamePascal}Schema = z.object({
${zodFields}
});

// Schema for creating a ${modelNamePascal}
// Based on the base schema, omitting generated fields.
export const create${modelNamePascal}Schema = ${modelNamePascal}Schema${createSchemaOmit};

// Schema for updating a ${modelNamePascal}
// Based on the base schema, making all fields optional and omitting generated fields.
export const update${modelNamePascal}Schema = ${modelNamePascal}Schema.partial()${updateSchemaOmit};
`;

  return { content: schemaContent.trim(), imports: requiredImports };
};

/**
 * Maps a ParsedField to its corresponding Zod type string.
 * Non-exported helper function.
 *
 * @param field The parsed field definition.
 * @returns The Zod type string (e.g., "z.string()", "z.nativeEnum(Role)").
 */
export const mapFieldTypeToZodType = (field: ParsedField): string => {
  // --- Handle list fields first ---
  if (field.isList) {
    // Create a temporary field representing the non-list type
    const singleField: ParsedField = { ...field, isList: false };
    // Recursively get the Zod type for the single item
    const singleType = mapFieldTypeToZodType(singleField);
    // Wrap it in z.array()
    return `z.array(${singleType})`;
  }

  // --- Handle Enums using z.nativeEnum ---
  if (field.kind === 'enum') {
    // Use field.enumName which holds the actual Enum name (e.g., Role)
    if (field.enumName) {
      // Assuming the enum name from DMMF matches the exported enum name from @prisma/client
      return `z.nativeEnum(${field.enumName})`;
    } else {
      // This should ideally not happen if the parser populates enumName correctly
      console.warn(
        `Enum field ${field.name} is missing enumName. Falling back to z.string().`
      );
      return 'z.string()';
    }
  }

  // Handle scalar types based on our simplified field.type
  switch (field.type) {
    case 'string':
      return 'z.string()';
    case 'number':
      // Add refinements like .int() based on original Prisma type if needed (e.g., field.nativeType)
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'date':
      // Use coerce.date() for flexibility with date strings/objects
      return 'z.coerce.date()';
    case 'json':
      // JSON fields in Prisma can be any valid JSON value (objects, arrays, primitives)
      // Using z.unknown() instead of z.any() for better TypeScript inference:
      // - z.any() results in 'any' type which TypeScript may treat as optional
      // - z.unknown() properly enforces the field as required when not marked optional
      // This ensures compatibility with Prisma's InputJsonValue type
      return 'z.unknown()';
    // Relations are filtered out before calling the parent function
    // Enums are handled above by kind
    case 'unsupported':
    default:
      console.warn(
        `Unsupported type "${field.type}" for field "${field.name}". Falling back to z.any(). Consider updating the parser or generator.`
      );
      return 'z.any()';
  }
};
