import type {
  ParsedSchema,
  ParsedModel,
  // ParsedField, // No longer directly used here
  // ParsedEnum, // No longer directly used here
} from "../parser/types";
import path from "node:path";
import fs from "node:fs/promises";
// import type { DMMF } from "@prisma/generator-helper"; // No longer needed here
import { generateRoutesFileContent } from "./generateRoutes";
import { generateZodSchema } from "./generateZod"; // Import from new file
// import { generateServerFileContent } from "./generateServer"; // Removed import
import { pascalCase } from "../utils/pascalCase";
import { camelCase } from "../utils/camelCase";

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
export async function generateApi(
  parsedSchema: ParsedSchema,
  options: GeneratorOptions
): Promise<void> {
  console.log(
    `Starting API generation for ${parsedSchema.models.length} models...`
  );

  const outputDir = path.resolve(process.cwd(), options.outputDir);

  try {
    // Clean the output directory before generation
    console.log(`Cleaning output directory: ${outputDir}`);
    await fs.rm(outputDir, { recursive: true, force: true }); // Delete if exists

    // Ensure base output directory exists after cleaning
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Output directory created: ${outputDir}`);

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
      const schemaFilePath = path.join(modelDir, "schema.ts");
      await fs.writeFile(schemaFilePath, zodSchemaContent);

      // Prepare info for route generation - update import path
      const zodSchemaInfo = {
        imports: [
          `import { ${modelNamePascal}Schema, create${modelNamePascal}Schema, update${modelNamePascal}Schema } from './schema';`,
          ...zodSchemaImports,
        ],
        modelSchemaName: `${modelNamePascal}Schema`,
        createSchemaName: `create${modelNamePascal}Schema`,
        updateSchemaName: `update${modelNamePascal}Schema`,
      };

      const serviceFunctionNames = {
        findMany: `findMany${modelNamePascal}`,
        findById: `find${modelNamePascal}ById`,
        create: `create${modelNamePascal}`,
        update: `update${modelNamePascal}`,
        delete: `delete${modelNamePascal}`,
      };

      // Generate routes file with simplified name
      console.log(`  - Generating routes file: routes.ts`);
      const routesContent = generateRoutesFileContent(
        model,
        zodSchemaInfo,
        serviceFunctionNames
      );
      const routesFilePath = path.join(modelDir, "routes.ts");
      await fs.writeFile(routesFilePath, routesContent);

      // TODO: Generate service file
    }

    // REMOVED server file generation block
    // console.log(`- Generating main server file: server.ts`);
    // const serverContent = generateServerFileContent(
    //   parsedSchema.models /*, apiBasePath (optional) */
    // );
    // const serverFilePath = path.join(outputDir, "server.ts");
    // await fs.writeFile(serverFilePath, serverContent);

    // REMOVED reference to common files (as server was the main one)
    // TODO: Generate other common files if needed (e.g., Prisma client setup?)

    console.log(
      `\nAPI generation completed successfully. Files written to ${outputDir}`
    );
    console.log(
      "\nNext steps: Import the generated modules (schemas, routes, services) into your existing Hono application."
    );
  } catch (error) {
    console.error("Error during API generation:", error);
    throw new Error(
      `API generation failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Removed generateZodSchema and mapFieldTypeToZodType functions from here
