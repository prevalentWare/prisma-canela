import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import type { ParsedSchema } from '@parser/types';
import type { GeneratorOptions } from '@generator/index';

// ASCII art banner
const displayBanner = (): void => {
  console.log(
    chalk.bold(
      chalk.hex('#2D7BD8')(
        `
   ██████╗ █████╗ ███╗   ██╗███████╗██╗      █████╗ 
  ██╔════╝██╔══██╗████╗  ██║██╔════╝██║     ██╔══██╗
  ██║     ███████║██╔██╗ ██║█████╗  ██║     ███████║
  ██║     ██╔══██║██║╚██╗██║██╔══╝  ██║     ██╔══██║
  ╚██████╗██║  ██║██║ ╚████║███████╗███████╗██║  ██║
   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝  ╚═╝
`
      )
    )
  );
  console.log(
    chalk.italic(
      chalk.hex('#1A4D85')('                     by prevalentWare\n')
    )
  );
};

type ParsableSchema = {
  parsePrismaSchema: (schemaPath?: string) => Promise<ParsedSchema>;
};

type ApiGenerator = {
  generateApi: (
    parsedSchema: ParsedSchema,
    options: GeneratorOptions
  ) => Promise<void>;
};

// This requires dynamic imports for ESM compatibility
const loadModules = async (): Promise<{
  parsePrismaSchema: ParsableSchema['parsePrismaSchema'];
  generateApi: ApiGenerator['generateApi'];
}> => {
  try {
    // Load modules dynamically (supporting both CJS and ESM)
    const parsePrismaSchema = await import('./parser/index.js').then(
      (module) => module.parsePrismaSchema
    );
    const generateApi = await import('./generator/index.js').then(
      (module) => module.generateApi
    );

    return { parsePrismaSchema, generateApi };
  } catch (err) {
    console.error('Error loading required modules:', err);
    process.exit(1);
    // This return is unreachable but TypeScript needs it
    return {} as never;
  }
};

// Get package version from package.json
const getPackageVersion = (): string => {
  try {
    // Try to read package.json relative to the current file
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || '0.1.0';
  } catch {
    // Fallback version if unable to read package.json
    return '0.1.0';
  }
};

/**
 * Creates and configures the CLI program
 * @returns Configured Commander program
 */
export const createProgram = (): Command => {
  const program = new Command();

  program
    .name('canela')
    .description('Generate Hono API from Prisma schema')
    .version(getPackageVersion());

  program
    .command('generate')
    .alias('g') // Short alias
    .description('Generate API code from a Prisma schema')
    .option(
      '-s, --schema [path]',
      'Path to the Prisma schema file or directory containing .prisma files. If not provided, common locations will be checked.'
    )
    .option(
      '-o, --output <path>',
      'Directory to output generated code',
      './src/generated'
    ) // Default output dir
    .action(async (options) => {
      // No need to display banner here anymore, it's displayed in main
      console.log('------------------------');

      try {
        // Load required modules
        const { parsePrismaSchema, generateApi } = await loadModules();

        // Resolve paths to absolute paths
        const outputDir = path.resolve(process.cwd(), options.output);
        let schemaPath = options.schema;

        if (schemaPath) {
          schemaPath = path.resolve(process.cwd(), schemaPath);
          console.log(`Schema path: ${schemaPath}`);
        } else {
          console.log('Schema path: Auto-detect');
        }

        console.log(`Output directory: ${outputDir}`);

        // Parse the Prisma schema
        const parsedSchema = await parsePrismaSchema(schemaPath);
        console.log('✅ Schema parsed successfully.');

        // Generate the API code
        await generateApi(parsedSchema, { outputDir });
        console.log('\n✅ Code generation finished!');
      } catch (err) {
        console.error('\n❌ An error occurred during code generation:');
        if (err instanceof Error) {
          console.error(err.message);

          // In debug mode, show stack trace
          if (process.env.DEBUG === 'true') {
            console.error('\nStack trace:');
            console.error(err.stack);
          }
        } else {
          console.error(String(err));
        }
        process.exit(1); // Exit with error code
      }
    });

  // Add help command
  program
    .command('help')
    .description('Display help information')
    .action(() => {
      // No need to display banner here anymore, it's displayed in main
      program.outputHelp();
    });

  // Add help examples
  program.addHelpText(
    'after',
    `
Examples:
  $ canela generate
  $ canela generate --schema ./prisma/schema.prisma
  $ bun run canela generate --output ./src/api
`
  );

  return program;
};

// --- Entry Point ---
export const main = async (): Promise<void> => {
  const program = createProgram();

  // Display banner always
  displayBanner();

  await program.parseAsync(process.argv);

  // Show help if no command is provided
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
};

// When this file is run directly
if (
  import.meta.url.endsWith('index.ts') ||
  import.meta.url.endsWith('index.js')
) {
  void main();
}
