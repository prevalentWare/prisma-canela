import type { ParsedModel } from '../parser/types';
import type { Context } from 'hono';
import { Prisma } from '@prisma/client'; // Import Prisma namespace
import { pascalCase } from '../utils/pascalCase';
// import { camelCase } from "../utils/camelCase"; // Not strictly needed here anymore
import type { ServiceFunctionNames, ZodSchemaDetails } from './types';

// Helper function to generate controller imports
export const generateControllerImports = (
  model: ParsedModel,
  zodSchemaInfo: ZodSchemaDetails
): string => {
  const modelNamePascal = pascalCase(model.name);

  // Remove Zod and schema imports, as they are not used in the controller
  const zodImports = '';

  // Add validator utility function to safely cast validation results
  const utilityFunctions = `
// Helper to safely cast validation results - this avoids TypeScript errors with c.req.valid()
const getValidData = (c: Context, type: 'json' | 'param') => {
  // @ts-ignore - The Hono validation is properly set up by middleware, but TypeScript doesn't recognize it
  return c.req.valid(type);
};`;

  // Import service functions using namespace
  const serviceImports = `import * as service from './service';`;

  return `
import type { Context } from 'hono';
import { Prisma } from '@prisma/client';
${zodImports}
${utilityFunctions}
${serviceImports}
`;
};

// Helper function to generate handler logic
export const generateHandler = (
  modelNamePascal: string,
  handlerName: string, // e.g., listUser, createUserById
  serviceFunctionName: string, // e.g., findManyUsers, findUserById
  successStatusCode: number = 200,
  requiresId: boolean = false,
  requiresBody: boolean = false,
  idType: string = 'string' // Default, only used if requiresId is true
): string => {
  // No need for complex Context typing - we'll use the utility function
  const contextType = 'Context';

  // Determine how to access validated data
  const paramValidation = requiresId
    ? `const { id } = getValidData(c, 'param');`
    : '';
  const jsonValidation = requiresBody
    ? `const data = getValidData(c, 'json');`
    : '';

  // Determine arguments for service call with context as first parameter
  const args = ['c']; // Always pass context first
  if (requiresId) args.push('id');
  if (requiresBody) args.push('data');
  const serviceCallArgs = args.join(', ');

  const logId = requiresId ? ' ${id}' : '';
  const isIdNotFoundCheck = requiresId && !handlerName.startsWith('list'); // Check for P2025 on ID routes

  // Specific check for findById returning null
  const getByIdNotFound = handlerName.startsWith('get')
    ? `\n    if (!item) {\n      return c.json({ error: '${modelNamePascal} not found' }, 404);\n    }`
    : '';

  // Generate a natural language comment for the handler
  let comment = '';
  if (handlerName.startsWith('list')) {
    comment = `List all ${modelNamePascal} records.`;
  } else if (handlerName.startsWith('create')) {
    comment = `Create a new ${modelNamePascal}.`;
  } else if (handlerName.startsWith('get')) {
    comment = `Get a ${modelNamePascal} by ID.`;
  } else if (handlerName.startsWith('update')) {
    comment = `Update a ${modelNamePascal} by ID.`;
  } else if (handlerName.startsWith('delete')) {
    comment = `Delete a ${modelNamePascal} by ID.`;
  } else {
    comment = `${handlerName} for ${modelNamePascal}.`;
  }

  // Use the input generic in the handler signature
  // Only include paramValidation and jsonValidation if they are non-empty
  const validationLines = [paramValidation, jsonValidation]
    .filter(Boolean)
    .join('\n  ');

  return `
/**
 * ${comment}
 */
export const ${handlerName} = async (c: ${contextType}) => {
  ${validationLines}
  try {
    const item = await service.${serviceFunctionName}(${serviceCallArgs}); // Pass context first, then other args
    ${getByIdNotFound}
    // Always return status code explicitly for better type matching with openapi()
    return c.json(item, ${successStatusCode});
  } catch (error: unknown) {${
    isIdNotFoundCheck
      ? `\n    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {\n      // Use the specific ID in the error message if available\n      const message = \`Error ${handlerName
          .replace(/([A-Z])/g, ' $1')
          .toLowerCase()}ing ${modelNamePascal}${logId}: Record not found\`;
      console.error(message, error);\n      return c.json({ error: '${modelNamePascal} not found' }, 404);\n    }`
      : ''
  }
    // Check for Prisma client not found in context
    if (error instanceof Error && error.message.includes('Prisma client not found in context')) {
      console.error('Prisma client not found in context. Make sure to use the prismaMiddleware.');
      return c.json({ error: 'Database connection error. Please try again later.' }, 500);
    }
    
    // Generic error handling for other cases
    const message = \`Error ${handlerName
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()}ing ${modelNamePascal}${logId}: \${error instanceof Error ? error.message : 'Unknown error'}\`;
    console.error(message, error); // Log the detailed error
    return c.json({ error: \`Failed to ${handlerName
      .split(/(?=[A-Z])/)[0]
      .toLowerCase()} ${modelNamePascal}\` }, 500);
  }
};
`;
};

/**
 * Generates the content for a controller file (controller.ts).
 */
export const generateControllerFileContent = (
  model: ParsedModel,
  zodSchemaInfo: ZodSchemaDetails,
  serviceNames: ServiceFunctionNames
): string => {
  const modelNamePascal = pascalCase(model.name);
  const idField = model.fields.find((f) => f.isId);
  const idType = idField?.type === 'number' ? 'number' : 'string';

  const imports = generateControllerImports(model, zodSchemaInfo);

  let handlers = '';

  // List
  handlers += generateHandler(
    modelNamePascal,
    `list${modelNamePascal}`,
    serviceNames.findMany,
    200,
    false, // requiresId
    false // requiresBody
  );

  // Create
  handlers += generateHandler(
    modelNamePascal,
    `create${modelNamePascal}`,
    serviceNames.create,
    201,
    false, // requiresId
    true // requiresBody
  );

  // ID-based routes
  if (idField) {
    // Get By ID
    handlers += generateHandler(
      modelNamePascal,
      `get${modelNamePascal}ById`,
      serviceNames.findById,
      200,
      true, // requiresId
      false, // requiresBody
      idType
    );
    // Update
    handlers += generateHandler(
      modelNamePascal,
      `update${modelNamePascal}`,
      serviceNames.update,
      200,
      true, // requiresId
      true, // requiresBody
      idType
    );
    // Delete
    handlers += generateHandler(
      modelNamePascal,
      `delete${modelNamePascal}`,
      serviceNames.delete,
      200,
      true, // requiresId
      false, // requiresBody
      idType
    );
  }

  return imports + handlers;
};
