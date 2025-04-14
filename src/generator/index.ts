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
import { generateServiceFileContent } from "./generateService"; // Import service generator
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

      // Generate service file (INLINED LOGIC)
      console.log(`  - Generating service file: service.ts`);
      const serviceContent = generateServiceFileContent_Inline(model); // Call inlined function
      const serviceFilePath = path.join(modelDir, "service.ts");
      await fs.writeFile(serviceFilePath, serviceContent);
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

// --- INLINED Service Generation Logic ---
// TODO: Refactor this back into generateService.ts later
function generateServiceFileContent_Inline(
  model: ParsedModel,
  prismaClientImportPath: string = "@prisma/client"
): string {
  const modelNamePascal = pascalCase(model.name);
  const modelNameCamel = camelCase(model.name);
  const idField = model.fields.find((f) => f.isId);
  // Ensure null check for idField before accessing type
  const idType = idField?.type === "number" ? "number" : "string";

  const prismaModelAccessor = modelNameCamel;

  const imports = `
import { PrismaClient, ${model.name} as ${modelNamePascal}Type } from '${prismaClientImportPath}';
import { create${modelNamePascal}Schema, update${modelNamePascal}Schema } from './schema';
import { z } from 'zod';

// Basic Prisma Client instance
const prisma = new PrismaClient();

type Create${modelNamePascal}Input = z.infer<typeof create${modelNamePascal}Schema>;
type Update${modelNamePascal}Input = z.infer<typeof update${modelNamePascal}Schema>;
`;

  const functions = `
// Find Many
export async function findMany${modelNamePascal}(): Promise<${modelNamePascal}Type[]> {
  try {
    return await prisma.${prismaModelAccessor}.findMany();
  } catch (error) { 
    console.error(\`Error fetching ${modelNamePascal}s:\`, error);
    throw new Error(\`Could not fetch ${modelNamePascal}s\`);
  }
}

// Find By ID
export async function find${modelNamePascal}ById(id: ${idType}): Promise<${modelNamePascal}Type | null> {
   // Add check if ID field actually exists
   if (!idField) {
      throw new Error(\`Model ${modelNamePascal} does not have an ID field for findById\`);
   }
  try {
    return await prisma.${prismaModelAccessor}.findUnique({
      where: { [idField.name]: id }, // Use actual ID field name
    });
  } catch (error) {
    console.error(\`Error fetching ${modelNamePascal} by ID \${id}:\`, error);
    throw new Error(\`Could not fetch ${modelNamePascal} by ID\`);
  }
}

// Create
export async function create${modelNamePascal}(data: Create${modelNamePascal}Input): Promise<${modelNamePascal}Type> {
  try {
    return await prisma.${prismaModelAccessor}.create({ data });
  } catch (error) {
    console.error(\`Error creating ${modelNamePascal}:\`, error);
    throw new Error(\`Could not create ${modelNamePascal}\`);
  }
}

// Update
export async function update${modelNamePascal}(id: ${idType}, data: Update${modelNamePascal}Input): Promise<${modelNamePascal}Type> {
   if (!idField) {
      throw new Error(\`Model ${modelNamePascal} does not have an ID field for update\`);
   }
  try {
    return await prisma.${prismaModelAccessor}.update({
      where: { [idField.name]: id }, // Use actual ID field name
      data,
    });
  } catch (error) {
    console.error(\`Error updating ${modelNamePascal} \${id}:\`, error);
    throw new Error(\`Could not update ${modelNamePascal}\`);
  }
}

// Delete
export async function delete${modelNamePascal}(id: ${idType}): Promise<${modelNamePascal}Type> {
   if (!idField) {
      throw new Error(\`Model ${modelNamePascal} does not have an ID field for delete\`);
   }
  try {
    return await prisma.${prismaModelAccessor}.delete({
      where: { [idField.name]: id }, // Use actual ID field name
    });
  } catch (error) {
    console.error(\`Error deleting ${modelNamePascal} \${id}:\`, error);
    throw new Error(\`Could not delete ${modelNamePascal}\`);
  }
}
`;

  return imports + functions;
}

// Removed generateZodSchema and mapFieldTypeToZodType functions from here
