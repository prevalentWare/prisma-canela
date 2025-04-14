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
    `import { validator } from 'hono/validator';`,
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

  // Updated app setup: Map routes to controller functions using standard Hono methods
  const appSetup = `
// --- Hono App Setup ---
// Using standard Hono methods for clearer middleware application
const ${modelNameCamel}Routes = new OpenAPIHono(); // Keep OpenAPIHono for potential doc gen later

// GET /${modelNamePluralLower} (List)
${modelNameCamel}Routes.get(
  '/',
  controller.list${modelNamePascal}
);

// POST /${modelNamePluralLower} (Create)
${modelNameCamel}Routes.post(
  '/',
  validator('json', (value, c) => {
    // Reuse the schema defined in createRoute for validation
    const parsed = create${modelNamePascal}Route.request.body.content['application/json'].schema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 400);
    }
    return parsed.data; // Make validated data available via c.req.valid('json')
  }),
  controller.create${modelNamePascal}
);

${
  idField
    ? `
// GET /${modelNamePluralLower}/{id}
${modelNameCamel}Routes.get(
  '/{id}',
  validator('param', (value, c) => {
    const parsed = get${modelNamePascal}ByIdRoute.request.params.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 400);
    }
    return parsed.data;
  }),
  controller.get${modelNamePascal}ById
);

// PATCH /${modelNamePluralLower}/{id}
${modelNameCamel}Routes.patch(
  '/{id}',
  validator('param', (value, c) => {
    const parsed = update${modelNamePascal}Route.request.params.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 400);
    }
    return parsed.data;
  }),
  validator('json', (value, c) => {
    const parsed = update${modelNamePascal}Route.request.body.content['application/json'].schema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 400);
    }
    return parsed.data;
  }),
  controller.update${modelNamePascal}
);

// DELETE /${modelNamePluralLower}/{id}
${modelNameCamel}Routes.delete(
  '/{id}',
  validator('param', (value, c) => {
    const parsed = delete${modelNamePascal}Route.request.params.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: 'Validation failed', issues: parsed.error.issues }, 400);
    }
    return parsed.data;
  }),
  controller.delete${modelNamePascal}
);
`
    : ""
} // Conditionally register ID-based routes

// TODO: Optionally re-attach OpenAPI route definitions for documentation generation if needed
// Example: ${modelNameCamel}Routes.doc('/path', list${modelNamePascal}Route.getOpenAPIMetadata());

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
