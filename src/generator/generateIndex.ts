import type { ParsedModel, ParsedSchema } from "../parser/types";
import { camelCase } from "../utils/camelCase";
import { pascalCase } from "../utils/pascalCase";

/**
 * Generates the index file content for a specific model directory.
 * This exports the route object with proper TypeScript typing.
 *
 * @param model The parsed model definition.
 * @returns The index file content as a string.
 */
export function generateModelIndexFileContent(model: ParsedModel): string {
  const modelNamePascal = pascalCase(model.name);
  const modelNameCamel = camelCase(model.name);

  return `import { OpenAPIHono } from '@hono/zod-openapi';
import routes from './routes';
import * as types from './types';

/**
 * Hono routes for the ${modelNamePascal} model
 */
export const ${modelNameCamel}Routes = routes;

/**
 * Types for the ${modelNamePascal} model
 */
export const ${modelNameCamel}Types = types;

export default routes;
`;
}

/**
 * Generates the root index file content that imports and re-exports
 * all model routes for easy consumption.
 *
 * @param models The parsed models from the schema.
 * @returns The root index file content as a string.
 */
export function generateRootIndexFileContent(models: ParsedModel[]): string {
  // Generate imports for all model routes
  const imports = models
    .map((model) => {
      const modelNameCamel = camelCase(model.name);
      return `import ${modelNameCamel}Routes from './${modelNameCamel}';`;
    })
    .join("\n");

  // Generate named exports for all routes
  const namedExports = models
    .map((model) => {
      const modelNameCamel = camelCase(model.name);
      return `export { ${modelNameCamel}Routes };`;
    })
    .join("\n");

  // Generate a routes object that contains all routes
  const routesObject = `export const routes = {
${models
  .map((model) => `  ${camelCase(model.name)}: ${camelCase(model.name)}Routes,`)
  .join("\n")}
};`;

  return `${imports}

${namedExports}

${routesObject}

export default routes;
`;
}
