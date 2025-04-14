import type { ParsedModel } from "../parser/types";
import { pascalCase } from "../utils/pascalCase";
import { camelCase } from "../utils/camelCase";
import type { Context } from "hono";

// Simplified placeholder for Zod Schema details
interface ZodSchemaDetails {
  imports: string[];
  modelSchemaName: string;
  createSchemaName: string;
  updateSchemaName: string;
}

// Simplified placeholder for Service Function details (just names)
interface ServiceFunctionNames {
  findMany: string;
  findById: string;
  create: string;
  update: string;
  delete: string;
}

// Generates the content for a {modelName}.routes.ts file
export function generateRoutesFileContent(
  model: ParsedModel,
  zodSchemaInfo: ZodSchemaDetails,
  serviceFunctionNames: ServiceFunctionNames
): string {
  const modelNamePascal = pascalCase(model.name);
  const modelNameCamel = camelCase(model.name);
  const modelNameLower = model.name.toLowerCase();
  // Basic pluralization - consider a library for more complex cases
  const modelNamePluralLower = `${modelNameLower}s`;

  const idField = model.fields.find((f) => f.isId);
  if (!idField) {
    console.warn(`Model ${model.name} does not have an ID field defined.`);
    return `// Error: Model ${model.name} has no ID field. Cannot generate standard CRUD routes.`;
  }
  const idTypeIsNumber = idField.type === "number";
  // Only add coercion pipe if ID is a number
  const idZodCoercionPipe = idTypeIsNumber
    ? `.pipe(z.coerce.number().int({ message: "Invalid ID format"}))`
    : ""; // Empty string if no coercion needed
  const idZodType = idTypeIsNumber ? "number" : "string";

  // Import actual service functions
  const serviceImports = `import { \n  ${serviceFunctionNames.findMany}, \n  ${serviceFunctionNames.findById}, \n  ${serviceFunctionNames.create}, \n  ${serviceFunctionNames.update}, \n  ${serviceFunctionNames.delete} \n} from \'./service\';`;

  const imports = [
    `import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';`,
    `import type { Context } from 'hono';`,
    ...zodSchemaInfo.imports,
    serviceImports, // Add the service function imports
  ].join("\n");

  const routeDefinitions = `
// --- Route Definitions ---
// NOTE: Placeholder handlers are removed. We now use imported service functions directly.

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

// POST /${modelNamePluralLower}
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
            schema: z.object({ id: z.${idZodType}() }) // Correct usage of idZodType
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
`;

  // Define handlers that call the imported service functions
  // These now correctly align with the route definitions and expected types
  const handlers = `
// --- Route Handlers ---

// GET /
const handleList${modelNamePascal} = async (c: Context) => {
  // TODO: Add error handling (try/catch)
  const results = await ${serviceFunctionNames.findMany}();
  return c.json(results);
};

// GET /:id
const handleGet${modelNamePascal}ById = async (c: Context) => {
  const id = c.req.valid(\'param\').id;
  // TODO: Add error handling (try/catch, check for null)
  const result = await ${serviceFunctionNames.findById}(id);
  if (!result) {
    return c.json({ error: \'${modelNamePascal} not found\' }, 404);
  }
  return c.json(result);
};

// POST /
const handleCreate${modelNamePascal} = async (c: Context) => {
  const data = c.req.valid(\'json\');
  // TODO: Add error handling (try/catch)
  const newItem = await ${serviceFunctionNames.create}(data);
  return c.json(newItem, 201);
};

// PATCH /:id
const handleUpdate${modelNamePascal} = async (c: Context) => {
  const id = c.req.valid(\'param\').id;
  const data = c.req.valid(\'json\');
   // TODO: Add error handling (try/catch, handle Prisma P2025 error for 404)
  const updatedItem = await ${serviceFunctionNames.update}(id, data);
  return c.json(updatedItem);
};

// DELETE /:id
const handleDelete${modelNamePascal} = async (c: Context) => {
  const id = c.req.valid(\'param\').id;
  // TODO: Add error handling (try/catch, handle Prisma P2025 error for 404)
  const deletedItem = await ${serviceFunctionNames.delete}(id);
  return c.json(deletedItem);
};
`;

  const appSetup = `
// --- Hono App Setup ---
const ${modelNameCamel}Routes = new OpenAPIHono();

// Register routes with their handlers
${modelNameCamel}Routes.openapi(list${modelNamePascal}Route, handleList${modelNamePascal});
${modelNameCamel}Routes.openapi(get${modelNamePascal}ByIdRoute, handleGet${modelNamePascal}ById);
${modelNameCamel}Routes.openapi(create${modelNamePascal}Route, handleCreate${modelNamePascal});
${modelNameCamel}Routes.openapi(update${modelNamePascal}Route, handleUpdate${modelNamePascal});
${modelNameCamel}Routes.openapi(delete${modelNamePascal}Route, handleDelete${modelNamePascal});

export default ${modelNameCamel}Routes;
`;

  return [
    imports,
    "\n",
    routeDefinitions, // Route definitions first
    "\n",
    handlers, // Then handlers
    "\n",
    appSetup, // Finally app setup
  ].join("\n");
}
