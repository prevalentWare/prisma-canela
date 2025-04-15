import type { ParsedModel } from '@parser/types';
import { pascalCase } from '@utils/pascalCase';
import { camelCase } from '@utils/camelCase';
import type { ZodSchemaDetails } from './types';
// ErrorSchema is defined locally below as imports were unreliable
import { z as _z } from '@hono/zod-openapi';

/**
 * Generates the Hono route file content for a given model.
 *
 * @param model The parsed model definition.
 * @param zodSchemaInfo Details about the generated Zod schemas.
 * @returns The Hono route file content string.
 */
export const generateRoutesFileContent = (
  model: ParsedModel,
  zodSchemaInfo: ZodSchemaDetails
): string => {
  const modelNamePascal = pascalCase(model.name);
  const modelNameCamel = camelCase(model.name);
  const modelNamePlural = `${modelNameCamel}s`; // Simple pluralization

  const idField = model.fields.find((f) => f.isId);
  // Determine ID type for parameter validation (string or number)
  const idType =
    idField?.type === 'number' ? 'z.coerce.number()' : 'z.string()'; // Use z.coerce.number() for numeric IDs

  // --- Base Imports ---
  // Define ErrorSchema locally as imports weren't reliably added by auto-edit
  const imports = `
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  ${zodSchemaInfo.modelSchemaName},
  ${zodSchemaInfo.createSchemaName},
  ${zodSchemaInfo.updateSchemaName},
} from './schema';
import * as controller from './controller'; // Import controller

// Define ErrorSchema locally for OpenAPI responses
const ErrorSchema = z.object({
  error: z.string(),
});
`;

  // --- Route Definitions using createRoute --- (Add error responses)
  const routeDefinitions: string[] = [];

  // GET /models
  routeDefinitions.push(`
const list${modelNamePascal}Route = createRoute({
  method: 'get',
  path: '/',
  tags: ['${modelNamePascal}'],
  summary: 'List all ${modelNamePlural}',
  responses: {
    200: {
      description: 'Returns a list of ${modelNamePlural}',
      content: {
        'application/json': {
          schema: z.array(${zodSchemaInfo.modelSchemaName}),
        },
      },
    },
    // --- Add standard error responses ---
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});`);

  // POST /models
  routeDefinitions.push(`
const create${modelNamePascal}Route = createRoute({
  method: 'post',
  path: '/',
  tags: ['${modelNamePascal}'],
  summary: 'Create a new ${modelNameCamel}',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ${zodSchemaInfo.createSchemaName},
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Returns the created ${modelNameCamel}',
      content: {
        'application/json': {
          schema: ${zodSchemaInfo.modelSchemaName},
        },
      },
    },
    // --- Add standard error responses ---
    400: {
      description: "Invalid input data",
      content: {
        "application/json": {
          schema: ErrorSchema, // Use standard error schema
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});`);

  // Routes requiring an ID
  if (idField) {
    // GET /models/{id}
    routeDefinitions.push(`
const get${modelNamePascal}ByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['${modelNamePascal}'],
  summary: 'Get a ${modelNameCamel} by ID',
  request: {
    params: z.object({
      id: ${idType}, // Use dynamic ID type
    }),
  },
  responses: {
    200: {
      description: 'Returns the ${modelNameCamel}',
      content: {
        'application/json': {
          schema: ${zodSchemaInfo.modelSchemaName},
        },
      },
    },
    // --- Add standard error responses ---
    400: { // Potential for bad ID format, though covered by Zod param validation
        description: "Invalid ID format",
        content: {
           'application/json': {
               schema: ErrorSchema
           }
        }
    },
    404: {
      description: "${modelNamePascal} not found",
      content: {
        "application/json": {
          schema: ErrorSchema, // Use standard error schema
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});`);

    // PATCH /models/{id}
    routeDefinitions.push(`
const update${modelNamePascal}Route = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['${modelNamePascal}'],
  summary: 'Update a ${modelNameCamel} by ID',
  request: {
    params: z.object({
      id: ${idType}, // Use dynamic ID type
    }),
    body: {
      content: {
        'application/json': {
          schema: ${zodSchemaInfo.updateSchemaName},
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Returns the updated ${modelNameCamel}',
      content: {
        'application/json': {
          schema: ${zodSchemaInfo.modelSchemaName},
        },
      },
    },
    // --- Add standard error responses ---
    400: {
      description: "Invalid input data or ID format",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "${modelNamePascal} not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});`);

    // DELETE /models/{id}
    routeDefinitions.push(`
const delete${modelNamePascal}Route = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['${modelNamePascal}'],
  summary: 'Delete a ${modelNameCamel} by ID',
  request: {
    params: z.object({
      id: ${idType}, // Use dynamic ID type
    }),
  },
  responses: {
    200: { // Consider 204 No Content if not returning the object
      description: '${modelNamePascal} deleted successfully',
      content: {
        'application/json': {
            // Optional: Return the deleted object's ID or a success message
            schema: z.object({ ${idField.name}: ${idType} })
        },
      },
    },
    // --- Add standard error responses ---
     400: { // Potential for bad ID format
        description: "Invalid ID format",
        content: {
           'application/json': {
               schema: ErrorSchema
           }
        }
    },
    404: {
      description: "${modelNamePascal} not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});`);
  }

  // --- Hono App Setup using app.openapi() --- (Refactored)
  const honoSetup = `
// --- Hono App Setup ---
const ${modelNameCamel}Routes = new OpenAPIHono();

// Register routes using app.openapi()
${modelNameCamel}Routes.openapi(list${modelNamePascal}Route, controller.list${modelNamePascal});
${modelNameCamel}Routes.openapi(create${modelNamePascal}Route, controller.create${modelNamePascal});
`;

  const idRoutesSetup = idField
    ? `
${modelNameCamel}Routes.openapi(get${modelNamePascal}ByIdRoute, controller.get${modelNamePascal}ById);
${modelNameCamel}Routes.openapi(update${modelNamePascal}Route, controller.update${modelNamePascal});
${modelNameCamel}Routes.openapi(delete${modelNamePascal}Route, controller.delete${modelNamePascal});
`
    : '';

  const exportStatement = `
export default ${modelNameCamel}Routes;
`;

  return (
    imports +
    '\n\n// --- Route Definitions ---' +
    routeDefinitions.join('\n') +
    honoSetup +
    idRoutesSetup +
    exportStatement
  );
};
