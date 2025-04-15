import type { ParsedSchema } from '@parser/types';
import path from 'node:path';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
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

const execPromise = promisify(exec);

// Configuration options for the generator (optional for now)
export interface GeneratorOptions {
  outputDir: string;
  runFixers?: boolean; // Whether to run the formatters/linters on generated files
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
  console.log(
    `Starting API generation for ${parsedSchema.models.length} models...`
  );

  const outputDir = path.resolve(process.cwd(), options.outputDir);
  const shouldRunFixers = options.runFixers !== false; // Default to true if not specified

  try {
    // Clean the output directory before generation
    console.log(`Cleaning output directory: ${outputDir}`);
    await fs.rm(outputDir, { recursive: true, force: true }); // Delete if exists

    // Ensure base output directory exists after cleaning
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Output directory created: ${outputDir}`);

    // Create middleware directory
    const middlewareDir = path.join(outputDir, 'middleware');
    await fs.mkdir(middlewareDir, { recursive: true });

    // Generate Prisma middleware
    console.log(`- Generating Prisma middleware: prismaMiddleware.ts`);
    const prismaMiddlewareContent = generatePrismaMiddlewareFileContent();
    const prismaMiddlewareFilePath = path.join(
      middlewareDir,
      'prismaMiddleware.ts'
    );
    await fs.writeFile(prismaMiddlewareFilePath, prismaMiddlewareContent);

    // Generate index file for middleware
    console.log(`- Generating middleware index: index.ts`);
    const middlewareIndexContent = `export * from './prismaMiddleware';`;
    const middlewareIndexFilePath = path.join(middlewareDir, 'index.ts');
    await fs.writeFile(middlewareIndexFilePath, middlewareIndexContent);

    for (const model of parsedSchema.models) {
      const modelNamePascal = pascalCase(model.name);
      const modelNameCamel = camelCase(model.name);
      const modelDir = path.join(outputDir, modelNameCamel);

      await fs.mkdir(modelDir, { recursive: true });
      console.log(`- Processing model: ${model.name} -> ${modelDir}`);

      // Generate Zod schema with simplified name
      console.log(`  - Generating Zod schema: schema.ts`);
      const { content: zodSchemaContent, imports: zodSchemaImports } =
        generateZodSchema(model, parsedSchema.enums);
      const schemaFilePath = path.join(modelDir, 'schema.ts');
      await fs.writeFile(schemaFilePath, zodSchemaContent);

      // Generate types file
      console.log(`  - Generating types file: types.ts`);
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
      console.log(`  - Generating routes file: routes.ts`);
      const routesContent = generateRoutesFileContent(model, zodSchemaInfo);
      const routesFilePath = path.join(modelDir, 'routes.ts');
      await fs.writeFile(routesFilePath, routesContent);

      // Generate service file
      console.log(`  - Generating service file: service.ts`);
      const serviceContent = generateServiceFileContent(model);
      const serviceFilePath = path.join(modelDir, 'service.ts');
      await fs.writeFile(serviceFilePath, serviceContent);

      // Generate controller file
      console.log(`  - Generating controller file: controller.ts`);
      const controllerContent = generateControllerFileContent(
        model,
        zodSchemaInfo,
        serviceFunctionNames
      );
      const controllerFilePath = path.join(modelDir, 'controller.ts');
      await fs.writeFile(controllerFilePath, controllerContent);

      // Generate model-specific index file
      console.log(`  - Generating model index file: index.ts`);
      const modelIndexContent = generateModelIndexFileContent(model);
      const modelIndexFilePath = path.join(modelDir, 'index.ts');
      await fs.writeFile(modelIndexFilePath, modelIndexContent);
    }

    // Generate root index file to export all routes
    console.log(`- Generating root index file: index.ts`);
    const rootIndexContent = generateRootIndexFileContent(parsedSchema.models);
    const rootIndexFilePath = path.join(outputDir, 'index.ts');
    await fs.writeFile(rootIndexFilePath, rootIndexContent);

    // Run formatting/linting on the generated files if enabled
    if (shouldRunFixers) {
      // Run Prettier first to format the code
      console.log(`\n- Running Prettier on generated files...`);
      try {
        // Use escaped quotes for paths with spaces
        await execPromise(
          `cd "${process.cwd()}" && bun run prettier --write "${outputDir}/**/*.ts"`
        );
        console.log('✅ Prettier formatting completed successfully.');
      } catch (formatError) {
        console.error(
          '⚠️ Some formatting issues could not be automatically fixed:',
          formatError
        );
      }

      // Then run ESLint with --fix to fix any remaining linting issues
      console.log(`- Running ESLint with --fix on generated files...`);
      try {
        // Use escaped quotes for paths with spaces
        await execPromise(
          `cd "${process.cwd()}" && bun run eslint --ext .ts --fix "${outputDir}"`
        );
        console.log('✅ ESLint auto-fixing completed successfully.');
      } catch (lintError) {
        console.error(
          '⚠️ Some linting issues could not be automatically fixed:',
          lintError
        );
      }
    }

    console.log(
      `\nAPI generation completed successfully. Files written to ${outputDir}`
    );
    console.log(
      '\nRemember to use the prismaMiddleware in your application to provide the Prisma client to the routes.'
    );
  } catch (error) {
    console.error('Error during API generation:', error);
    throw new Error(
      `API generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
