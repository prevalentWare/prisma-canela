import { describe, it, expect } from 'vitest';
import { generateTypesFileContent } from '@generator/generateTypes';
import type { ParsedModel } from '@parser/types';

describe('generateTypesFileContent', () => {
  it('should generate correct type definitions for a simple model', () => {
    // Arrange: Define a simple mock model
    const mockModel: ParsedModel = {
      name: 'TestItem',
      dbName: 'test_item',
      fields: [
        {
          name: 'id',
          type: 'string',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: true,
          hasDefaultValue: true,
        },
        {
          name: 'name',
          type: 'string',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
        },
      ],
    };

    const expectedContent = `import { z } from 'zod';
import {
  TestItemSchema,
  createTestItemSchema,
  updateTestItemSchema,
} from './schema';

// Infer the TypeScript type for the base model
export type TestItem = z.infer<typeof TestItemSchema>;

// Infer the TypeScript type for the create input
export type CreateTestItemInput = z.infer<typeof createTestItemSchema>;

// Infer the TypeScript type for the update input
export type UpdateTestItemInput = z.infer<typeof updateTestItemSchema>;
`;

    // Act: Generate the types file content
    const actualContent = generateTypesFileContent(mockModel);

    // Assert: Check if the generated content matches the expected output
    expect(actualContent).toBe(expectedContent);
  });

  // TODO: Add more tests for edge cases if necessary
});
