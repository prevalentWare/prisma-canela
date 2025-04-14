import type { ParsedModel } from "../parser/types";
import { pascalCase } from "../utils/pascalCase";
import { camelCase } from "../utils/camelCase";

/**
 * Generates the content for a model-specific service file (service.ts).
 * This file contains functions that interact with Prisma Client for CRUD operations.
 *
 * @param model The parsed model definition.
 * @param prismaClientImportPath Optional path for Prisma Client import.
 * @returns The generated TypeScript code for the service file as a string.
 */
export function generateServiceFileContent(
  model: ParsedModel,
  prismaClientImportPath: string = "@prisma/client"
): string {
  const modelNamePascal = pascalCase(model.name);
  const modelNameCamel = camelCase(model.name);
  const idField = model.fields.find((f) => f.isId);

  // Determine the TS type for the ID based on Prisma type (Int -> number, others -> string)
  // Default to 'string' if no ID field exists, though it won't be used in that case.
  const idType = idField?.type === "number" ? "number" : "string";
  // Get the actual name of the ID field (e.g., 'id', 'uuid') for where clauses.
  const idFieldName = idField?.name ?? "id"; // Default to 'id' as a fallback, though unlikely needed if !idField

  // Determine the correct Prisma model accessor (usually camelCase)
  const prismaModelAccessor = modelNameCamel;

  // --- Generate Import Statements ---
  const imports = `
import { PrismaClient, ${model.name} as ${modelNamePascal}Type } from '${prismaClientImportPath}';
// Import input types from Zod schemas (adjust path if necessary)
import { create${modelNamePascal}Schema, update${modelNamePascal}Schema } from './schema';
import { z } from 'zod';

// TODO: Initialize Prisma Client properly (e.g., using a singleton or dependency injection)
const prisma = new PrismaClient();

// Define types inferred from Zod schemas for input validation
type Create${modelNamePascal}Input = z.infer<typeof create${modelNamePascal}Schema>;
type Update${modelNamePascal}Input = z.infer<typeof update${modelNamePascal}Schema>;
`;

  // --- Generate Core Service Functions (FindMany, Create) ---
  // These are typically always needed, regardless of whether an ID field exists.
  let functions = `
/**
 * Finds multiple ${modelNamePascal} records.
 * @returns A promise resolving to an array of ${modelNamePascal} records.
 */
export async function findMany${modelNamePascal}(): Promise<${modelNamePascal}Type[]> {
  try {
    return await prisma.${prismaModelAccessor}.findMany();
  } catch (error) {
    console.error('Error fetching ${modelNamePascal}s:', error);
    // TODO: Implement more specific error handling and logging
    throw new Error('Could not fetch ${modelNamePascal}s');
  }
}

/**
 * Creates a new ${modelNamePascal} record.
 * @param data The data for the new ${modelNamePascal}.
 * @returns A promise resolving to the created ${modelNamePascal} record.
 */
export async function create${modelNamePascal}(data: Create${modelNamePascal}Input): Promise<${modelNamePascal}Type> {
  try {
    // Input data is assumed to be validated by Zod schema in the route handler
    return await prisma.${prismaModelAccessor}.create({ data });
  } catch (error) {
    console.error('Error creating ${modelNamePascal}:', error);
    // TODO: Implement more specific error handling and logging
    throw new Error('Could not create ${modelNamePascal}');
  }
}
`;

  // --- Generate ID-Based Service Functions (FindById, Update, Delete) ---
  // Only add these functions if the model has a defined ID field.
  if (idField) {
    functions += `
/**
 * Finds a single ${modelNamePascal} record by its ID.
 * @param id The ID of the ${modelNamePascal} to find.
 * @returns A promise resolving to the ${modelNamePascal} record or null if not found.
 */
export async function find${modelNamePascal}ById(id: ${idType}): Promise<${modelNamePascal}Type | null> {
  try {
    return await prisma.${prismaModelAccessor}.findUnique({
      where: { ${idFieldName}: id },
    });
  } catch (error) {
    console.error(\`Error fetching ${modelNamePascal} by ID \${id}:\`, error);
    // TODO: Implement more specific error handling and logging
    throw new Error('Could not fetch ${modelNamePascal} by ID');
  }
}

/**
 * Updates a ${modelNamePascal} record by its ID.
 * @param id The ID of the ${modelNamePascal} to update.
 * @param data The data to update the ${modelNamePascal} with.
 * @returns A promise resolving to the updated ${modelNamePascal} record.
 */
export async function update${modelNamePascal}(id: ${idType}, data: Update${modelNamePascal}Input): Promise<${modelNamePascal}Type> {
  try {
    // Input data is assumed to be validated by Zod schema in the route handler
    return await prisma.${prismaModelAccessor}.update({
      where: { ${idFieldName}: id },
      data,
    });
  } catch (error) {
    // TODO: Differentiate between Prisma's P2025 error (Record not found) and other errors
    console.error(\`Error updating ${modelNamePascal} \${id}:\`, error);
    // TODO: Implement more specific error handling and logging
    throw new Error('Could not update ${modelNamePascal}');
  }
}

/**
 * Deletes a ${modelNamePascal} record by its ID.
 * @param id The ID of the ${modelNamePascal} to delete.
 * @returns A promise resolving to the deleted ${modelNamePascal} record.
 */
export async function delete${modelNamePascal}(id: ${idType}): Promise<${modelNamePascal}Type> {
  try {
    return await prisma.${prismaModelAccessor}.delete({
      where: { ${idFieldName}: id },
    });
  } catch (error) {
    // TODO: Differentiate between Prisma's P2025 error (Record not found) and other errors
    console.error(\`Error deleting ${modelNamePascal} \${id}:\`, error);
    // TODO: Implement more specific error handling and logging
    throw new Error('Could not delete ${modelNamePascal}');
  }
}
`;
  }

  return imports + functions;
}
