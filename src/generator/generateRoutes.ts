import type { ParsedModel } from "../parser/types";
import { pascalCase } from "../utils/pascalCase";
import { camelCase } from "../utils/camelCase";
import type { Context } from "hono";
import type { ZodSchemaDetails } from "./types";

/**
 * Generates the content for a {modelName}.routes.ts file.
 * This file now only defines the OpenAPI routes and maps them to controller functions.
 */
export function generateRoutesFileContent(
  model: ParsedModel,
  zodSchemaInfo: ZodSchemaDetails
): string {
  const modelNamePascal = pascalCase(model.name);
  const modelNameCamel = camelCase(model.name);
  const modelNameLower = model.name.toLowerCase();
  const modelNamePluralLower = `${modelNameLower}s`;

  const idField = model.fields.find((f) => f.isId);
  // No longer need to return early, routes can be defined even if controller/service handles no-ID case.
  // The controller generation should handle not generating ID-based functions.

  // We still need ID info for route parameter definitions
  const idTypeIsNumber = idField?.type === "number";
  const idZodCoercionPipe = idTypeIsNumber
    ? `.pipe(z.coerce.number().int({ message: "Invalid ID format"}))`
    : "";
  const idZodType = idTypeIsNumber ? "number" : "string";

  // Updated imports: Remove service imports, add controller import
  const imports = [
    `import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';`,
    // `import type { Context } from 'hono';` // Context likely not needed directly here anymore
    ...zodSchemaInfo.imports, // Zod schema imports are still needed for createRoute
    `import * as controller from './controller';`, // Import controller functions
  ].join("\n");

  // Route definitions remain largely the same
  const routeDefinitions = `
// --- Route Definitions ---
// GET /${modelNamePluralLower}
const list${modelNamePascal}Route = createRoute({
  method: 'get',
  path: '/',
  tags: ['${modelNamePascal}'],
  summary: 'List all ${modelNamePluralLower}',
  responses: {
    200: {
      description: 'Returns a list of ${modelNamePluralLower}',
      content: {
        'application/json': {
          schema: z.array(${zodSchemaInfo.modelSchemaName}),
        },
      },
    },
    // TODO: Define 500 error response
  },
});

// Define ID-based routes only if idField exists
${
  idField
    ? `
// GET /${modelNamePluralLower}/{id}
const get${modelNamePascal}ByIdRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['${modelNamePascal}'],
  summary: 'Get a ${modelNameLower} by ID',
  request: {
    params: z.object({
      id: z.string()${idZodCoercionPipe},
    }),
  },
  responses: {
    200: {
      description: 'Returns the ${modelNameLower}',
      content: {
        'application/json': {
          schema: ${zodSchemaInfo.modelSchemaName},
        },
      },
    },
    404: {
      description: '${modelNamePascal} not found',
      // TODO: Define standard error schema
    },
    // TODO: Define 400, 500 error responses
  },
});

// PATCH /${modelNamePluralLower}/{id}
const update${modelNamePascal}Route = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['${modelNamePascal}'],
  summary: 'Update a ${modelNameLower} by ID',
  request: {
    params: z.object({
      id: z.string()${idZodCoercionPipe},
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
      description: 'Returns the updated ${modelNameLower}',
      content: {
        'application/json': {
          schema: ${zodSchemaInfo.modelSchemaName},
        },
      },
    },
    400: {
      description: 'Invalid input',
      // TODO: Define standard error schema
    },
    404: {
      description: '${modelNamePascal} not found',
      // TODO: Define standard error schema
    },
     // TODO: Define 500 error response
  },
});

// DELETE /${modelNamePluralLower}/{id}
const delete${modelNamePascal}Route = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['${modelNamePascal}'],
  summary: 'Delete a ${modelNameLower} by ID',
  request: {
    params: z.object({
      id: z.string()${idZodCoercionPipe},
    }),
  },
  responses: {
    200: { // Consider 204 No Content if not returning the object
      description: '${modelNamePascal} deleted successfully',
      content: {
        'application/json': {
            // Optional: Return the deleted object's ID or a success message
            schema: z.object({ ${idField.name}: z.${idZodType}() }) // Use actual ID field name
        },
      },
    },
    404: {
      description: '${modelNamePascal} not found',
      // TODO: Define standard error schema
    },
    // TODO: Define 400, 500 error responses
  },
});
`
    : ""
} // End of conditional ID routes

// POST /${modelNamePluralLower} - Always defined
const create${modelNamePascal}Route = createRoute({
  method: 'post',
  path: '/',
  tags: ['${modelNamePascal}'],
  summary: 'Create a new ${modelNameLower}',
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
      description: 'Returns the created ${modelNameLower}',
      content: {
        'application/json': {
          schema: ${zodSchemaInfo.modelSchemaName},
        },
      },
    },
    400: {
      description: 'Invalid input',
      // TODO: Define standard error schema
    },
    // TODO: Define 500 error response
  },
});
`;

  // Handler definitions are removed

  // Updated app setup: Map routes to controller functions
  const appSetup = `
// --- Hono App Setup ---
const ${modelNameCamel}Routes = new OpenAPIHono();

// Register routes with their corresponding controller handlers
${modelNameCamel}Routes.openapi(list${modelNamePascal}Route, controller.list${modelNamePascal});
${modelNameCamel}Routes.openapi(create${modelNamePascal}Route, controller.create${modelNamePascal});
${
  idField
    ? `
${modelNameCamel}Routes.openapi(get${modelNamePascal}ByIdRoute, controller.get${modelNamePascal}ById);
${modelNameCamel}Routes.openapi(update${modelNamePascal}Route, controller.update${modelNamePascal});
${modelNameCamel}Routes.openapi(delete${modelNamePascal}Route, controller.delete${modelNamePascal});
`
    : ""
} // Conditionally register ID-based routes

export default ${modelNameCamel}Routes;
`;

  // Return only imports, route definitions, and app setup
  return [
    imports,
    "\n",
    routeDefinitions,
    // handlers variable removed
    "\n",
    appSetup,
  ].join("\n");
}
