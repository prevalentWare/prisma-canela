import { Command } from 'commander';
import { parsePrismaSchema } from './parser';
import { generateApi } from './generator';

// --- CLI Definition using Commander ---

const program = new Command();

program
  .name('canela')
  .description('CLI tool to generate Hono/Zod REST APIs from Prisma schemas')
  .version('0.0.1'); // TODO: Get version from package.json?

program
  .command('generate')
  .description('Generate API code from a Prisma schema')
  .option(
    '-s, --schema <path>',
    'Path to the Prisma schema file',
    'prisma/schema.prisma'
  )
  .option(
    '-o, --output <path>',
    'Directory to output generated code',
    './src/generated'
  ) // Default output dir
  .action(async (options) => {
    console.log('Canela Codegen 🌿');
    console.log('-------------------');
    console.log(`Schema path: ${options.schema}`);
    console.log(`Output directory: ${options.output}`);

    try {
      // 1. Parse the Prisma schema
      const parsedSchema = await parsePrismaSchema(options.schema);
      console.log('Schema parsed successfully.');

      // 2. Generate the API code
      await generateApi(parsedSchema, { outputDir: options.output });
      console.log('\nCode generation finished!');
    } catch (error) {
      console.error('\nAn error occurred during code generation:');
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(String(error));
      }
      process.exit(1); // Exit with error code
    }
  });

// --- Entry Point ---

const main = async (): Promise<void> => {
  await program.parseAsync(process.argv);
};

void main();
