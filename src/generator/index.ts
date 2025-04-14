import type {
  ParsedSchema,
  ParsedModel,
  ParsedField,
  ParsedEnum,
} from "../parser/types";
import path from "node:path";
import fs from "node:fs/promises";
import type { DMMF } from "@prisma/generator-helper"; // Use type-only import for DMMF

// Configuration options for the generator (optional for now)
export interface GeneratorOptions {
  outputDir: string;
}

/**
 * Main function to generate the API code based on the parsed schema.
 *
 * @param parsedSchema The structured representation of the Prisma schema.
 * @param options Generator configuration options.
 */
export async function generateApi(
  parsedSchema: ParsedSchema,
  options: GeneratorOptions
): Promise<void> {
  console.log(
    `Starting API generation for ${parsedSchema.models.length} models...`
  );

  const outputDir = path.resolve(process.cwd(), options.outputDir);

  try {
    // Ensure base output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Output directory set to: ${outputDir}`);

    // Generate files for each model
    for (const model of parsedSchema.models) {
      const modelNameLower = model.name.toLowerCase();
      const modelDir = path.join(outputDir, modelNameLower); // Create dir per model

      // Ensure model directory exists
      await fs.mkdir(modelDir, { recursive: true });
      console.log(`- Processing model: ${model.name} -> ${modelDir}`);

      // Generate Zod schema
      console.log(`  - Generating Zod schema: ${modelNameLower}.schema.ts`);
      const zodSchemaContent = generateZodSchema(model, parsedSchema.enums);
      const schemaFilePath = path.join(modelDir, `${modelNameLower}.schema.ts`);
      await fs.writeFile(schemaFilePath, zodSchemaContent);

      // TODO: Generate routes file (e.g., {modelNameLower}.routes.ts)
      // TODO: Generate service file (e.g., {modelNameLower}.service.ts)
    }

    // TODO: Generate common files (e.g., main Hono app setup, Prisma client instance, shared types)

    console.log(
      `API generation completed successfully. Files written to ${outputDir}`
    );
  } catch (error) {
    console.error("Error during API generation:", error);
    throw new Error(
      `API generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Generates the Zod schema string for a given model.
 *
 * @param model The parsed model definition.
 * @param enums List of parsed enums (used to find names).
 * @returns A string containing the Zod schema definition.
 */
export function generateZodSchema(
  model: ParsedModel,
  enums: ParsedEnum[]
): string {
  const { name, fields } = model;
  const modelNameLower = name.toLowerCase();

  const usedEnumNames = new Set<string>();
  fields.forEach((field) => {
    if (field.kind === "enum" && field.enumName) {
      if (enums.some((e) => e.name === field.enumName)) {
        usedEnumNames.add(field.enumName);
      } else {
        console.warn(
          `Field ${model.name}.${field.name} refers to an enum ${field.enumName} not found in the schema's enums list.`
        );
      }
    }
  });

  // --- Generate import string without trailing newline ---
  const enumImportStatement =
    usedEnumNames.size > 0
      ? `import { ${[...usedEnumNames].join(", ")} } from '@prisma/client';`
      : null;

  const zodFields = fields
    .filter((field) => field.kind !== "object")
    .map((field) => {
      const zodType = mapFieldTypeToZodType(field, enums);
      let fieldDefinition = `  ${field.name}: ${zodType}`;
      if (!field.isRequired) {
        fieldDefinition += ".optional()";
      }
      return fieldDefinition;
    })
    .join(",\n");

  // --- Adjust template logic for optional import and spacing ---
  const schemaTemplate = `
import { z } from 'zod';
${enumImportStatement ? `${enumImportStatement}\n` : ""}
export const ${modelNameLower}Schema = z.object({
${zodFields}
});

export type ${name} = z.infer<typeof ${modelNameLower}Schema>;
`;

  return schemaTemplate;
}

/**
 * Maps a ParsedField to its corresponding Zod type string.
 *
 * @param field The parsed field definition.
 * @param enums List of parsed enums to resolve enum types (no longer needed here).
 * @returns The Zod type string (e.g., "z.string()", "z.nativeEnum(Enum_RoleName)").
 */
export function mapFieldTypeToZodType(
  field: ParsedField,
  _enums: ParsedEnum[] // Enums array no longer needed here
): string {
  // --- Handle list fields first ---
  if (field.isList) {
    // Create a temporary field representing the non-list type
    const singleField: ParsedField = { ...field, isList: false };
    // Recursively get the Zod type for the single item
    const singleType = mapFieldTypeToZodType(singleField, _enums);
    // Wrap it in z.array()
    return `z.array(${singleType})`;
  }

  // --- Handle Enums using z.nativeEnum ---
  if (field.kind === "enum") {
    // Use field.enumName which holds the actual Enum name (e.g., Enum_RoleName)
    if (field.enumName) {
      return `z.nativeEnum(${field.enumName})`; // Use z.nativeEnum
    } else {
      // This should ideally not happen if parser populates enumName correctly
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
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "date":
      return "z.date()";
    case "json":
      return "z.record(z.any())";
    // Relations are filtered out before calling this function
    // Enums are handled above by kind
    case "unsupported":
    default:
      console.warn(
        `Unsupported type ${field.type} for field ${field.name}. Falling back to z.any().`
      );
      return "z.any()";
  }
}
