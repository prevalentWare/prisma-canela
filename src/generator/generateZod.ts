import type { ParsedModel, ParsedField, ParsedEnum } from "../parser/types";
import { pascalCase } from "../utils/pascalCase";
import { camelCase } from "../utils/camelCase";

/**
 * Generates the Zod schema string for a given model.
 *
 * @param model The parsed model definition.
 * @param enums List of parsed enums (used to find names).
 * @returns An object containing the schema content string and any required imports.
 */
export function generateZodSchema(
  model: ParsedModel,
  enums: ParsedEnum[]
): { content: string; imports: string[] } {
  // Return content and imports
  const { name, fields } = model;
  const modelNamePascal = pascalCase(name); // Use pascalCase for schema names
  const modelNameCamel = camelCase(name);

  const requiredImports: string[] = []; // Track required imports

  const usedEnumNames = new Set<string>();
  fields.forEach((field) => {
    if (field.kind === "enum" && field.enumName) {
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
      ? `import { ${[...usedEnumNames].join(", ")} } from '@prisma/client';` // Assume enums are available from @prisma/client
      : null;
  if (enumImportStatement) {
    requiredImports.push(enumImportStatement);
  }

  // Generate fields for the main model schema (matches Prisma model structure)
  const zodFields = fields
    .filter((field) => field.kind !== "object") // Exclude relation fields
    .map((field) => {
      const zodType = mapFieldTypeToZodType(field);
      let fieldDefinition = `  ${field.name}: ${zodType}`;
      // Handle optionality based on Prisma schema (`?`) and ID field status
      if (!field.isRequired && !field.isId) {
        fieldDefinition += ".optional().nullable()"; // Allow optional and null for non-required, non-ID fields
      } else if (field.isId && !field.isRequired) {
        // Note: This case (optional ID) is unusual but technically possible in some DBs
        // Adjust as needed based on expected schema patterns. Defaulting to required for ID.
        console.warn(
          `Field ${model.name}.${field.name} is an optional ID, which might be unexpected. Treating as required in base schema.`
        );
      }

      // Add common refinements based on field name or type (example: email)
      if (
        field.type === "string" &&
        field.name.toLowerCase().includes("email")
      ) {
        fieldDefinition += '.email({ message: "Invalid email format" })';
      }
      // TODO: Add more refinements based on Prisma attributes (e.g., @length, @url) if needed

      return fieldDefinition;
    })
    .join(",\n");

  // Generate fields for the create schema (omit ID, createdAt, updatedAt, fields with defaults)
  const createZodFields = fields
    .filter(
      (field) =>
        field.kind !== "object" &&
        !field.isId &&
        !field.hasDefaultValue && // Fields with defaults are usually handled by Prisma
        field.name !== "createdAt" && // Often managed by DB or ORM
        field.name !== "updatedAt" // Often managed by DB or ORM
    )
    .map((field) => {
      const zodType = mapFieldTypeToZodType(field);
      let fieldDefinition = `  ${field.name}: ${zodType}`;
      // Only make non-required fields optional in create schema
      if (!field.isRequired) {
        fieldDefinition += ".optional().nullable()";
      }
      // Add refinements (e.g., email)
      if (
        field.type === "string" &&
        field.name.toLowerCase().includes("email")
      ) {
        fieldDefinition += '.email({ message: "Invalid email format" })';
      }
      return fieldDefinition;
    })
    .join(",\n");

  // Generate fields for the update schema (all fields optional, omit ID)
  const updateZodFields = fields
    .filter(
      (field) =>
        field.kind !== "object" &&
        !field.isId &&
        field.name !== "createdAt" &&
        field.name !== "updatedAt"
    ) // Exclude ID and timestamps
    .map((field) => {
      const zodType = mapFieldTypeToZodType(field);
      // Make all fields optional and nullable for PATCH updates
      let fieldDefinition = `  ${field.name}: ${zodType}.optional().nullable()`;
      // Add refinements (e.g., email)
      if (
        field.type === "string" &&
        field.name.toLowerCase().includes("email")
      ) {
        fieldDefinition += '.email({ message: "Invalid email format" })';
      }
      return fieldDefinition;
    })
    .join(",\n");

  const schemaContent = `
import { z } from 'zod';
${requiredImports.length > 0 ? requiredImports.join("\n") + "\n" : ""}
// Base schema for ${modelNamePascal} (matches Prisma model structure)
export const ${modelNamePascal}Schema = z.object({
${zodFields}
});

// Schema for creating a ${modelNamePascal} (omit ID, defaults, timestamps)
export const create${modelNamePascal}Schema = z.object({
${createZodFields}
});

// Schema for updating a ${modelNamePascal} (all fields optional, omit ID, timestamps)
export const update${modelNamePascal}Schema = z.object({
${updateZodFields}
});

// Infer the TypeScript type from the base schema
export type ${modelNamePascal} = z.infer<typeof ${modelNamePascal}Schema>;
`;

  return { content: schemaContent.trim(), imports: requiredImports };
}

/**
 * Maps a ParsedField to its corresponding Zod type string.
 * Non-exported helper function.
 *
 * @param field The parsed field definition.
 * @returns The Zod type string (e.g., "z.string()", "z.nativeEnum(Role)").
 */
function mapFieldTypeToZodType(field: ParsedField): string {
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
  if (field.kind === "enum") {
    // Use field.enumName which holds the actual Enum name (e.g., Role)
    if (field.enumName) {
      // Assuming the enum name from DMMF matches the exported enum name from @prisma/client
      return `z.nativeEnum(${field.enumName})`;
    } else {
      // This should ideally not happen if the parser populates enumName correctly
      console.warn(
        `Enum field ${field.name} is missing enumName. Falling back to z.string().`
      );
      return "z.string()";
    }
  }

  // Handle scalar types based on our simplified field.type
  switch (field.type) {
    case "string":
      return "z.string()";
    case "number":
      // Add refinements like .int() based on original Prisma type if needed (e.g., field.nativeType)
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "date":
      // Use coerce.date() for flexibility with date strings/objects
      return "z.coerce.date()";
    case "json":
      // Allow any valid JSON structure
      return "z.record(z.any())"; // Or use z.unknown() or a more specific structure if possible
    // Relations are filtered out before calling the parent function
    // Enums are handled above by kind
    case "unsupported":
    default:
      console.warn(
        `Unsupported type "${field.type}" for field "${field.name}". Falling back to z.any(). Consider updating the parser or generator.`
      );
      return "z.any()";
  }
}
