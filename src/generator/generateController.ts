import type { ParsedModel } from "../parser/types";
import type { Context } from "hono";
import { Prisma } from "@prisma/client"; // Import Prisma for error types
import { pascalCase } from "../utils/pascalCase";
import { camelCase } from "../utils/camelCase";
import type { ServiceFunctionNames, ZodSchemaDetails } from "./types";

/**
 * Generates the content for a controller file (controller.ts).
 *
 * This file contains the request handlers (controller functions) that:
 * 1. Validate request input (params, body) using Zod schemas (via route middleware).
 * 2. Call the corresponding service functions.
 * 3. Format the JSON response (data, status codes).
 * 4. Handle errors (e.g., Prisma not found, validation, generic).
 *
 * @param model The parsed model definition.
 * @param zodSchemaInfo Details about the generated Zod schemas (needed for type hints).
 * @param serviceNames Details about the generated service function names.
 * @returns The generated TypeScript code for the controller file as a string.
 */
export function generateControllerFileContent(
  model: ParsedModel,
  zodSchemaInfo: ZodSchemaDetails,
  serviceNames: ServiceFunctionNames
): string {
  const modelNamePascal = pascalCase(model.name);
  const modelNameCamel = camelCase(model.name); // Keep for potential future use, though prisma accessor is in service
  const idField = model.fields.find((f) => f.isId);
  const idType = idField?.type === "number" ? "number" : "string"; // Based on simplified FieldType
  // idFieldName is not strictly needed here as validation/extraction uses generic 'id' or 'json' keys

  // --- Generate Imports ---
  // Note: We import Zod types mainly for type inference assistance in handlers,
  // actual validation is expected to happen in the route definition.
  const imports = `
import type { Context } from 'hono';
import { Prisma } from '@prisma/client'; // For error handling
// Import types inferred from Zod schemas for strong typing in handlers
import type { ${modelNamePascal} as ${modelNamePascal}Type } from '@prisma/client'; // Import the actual Prisma type
import type { z } from 'zod';
import type { ${zodSchemaInfo.createSchemaName}, ${
    zodSchemaInfo.updateSchemaName
  } } from './schema';

// Define types based on Zod schemas for handler inputs
type CreateInput = z.infer<typeof ${zodSchemaInfo.createSchemaName}>;
type UpdateInput = z.infer<typeof ${zodSchemaInfo.updateSchemaName}>;

// Import service functions
import {
  ${serviceNames.findMany},
  ${idField ? `${serviceNames.findById},` : ""}
  ${serviceNames.create},
  ${idField ? `${serviceNames.update},` : ""}
  ${idField ? serviceNames.delete : ""}
} from './service';
`;

  // --- Generate Handler Functions ---
  let handlers = "";

  // Handler for GET /
  handlers += `
/**
 * Handles listing all ${modelNamePascal} records.
 */
export const list${modelNamePascal} = async (c: Context): Promise<Response> => {
  try {
    const items = await ${serviceNames.findMany}();
    return c.json(items);
  } catch (error: unknown) { // Use unknown for better type safety
    console.error(\`Error listing ${modelNamePascal}s:\`, error);
    // Consider a more structured error response
    return c.json({ error: 'Failed to list items', details: (error instanceof Error ? error.message : 'Unknown error') }, 500);
  }
};
`;

  // Handler for POST /
  handlers += `
/**
 * Handles creating a new ${modelNamePascal} record.
 */
export const create${modelNamePascal} = async (c: Context): Promise<Response> => {
  // Type assertion is okay here because the route middleware did the validation
  const data = c.req.valid('json') as CreateInput;
  try {
    const newItem = await ${serviceNames.create}(data);
    return c.json(newItem, 201); // 201 Created
  } catch (error: unknown) {
    console.error(\`Error creating ${modelNamePascal}:\`, error);
    return c.json({ error: 'Failed to create item', details: (error instanceof Error ? error.message : 'Unknown error') }, 500);
  }
};
`;

  // Add handlers requiring ID only if idField exists
  if (idField) {
    // Handler for GET /:id
    handlers += `
/**
 * Handles retrieving a ${modelNamePascal} by ID.
 */
export const get${modelNamePascal}ById = async (c: Context): Promise<Response> => {
  // Type assertion okay due to route validation
  const id = c.req.valid('param').id as ${idType};
  try {
    const item = await ${serviceNames.findById}(id);
    if (!item) {
      return c.json({ error: '${modelNamePascal} not found' }, 404);
    }
    return c.json(item);
  } catch (error: unknown) {
    console.error(\`Error fetching ${modelNamePascal} by ID \${id}:\`, error);
    return c.json({ error: 'Failed to fetch item', details: (error instanceof Error ? error.message : 'Unknown error') }, 500);
  }
};
`;

    // Handler for PATCH /:id
    handlers += `
/**
 * Handles updating a ${modelNamePascal} by ID.
 */
export const update${modelNamePascal} = async (c: Context): Promise<Response> => {
  const id = c.req.valid('param').id as ${idType};
  const data = c.req.valid('json') as UpdateInput;
  try {
    // The service function should handle the 'not found' case if using update directly
    const updatedItem = await ${serviceNames.update}(id, data);
    return c.json(updatedItem);
  } catch (error: unknown) {
    // Check specifically for Prisma's 'Record to update not found' error
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return c.json({ error: '${modelNamePascal} not found' }, 404);
    }
    console.error(\`Error updating ${modelNamePascal} \${id}:\`, error);
    return c.json({ error: 'Failed to update item', details: (error instanceof Error ? error.message : 'Unknown error') }, 500);
  }
};
`;

    // Handler for DELETE /:id
    handlers += `
/**
 * Handles deleting a ${modelNamePascal} by ID.
 */
export const delete${modelNamePascal} = async (c: Context): Promise<Response> => {
  const id = c.req.valid('param').id as ${idType};
  try {
    // The service function should handle the 'not found' case if using delete directly
    const deletedItem = await ${serviceNames.delete}(id);
    // Return the deleted item or just a success status (e.g., 204 No Content)
    // Returning the item is often useful.
    return c.json(deletedItem);
    // return c.body(null, 204); // Alternative: return 204 No Content
  } catch (error: unknown) {
     // Check specifically for Prisma's 'Record to delete not found' error
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
       return c.json({ error: '${modelNamePascal} not found' }, 404);
    }
    console.error(\`Error deleting ${modelNamePascal} \${id}:\`, error);
    return c.json({ error: 'Failed to delete item', details: (error instanceof Error ? error.message : 'Unknown error') }, 500);
  }
};
`;
  }

  return imports + handlers;
}
