import type { ParsedModel } from '@parser/types';
import { camelCase } from '@utils/camelCase';
import { pascalCase } from '@utils/pascalCase';

/**
 * Generates the index file content for a specific model directory.
 * This exports the route object with proper TypeScript typing.
 *
 * @param model The parsed model definition.
 * @returns The index file content as a string.
 */
export const generateModelIndexFileContent = (model: ParsedModel): string => {
  const modelNamePascal = pascalCase(model.name);
  const modelNameCamel = camelCase(model.name);

  return `import routes from './routes';
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
};

/**
 * Generates a utility function to register all routes at once.
 * This creates a function that will mount all generated routes on a Hono app instance.
 *
 * @param models The parsed models from the schema.
 * @returns The function content as a string.
 */
export const generateRegisterRoutesFunction = (
  models: ParsedModel[]
): string => {
  const modelRegistrations = models
    .map((model) => {
      const modelNameCamel = camelCase(model.name);
      return `  // Mount ${pascalCase(model.name)} routes
  app.route(\`\${prefix}/${modelNameCamel}s\`, ${modelNameCamel}Routes);`;
    })
    .join('\n\n');

  return `/**
 * Registers all generated API routes with a Hono app instance.
 * This provides a convenient way to mount all routes at once instead of manually.
 * 
 * @param app The Hono app instance (can be Hono or OpenAPIHono)
 * @param options Configuration options for route registration
 *   - prefix: URL prefix for all routes (e.g., '/api')
 *   - pluralize: Whether to pluralize route paths (default: true)
 * @returns The app instance with routes registered
 */
export function registerAllRoutes(
  app: any, 
  options: { 
    prefix?: string;
    pluralize?: boolean;
  } = {}
) {
  const { prefix = '', pluralize = true } = options;
  
${modelRegistrations}

  return app;
}`;
};

/**
 * Generates the root index file content that imports and re-exports
 * all model routes for easy consumption.
 *
 * @param models The parsed models from the schema.
 * @returns The root index file content as a string.
 */
export const generateRootIndexFileContent = (models: ParsedModel[]): string => {
  // Generate imports for all model routes
  const imports = models
    .map((model) => {
      const modelNameCamel = camelCase(model.name);
      return `import ${modelNameCamel}Routes from './${modelNameCamel}';`;
    })
    .join('\n');

  // Generate named exports for all routes
  const namedExports = models
    .map((model) => {
      const modelNameCamel = camelCase(model.name);
      return `export { ${modelNameCamel}Routes };`;
    })
    .join('\n');

  // Generate a routes object that contains all routes
  const routesObject = `export const routes = {
${models
  .map((model) => `  ${camelCase(model.name)}: ${camelCase(model.name)}Routes,`)
  .join('\n')}
};`;

  // Generate register routes function
  const registerRoutesFunction = generateRegisterRoutesFunction(models);

  return `${imports}

${namedExports}

${routesObject}

${registerRoutesFunction}

export default routes;
`;
};
