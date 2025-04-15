import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import type { ParsedSchema } from '@parser/types';
import type { GeneratorOptions } from '@generator/index';
import * as logger from '@utils/logger';
import { LogLevel } from '@utils/logger';

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
    logger.error('Error loading required modules:', err);
    process.exit(1);
    // This return is unreachable but TypeScript needs it
    return {} as never;
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

  // Add global log level option
  program
    .option(
      '--log-level <level>',
      'Set the logging level (silent, error, warning, info, debug)',
      'info'
    )
    .option('--silent', 'Silent mode, no output except errors', false)
    .hook('preAction', (thisCommand) => {
      const options = thisCommand.opts();

      // Handle --silent flag
      if (options.silent) {
        logger.setLogLevel(LogLevel.ERROR);
        return;
      }

      // Set log level from option
      if (options.logLevel) {
        logger.setLogLevel(options.logLevel);
      }

      // Check for environment variable
      if (process.env.CANELA_LOG_LEVEL) {
        logger.setLogLevel(process.env.CANELA_LOG_LEVEL);
      }
    });

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
      // Only display banner if not in silent mode
      logger.banner();

      try {
        // Load required modules
        const { parsePrismaSchema, generateApi } = await loadModules();

        // Resolve paths to absolute paths
        const outputDir = path.resolve(process.cwd(), options.output);
        let schemaPath = options.schema;

        if (schemaPath) {
          schemaPath = path.resolve(process.cwd(), schemaPath);
          logger.info(`Schema path: ${schemaPath}`);
        } else {
          logger.info('Schema path: Auto-detect');
        }

        logger.info(`Output directory: ${outputDir}`);

        // Parse the Prisma schema
        const parsedSchema = await parsePrismaSchema(schemaPath);
        logger.success('Schema parsed successfully.');

        // Generate the API code
        await generateApi(parsedSchema, { outputDir });
        logger.success('Code generation finished!');
      } catch (err) {
        logger.error('An error occurred during code generation:');
        if (err instanceof Error) {
          logger.error(err.message);

          // In debug mode, show stack trace
          if (process.env.DEBUG === 'true') {
            logger.debug('\nStack trace:');
            logger.debug(err.stack || '');
          }
        } else {
          logger.error(String(err));
        }
        process.exit(1); // Exit with error code
      }
    });

  // Add help command
  program
    .command('help')
    .description('Display help information')
    .action(() => {
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
  
Log Levels:
  $ canela --log-level=debug generate   # Show detailed debug information
  $ canela --log-level=error generate   # Show only errors
  $ canela --silent generate            # Show only errors, shorter format
  $ CANELA_LOG_LEVEL=debug canela generate  # Set via environment variable
`
  );

  return program;
};

// --- Entry Point ---
export const main = async (): Promise<void> => {
  const program = createProgram();

  await program.parseAsync(process.argv);

  // Show help if no command is provided
  if (!process.argv.slice(2).length) {
    logger.banner();
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
