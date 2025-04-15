import type { ParsedModel } from '../parser/types';
import { pascalCase } from '../utils/pascalCase';
import { z } from 'zod'; // Need z for z.infer

/**
 * Generates the TypeScript types file content for a given model.
 *
 * @param model The parsed model definition.
 * @returns The TypeScript types file content string.
 */
export const generateTypesFileContent = (model: ParsedModel): string => {
  const modelNamePascal = pascalCase(model.name);

  const content = `import { z } from 'zod';
import {
  ${modelNamePascal}Schema,
  create${modelNamePascal}Schema,
  update${modelNamePascal}Schema,
} from './schema';

// Infer the TypeScript type for the base model
export type ${modelNamePascal} = z.infer<typeof ${modelNamePascal}Schema>;

// Infer the TypeScript type for the create input
export type Create${modelNamePascal}Input = z.infer<typeof create${modelNamePascal}Schema>;

// Infer the TypeScript type for the update input
export type Update${modelNamePascal}Input = z.infer<typeof update${modelNamePascal}Schema>;
`;

  return content.trim() + '\n'; // Add trailing newline
};
