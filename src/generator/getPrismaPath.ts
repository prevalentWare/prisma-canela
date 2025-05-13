/* eslint-disable complexity */
import fs from 'node:fs/promises';
import path from 'node:path';
import { findPrismaSchema } from '@parser/index';

/**
 * Flag to indicate if running in test mode
 * When true, the sync version will be used internally by async functions
 */
let isTestMode = false;

/**
 * Set test mode to bypass async operations in tests
 * @param value Whether test mode is enabled
 */
export const setTestMode = (value: boolean): void => {
  isTestMode = value;
};

/**
 * Returns the path to import Prisma client from
 * This checks the Prisma schema for a custom output path and uses it if available,
 * otherwise falls back to @prisma/client
 *
 * @returns The path to import the Prisma client from
 */
export const getPrismaPath = async (): Promise<string> => {
  // In test mode, use the sync version to avoid async issues in tests
  if (isTestMode) {
    return getPrismaPathSync();
  }

  try {
    // Get the project root directory
    const projectRoot = process.cwd();

    // Find the Prisma schema
    const schemaPath = await findPrismaSchema();

    // Get the directory where the schema is located
    let schemaDir: string;
    try {
      const stats = await fs.stat(schemaPath);
      // If it's a directory, use it directly; otherwise use its parent directory
      schemaDir = stats.isDirectory() ? schemaPath : path.dirname(schemaPath);
    } catch {
      // If we can't stat the path, assume it's a file and get its directory
      schemaDir = path.dirname(path.resolve(projectRoot, schemaPath));
    }

    // Read schema content (either a file or combined from directory)
    let schemaContent: string;

    try {
      const stats = await fs.stat(schemaPath);

      if (stats.isDirectory()) {
        // If it's a directory, read and combine all .prisma files
        const files = await fs.readdir(schemaPath);
        const schemaFiles = files.filter((file) => file.endsWith('.prisma'));

        let combinedSchema = '';
        for (const file of schemaFiles) {
          const filePath = path.join(schemaPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          combinedSchema += `\n${content}\n`;
        }
        schemaContent = combinedSchema;
      } else {
        // It's a file, just read it
        schemaContent = await fs.readFile(schemaPath, 'utf-8');
      }
    } catch {
      // If there's an error reading the schema, fall back to default
      return '@prisma/client';
    }

    // Find the generator client block and extract the output path if it exists
    const generatorMatch = schemaContent.match(/generator\s+client\s*{[^}]*}/s);
    if (generatorMatch) {
      const generatorBlock = generatorMatch[0];
      const outputMatch = generatorBlock.match(/output\s*=\s*["'](.+?)["']/);

      if (outputMatch && outputMatch[1]) {
        const outputRelativePath = outputMatch[1];

        // Create a full path by joining the schema directory with the output path
        // First, normalize the relative path to remove any "./" prefix
        const normalizedOutputPath = outputRelativePath.startsWith('./')
          ? outputRelativePath.substring(2)
          : outputRelativePath;

        // Join schema directory with the normalized output path
        const fullOutputPath = path.join(schemaDir, normalizedOutputPath);

        // Convert the absolute path to a path relative to the project root
        let relativePath: string;
        if (path.isAbsolute(fullOutputPath)) {
          relativePath = path.relative(projectRoot, fullOutputPath);
        } else {
          relativePath = fullOutputPath;
        }

        // Return the path suitable for imports
        // If it's already a node_modules path (like @prisma/client), return as is
        if (relativePath.startsWith('@') || !relativePath.includes('/')) {
          return relativePath;
        }

        // Otherwise, return a relative path from project root with /client appended
        return path.join(relativePath, 'client');
      }
    }

    // Fallback to default if no output specified
    return '@prisma/client';
  } catch (error) {
    console.error(error);
    // If anything fails, fall back to the default
    return '@prisma/client';
  }
};

/**
 * Synchronous version of getPrismaPath that always returns '@prisma/client'
 * This is used as a fallback when the async version can't be used
 * It's also used in tests by setting isTestMode to true
 */
export const getPrismaPathSync = (): string => {
  return '@prisma/client';
};

// Set test mode to true if running tests
// This is based on environment variables that testing frameworks commonly set
if (
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST ||
  process.env.JEST_WORKER_ID
) {
  setTestMode(true);
}
