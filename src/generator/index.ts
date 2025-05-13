import type { ParsedSchema } from '@parser/types';
import path from 'node:path';
import fs from 'node:fs/promises';
import * as logger from '@utils/logger';
// import { exec } from 'node:child_process';
// import { promisify } from 'node:util';
// import type { DMMF } from "@prisma/generator-helper"; // No longer needed here
import { generateRoutesFileContent } from './generateRoutes.js';
import { generateZodSchema } from './generateZod.js'; // Import from new file
import { generateServiceFileContent } from './generateService.js'; // Import service generator
import { generateControllerFileContent } from './generateController.js'; // Import controller generator
// import { generateServerFileContent } from "./generateServer"; // Removed import
import { generateTypesFileContent } from './generateTypes.js'; // Import types generator
import {
  generateModelIndexFileContent,
  generateRootIndexFileContent,
} from './generateIndex.js'; // Import index generators
import { pascalCase } from '@utils/pascalCase';
import { camelCase } from '@utils/camelCase';
import type { ZodSchemaDetails, ServiceFunctionNames } from './types.js'; // Import shared types
import { generatePrismaMiddlewareFileContent } from './generatePrismaMiddleware.js';

// const execPromise = promisify(exec);

// Create a prefixed logger for the generator
const log = logger.createPrefixedLogger('Generator');

// Configuration options for the generator (optional for now)
export interface GeneratorOptions {
  outputDir: string;
}

/**
 * Main function to generate the API code based on the parsed schema.
 *
 * @param parsedSchema The structured representation of the Prisma schema.
 * @param options Generator configuration options.
 */
export const generateApi = async (
  parsedSchema: ParsedSchema,
  options: GeneratorOptions
): Promise<void> => {
  log.info(
    `Starting API generation for ${parsedSchema.models.length} models...`
  );

  const outputDir = path.resolve(process.cwd(), options.outputDir);

  try {
    // Clean the output directory before generation
    log.info(`Cleaning output directory: ${outputDir}`);
    await fs.rm(outputDir, { recursive: true, force: true }); // Delete if exists

    // Ensure base output directory exists after cleaning
    await fs.mkdir(outputDir, { recursive: true });
    log.debug(`Output directory created: ${outputDir}`);

    // Create middleware directory
    const middlewareDir = path.join(outputDir, 'middleware');
    await fs.mkdir(middlewareDir, { recursive: true });

    // Generate Prisma middleware
    log.debug(`Generating Prisma middleware: prismaMiddleware.ts`);
    const prismaMiddlewareContent = await generatePrismaMiddlewareFileContent();
    const prismaMiddlewareFilePath = path.join(
      middlewareDir,
      'prismaMiddleware.ts'
    );
    await fs.writeFile(prismaMiddlewareFilePath, prismaMiddlewareContent);

    // Generate index file for middleware
    log.debug(`Generating middleware index: index.ts`);
    const middlewareIndexContent = `export * from './prismaMiddleware';`;
    const middlewareIndexFilePath = path.join(middlewareDir, 'index.ts');
    await fs.writeFile(middlewareIndexFilePath, middlewareIndexContent);

    for (const model of parsedSchema.models) {
      const modelNamePascal = pascalCase(model.name);
      const modelNameCamel = camelCase(model.name);
      const modelDir = path.join(outputDir, modelNameCamel);

      await fs.mkdir(modelDir, { recursive: true });
      log.info(`Processing model: ${model.name}`);

      // Generate Zod schema with simplified name
      log.debug(`Generating Zod schema: schema.ts`);
      const { content: zodSchemaContent, imports: zodSchemaImports } =
        await generateZodSchema(model, parsedSchema.enums);
      const schemaFilePath = path.join(modelDir, 'schema.ts');
      await fs.writeFile(schemaFilePath, zodSchemaContent);

      // Generate types file
      log.debug(`Generating types file: types.ts`);
      const typesContent = generateTypesFileContent(model);
      const typesFilePath = path.join(modelDir, 'types.ts');
      await fs.writeFile(typesFilePath, typesContent);

      // Prepare info for route generation - update import path
      const zodSchemaInfo: ZodSchemaDetails = {
        imports: [
          `import { ${modelNamePascal}Schema, create${modelNamePascal}Schema, update${modelNamePascal}Schema } from './schema';`,
          ...zodSchemaImports,
        ],
        modelSchemaName: `${modelNamePascal}Schema`,
        createSchemaName: `create${modelNamePascal}Schema`,
        updateSchemaName: `update${modelNamePascal}Schema`,
      };

      const serviceFunctionNames: ServiceFunctionNames = {
        findMany: `findMany${modelNamePascal}`,
        findById: `find${modelNamePascal}ById`,
        create: `create${modelNamePascal}`,
        update: `update${modelNamePascal}`,
        delete: `delete${modelNamePascal}`,
      };

      // Generate routes file with simplified name
      log.debug(`Generating routes file: routes.ts`);
      const routesContent = generateRoutesFileContent(model, zodSchemaInfo);
      const routesFilePath = path.join(modelDir, 'routes.ts');
      await fs.writeFile(routesFilePath, routesContent);

      // Generate service file
      log.debug(`Generating service file: service.ts`);
      const serviceContent = await generateServiceFileContent(model);
      const serviceFilePath = path.join(modelDir, 'service.ts');
      await fs.writeFile(serviceFilePath, serviceContent);

      // Generate controller file
      log.debug(`Generating controller file: controller.ts`);
      const controllerContent = await generateControllerFileContent(
        model,
        zodSchemaInfo,
        serviceFunctionNames
      );
      const controllerFilePath = path.join(modelDir, 'controller.ts');
      await fs.writeFile(controllerFilePath, controllerContent);

      // Generate model-specific index file
      log.debug(`Generating model index file: index.ts`);
      const modelIndexContent = generateModelIndexFileContent(model);
      const modelIndexFilePath = path.join(modelDir, 'index.ts');
      await fs.writeFile(modelIndexFilePath, modelIndexContent);
    }

    // Generate root index file to export all routes
    log.info(`Generating root index file: index.ts`);
    const rootIndexContent = generateRootIndexFileContent(parsedSchema.models);
    const rootIndexFilePath = path.join(outputDir, 'index.ts');
    await fs.writeFile(rootIndexFilePath, rootIndexContent);

    log.success(
      `API generation completed successfully. Files written to ${outputDir}`
    );
    log.info(
      'Remember to use the prismaMiddleware in your application to provide the Prisma client to the routes.'
    );
  } catch (error) {
    log.error('Error during API generation:', error);
    throw new Error(
      `API generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
