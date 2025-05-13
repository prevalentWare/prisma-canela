import type { ParsedModel } from '@parser/types';
import { pascalCase } from '@utils/pascalCase';
import { camelCase } from '@utils/camelCase';
import { getPrismaPath } from './getPrismaPath';

/**
 * Generates the content for a model-specific service file (service.ts).
 * This file contains functions that interact with Prisma Client for CRUD operations,
 * extracting the client from the Hono context.
 *
 * @param model The parsed model definition.
 * @param prismaClientImportPath Optional path for Prisma Client import.
 * @returns The generated TypeScript code for the service file as a string.
 */
export const generateServiceFileContent = async (
  model: ParsedModel,
  prismaClientImportPath?: string
): Promise<string> => {
  // Use provided import path or get it from schema
  const clientPath = prismaClientImportPath || (await getPrismaPath());

  const modelNamePascal = pascalCase(model.name);
  const modelNameCamel = camelCase(model.name);
  const idField = model.fields.find((f) => f.isId);

  // Determine the TS type for the ID based on Prisma type (Int -> number, others -> string)
  // Default to 'string' if no ID field exists, though it won't be used in that case.
  const idType = idField?.type === 'number' ? 'number' : 'string';
  // Get the actual name of the ID field (e.g., 'id', 'uuid') for where clauses.
  const idFieldName = idField?.name ?? 'id'; // Default to 'id' as a fallback, though unlikely needed if !idField

  // Determine the correct Prisma model accessor (usually camelCase)
  const prismaModelAccessor = modelNameCamel;

  // --- Generate Import Statements ---
  const imports = `
import type { PrismaClient } from '${clientPath}';
// We need to import the actual model type separately when verbatimModuleSyntax is true
import type { ${model.name} as ${modelNamePascal}Type } from '${clientPath}';
// Import input types from Zod schemas (adjust path if necessary)
import { create${modelNamePascal}Schema, update${modelNamePascal}Schema } from './schema';
import { z } from 'zod';
import type { Context } from 'hono';

// Define types inferred from Zod schemas for input validation
type Create${modelNamePascal}Input = z.infer<typeof create${modelNamePascal}Schema>;
type Update${modelNamePascal}Input = z.infer<typeof update${modelNamePascal}Schema>;

/**
 * Helper function to extract Prisma client from context with error handling
 */
const getPrismaClient = (c: Context): PrismaClient => {
  const prisma = c.get('prisma');
  if (!prisma) {
    throw new Error('Prisma client not found in context. Make sure to use the prismaMiddleware.');
  }
  return prisma;
};
`;

  // --- Generate Core Service Functions (FindMany, Create) ---
  // These are typically always needed, regardless of whether an ID field exists.
  let functions = `
/**
 * Finds multiple ${modelNamePascal} records.
 * @param c The Hono context containing the Prisma client.
 * @returns A promise resolving to an array of ${modelNamePascal} records.
 */
export const findMany${modelNamePascal} = async (c: Context): Promise<${modelNamePascal}Type[]> => {
  try {
    const prisma = getPrismaClient(c);
    return await prisma.${prismaModelAccessor}.findMany();
  } catch (error) {
    console.error('Error fetching ${modelNamePascal}s:', error);
    // TODO: Implement more specific error handling and logging
    throw new Error('Could not fetch ${modelNamePascal}s');
  }
};

/**
 * Creates a new ${modelNamePascal} record.
 * @param c The Hono context containing the Prisma client.
 * @param data The data for the new ${modelNamePascal}.
 * @returns A promise resolving to the created ${modelNamePascal} record.
 */
export const create${modelNamePascal} = async (
  c: Context, 
  data: Create${modelNamePascal}Input
): Promise<${modelNamePascal}Type> => {
  try {
    const prisma = getPrismaClient(c);
    // Input data is assumed to be validated by Zod schema in the route handler
    return await prisma.${prismaModelAccessor}.create({ data });
  } catch (error) {
    console.error('Error creating ${modelNamePascal}:', error);
    // TODO: Implement more specific error handling and logging
    throw new Error('Could not create ${modelNamePascal}');
  }
};
`;

  // --- Generate ID-Based Service Functions (FindById, Update, Delete) ---
  // Only add these functions if the model has a defined ID field.
  if (idField) {
    functions += `
/**
 * Finds a single ${modelNamePascal} record by its ID.
 * @param c The Hono context containing the Prisma client.
 * @param id The ID of the ${modelNamePascal} to find.
 * @returns A promise resolving to the ${modelNamePascal} record or null if not found.
 */
export const find${modelNamePascal}ById = async (
  c: Context, 
  id: ${idType}
): Promise<${modelNamePascal}Type | null> => {
  try {
    const prisma = getPrismaClient(c);
    return await prisma.${prismaModelAccessor}.findUnique({
      where: { ${idFieldName}: id },
    });
  } catch (error) {
    console.error(\`Error fetching ${modelNamePascal} by ID \${id}:\`, error);
    // TODO: Implement more specific error handling and logging
    throw new Error('Could not fetch ${modelNamePascal} by ID');
  }
};

/**
 * Updates a ${modelNamePascal} record by its ID.
 * @param c The Hono context containing the Prisma client.
 * @param id The ID of the ${modelNamePascal} to update.
 * @param data The data to update the ${modelNamePascal} with.
 * @returns A promise resolving to the updated ${modelNamePascal} record.
 */
export const update${modelNamePascal} = async (
  c: Context, 
  id: ${idType}, 
  data: Update${modelNamePascal}Input
): Promise<${modelNamePascal}Type> => {
  try {
    const prisma = getPrismaClient(c);
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
};

/**
 * Deletes a ${modelNamePascal} record by its ID.
 * @param c The Hono context containing the Prisma client.
 * @param id The ID of the ${modelNamePascal} to delete.
 * @returns A promise resolving to the deleted ${modelNamePascal} record.
 */
export const delete${modelNamePascal} = async (
  c: Context, 
  id: ${idType}
): Promise<${modelNamePascal}Type> => {
  try {
    const prisma = getPrismaClient(c);
    return await prisma.${prismaModelAccessor}.delete({
      where: { ${idFieldName}: id },
    });
  } catch (error) {
    // TODO: Differentiate between Prisma's P2025 error (Record not found) and other errors
    console.error(\`Error deleting ${modelNamePascal} \${id}:\`, error);
    // TODO: Implement more specific error handling and logging
    throw new Error('Could not delete ${modelNamePascal}');
  }
};
`;
  }

  return imports + functions;
};
