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

  const imports = [
    `import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';`,
    `import type { Context } from 'hono';`,
    ...zodSchemaInfo.imports,
    // Service imports will be added here in Step 8
    // e.g., `import { ${Object.values(serviceFunctionNames).join(', ')} } from './${modelNameCamel}.service';`
  ].join("\n");

  const routeDefinitions = `
// --- Service Function Placeholders (to be replaced by imports) ---
// In a real scenario, these would be imported from the service file
const ${serviceFunctionNames.findMany} = async (c: Context) => {
  console.log('findMany ${model.name} placeholder');
  // TODO: Call actual service: await service.findMany()
  return c.json([]); 
};
const ${serviceFunctionNames.findById} = async (c: Context) => {
  const id = c.req.valid('param').id;
  console.log('findById ${model.name} placeholder with id: ', id);
  // TODO: Call actual service: await service.findById(id)
  return c.json(null); 
};
const ${serviceFunctionNames.create} = async (c: Context) => {
  const data = c.req.valid('json');
  console.log('create ${model.name} placeholder with data:', data);
  // TODO: Call actual service: await service.create(data)
  return c.json({ id: 'new', ...data }, 201);
};
const ${serviceFunctionNames.update} = async (c: Context) => {
  const id = c.req.valid('param').id;
  const data = c.req.valid('json');
  console.log('update ${model.name} placeholder with id: ', id, ' data:', data);
  // TODO: Call actual service: await service.update(id, data)
  return c.json({ id, ...data });
};
const ${serviceFunctionNames.delete} = async (c: Context) => {
  const id = c.req.valid('param').id;
  console.log('delete ${model.name} placeholder with id: ', id);
  // TODO: Call actual service: await service.delete(id)
  return c.json({ id });
};

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

  const appSetup = `
// --- Hono App Setup ---
const ${modelNameCamel}Routes = new OpenAPIHono();

${modelNameCamel}Routes.openapi(list${modelNamePascal}Route, ${serviceFunctionNames.findMany});
${modelNameCamel}Routes.openapi(get${modelNamePascal}ByIdRoute, ${serviceFunctionNames.findById});
${modelNameCamel}Routes.openapi(create${modelNamePascal}Route, ${serviceFunctionNames.create});
${modelNameCamel}Routes.openapi(update${modelNamePascal}Route, ${serviceFunctionNames.update});
${modelNameCamel}Routes.openapi(delete${modelNamePascal}Route, ${serviceFunctionNames.delete});

export default ${modelNameCamel}Routes;
`;

  return [imports, "\n", routeDefinitions, "\n", appSetup].join("\n");
}
