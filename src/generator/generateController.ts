import type { ParsedModel } from "../parser/types";
import type { Context } from "hono";
import { Prisma } from "@prisma/client"; // Import Prisma namespace
import { pascalCase } from "../utils/pascalCase";
// import { camelCase } from "../utils/camelCase"; // Not strictly needed here anymore
import type { ServiceFunctionNames, ZodSchemaDetails } from "./types";

// Helper function to generate controller imports
function generateControllerImports(
  model: ParsedModel,
  zodSchemaInfo: ZodSchemaDetails
): string {
  const modelNamePascal = pascalCase(model.name);

  // Import Zod types for inference
  const zodImports = `import type { z } from 'zod';
import type { ${zodSchemaInfo.createSchemaName}, ${zodSchemaInfo.updateSchemaName} } from './schema';`;

  // Define input types based on Zod schemas
  const inputTypes = `type CreateInput = z.infer<typeof ${zodSchemaInfo.createSchemaName}>;
type UpdateInput = z.infer<typeof ${zodSchemaInfo.updateSchemaName}>;`;

  // Import service functions using namespace
  const serviceImports = `import * as service from './service';`;

  // Import Prisma for error type checking
  const prismaImport = `import { Prisma } from '@prisma/client';`;

  return `
import type { Context } from 'hono';
${prismaImport}
${zodImports}
${inputTypes}
${serviceImports}
`;
}

// Helper function to generate handler logic
function generateHandler(
  modelNamePascal: string,
  handlerName: string, // e.g., listUser, createUserById
  serviceFunctionName: string, // e.g., findManyUsers, findUserById
  successStatusCode: number = 200,
  requiresId: boolean = false,
  requiresBody: boolean = false,
  idType: string = "string" // Default, only used if requiresId is true
): string {
  // Determine input types for the Context generic
  let inputTypeGeneric = "";
  if (requiresId && requiresBody) {
    const bodyType = handlerName.startsWith("create")
      ? "CreateInput"
      : "UpdateInput";
    // Assuming ID is always string for simplicity in route definition (e.g., /:id)
    // Prisma service might handle parsing if needed based on schema idType
    inputTypeGeneric = `<{}, string, { param: { id: string }, json: ${bodyType} }>`;
  } else if (requiresId) {
    inputTypeGeneric = `<{}, string, { param: { id: string } }>`;
  } else if (requiresBody) {
    const bodyType = handlerName.startsWith("create")
      ? "CreateInput"
      : "UpdateInput";
    inputTypeGeneric = `<{}, string, { json: ${bodyType} }>`;
  }

  // Determine how to access validated data
  const paramValidation = requiresId
    ? `const { id } = c.req.valid('param');`
    : "";
  const jsonValidation = requiresBody
    ? `const data = c.req.valid('json');`
    : "";

  // Determine arguments for service call
  const args = [];
  if (requiresId) args.push("id");
  if (requiresBody) args.push("data");
  const serviceCallArgs = args.join(", ");

  const logId = requiresId ? ` \\\${id}` : "";
  const isIdNotFoundCheck = requiresId && !handlerName.startsWith("list"); // Check for P2025 on ID routes

  // Specific check for findById returning null
  const getByIdNotFound = handlerName.startsWith("get")
    ? `
    if (!item) {
      return c.json({ error: \'${modelNamePascal} not found\' }, 404);
    }`
    : "";

  // Use the inputTypeGeneric in the handler signature
  return `
/**
 * Handles ${handlerName
   .replace(/([A-Z])/g, " $1")
   .toLowerCase()} ${modelNamePascal}.
 */
export const ${handlerName} = async (c: Context) => {
  ${paramValidation}
  ${jsonValidation}
  try {
    const item = await service.${serviceFunctionName}(${serviceCallArgs}); // Use service namespace and correct args
    ${getByIdNotFound}
    // Always return status code explicitly for better type matching with openapi()
    return c.json(item, ${successStatusCode});
  } catch (error: unknown) {${
    isIdNotFoundCheck
      ? `
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      // Use the specific ID in the error message if available
      const message = \`Error ${handlerName
        .replace(/([A-Z])/g, " $1")
        .toLowerCase()}ing ${modelNamePascal}${logId}: Record not found\`;
      console.error(message, error);
      return c.json({ error: '${modelNamePascal} not found' }, 404);
    }`
      : ""
  }
    // Generic error handling for other cases
    const message = \`Error ${handlerName
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()}ing ${modelNamePascal}${logId}: \${error instanceof Error ? error.message : 'Unknown error'}\`;
    console.error(message, error); // Log the detailed error
    return c.json({ error: \`Failed to ${handlerName
      .split(/(?=[A-Z])/)[0]
      .toLowerCase()} ${modelNamePascal}\` }, 500);
  }
};
`;
}

/**
 * Generates the content for a controller file (controller.ts).
 */
export function generateControllerFileContent(
  model: ParsedModel,
  zodSchemaInfo: ZodSchemaDetails,
  serviceNames: ServiceFunctionNames
): string {
  const modelNamePascal = pascalCase(model.name);
  const idField = model.fields.find((f) => f.isId);
  const idType = idField?.type === "number" ? "number" : "string";

  const imports = generateControllerImports(model, zodSchemaInfo);

  let handlers = "";

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
}
