import { describe, it, expect } from 'vitest';
// Import the functions to test (adjust path if necessary)
// We need to export generateZodSchema and mapFieldTypeToZodType for testing
// For now, let's test generateZodSchema which uses the mapper internally.
// We might need to adjust the generator file to export helpers if needed.
import { generateZodSchema } from '@generator/generateZod'; // Placeholder, need exported helpers
import type { ParsedModel, ParsedEnum, ParsedField } from '@parser/types'; // Update to use path alias

// --- Mocking generateApi to access helper functions ---
// This is a workaround. Ideally, helper functions like generateZodSchema
// should be exported from the generator module for direct testing.
// Let's assume we refactor src/generator/index.ts to export helpers later.
// For now, we'll define a simplified version or test via generateApi indirectly.

// --- Let's define a simplified mock/test setup for generateZodSchema ---
// (Assuming generateZodSchema is exported or accessible for testing)

// --- MOCK IMPLEMENTATION (needs actual export from generator/index.ts) ---
// We'll copy the function signature/logic here for the test setup
// In a real scenario, we would IMPORT the actual function.

const mapFieldTypeToZodType_Test = (
  field: ParsedField,
  enums: ParsedEnum[]
): string => {
  // Simplified test version or copy of actual implementation
  if (field.isList) {
    const singleField: ParsedField = { ...field, isList: false };
    const singleType = mapFieldTypeToZodType_Test(singleField, enums);
    return `z.array(${singleType})`;
  }
  if (field.kind === 'enum') {
    const enumDef = enums.find((e) => e.name === field.enumName);
    if (enumDef) {
      const enumValues = enumDef.values.map((val) => `'${val}'`).join(', ');
      return `z.enum([${enumValues}])`;
    } else {
      return 'z.string()';
    }
  }
  switch (field.type) {
    case 'string':
      return 'z.string()';
    case 'number':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'date':
      return 'z.date()';
    case 'json':
      return 'z.record(z.any())';
    default:
      return 'z.any()';
  }
};

const _generateZodSchema_Test = (
  model: ParsedModel,
  enums: ParsedEnum[]
): string => {
  const { name, fields } = model;
  const modelNameLower = name.toLowerCase();
  const zodFields = fields
    .filter((field) => field.kind !== 'object')
    .map((field) => {
      const zodType = mapFieldTypeToZodType_Test(field, enums);
      let fieldDefinition = `  ${field.name}: ${zodType}`;
      if (!field.isRequired) {
        fieldDefinition += '.optional()';
      }
      return fieldDefinition;
    })
    .join(',\n');

  return `
import { z } from 'zod';

// TODO: Import actual enum definitions if needed elsewhere

export const ${modelNameLower}Schema = z.object({
${zodFields}
});
`;
};

// --- End Mock Implementation ---

describe('Zod Schema Generation', () => {
  it('should generate correct Zod schema for a simple model', async () => {
    const simpleModel: ParsedModel = {
      name: 'Post',
      dbName: null,
      fields: [
        {
          name: 'id',
          type: 'string',
          kind: 'scalar',
          enumName: undefined,
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: true,
          hasDefaultValue: true,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'title',
          type: 'string',
          kind: 'scalar',
          enumName: undefined,
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'content',
          type: 'string',
          kind: 'scalar',
          enumName: undefined,
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'likes',
          type: 'number',
          kind: 'scalar',
          enumName: undefined,
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: true,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'published',
          type: 'boolean',
          kind: 'scalar',
          enumName: undefined,
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: true,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'meta',
          type: 'json',
          kind: 'scalar',
          enumName: undefined,
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'publishedAt',
          type: 'date',
          kind: 'scalar',
          enumName: undefined,
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'author',
          type: 'relation',
          kind: 'object',
          enumName: undefined,
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: {
            relatedModelName: 'User',
            relationName: 'PostAuthor',
          },
          isUpdatedAt: false,
        },
      ],
    };

    const expectedSchema = `
import { z } from 'zod';

// Base schema for Post (matches Prisma model structure)
export const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional().nullable(),
  likes: z.number(),
  published: z.boolean(),
  meta: z.record(z.any()).optional().nullable(),
  publishedAt: z.coerce.date().optional().nullable()
});

// Schema for creating a Post
// Based on the base schema, omitting generated fields.
export const createPostSchema = PostSchema.omit({ "id": true, "likes": true, "published": true });

// Schema for updating a Post
// Based on the base schema, making all fields optional and omitting generated fields.
export const updatePostSchema = PostSchema.partial().omit({ "id": true });
`;

    // Access the content property
    const { content: generatedContent } = await generateZodSchema(
      simpleModel,
      []
    );

    // Normalize whitespace for comparison
    expect(generatedContent.trim()).toEqual(expectedSchema.trim());
  });

  // --- Added test case for enums ---
  it('should generate correct Zod schema for a model with enums', async () => {
    const enumModel: ParsedModel = {
      name: 'User',
      dbName: null,
      fields: [
        {
          name: 'id',
          type: 'string',
          kind: 'scalar',
          enumName: undefined,
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: true,
          hasDefaultValue: true,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'role',
          type: 'enum',
          kind: 'enum',
          enumName: 'Enum_Role',
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: true,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'status',
          type: 'enum',
          kind: 'enum',
          enumName: 'Enum_Status',
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
      ],
    };
    const enums: ParsedEnum[] = [
      { name: 'Enum_Role', values: ['USER', 'ADMIN'] },
      { name: 'Enum_Status', values: ['ACTIVE', 'INACTIVE'] },
    ];
    const expectedSchema = `
import { z } from 'zod';
import { Enum_Role, Enum_Status } from '@prisma/client';

// Base schema for User (matches Prisma model structure)
export const UserSchema = z.object({
  id: z.string(),
  role: z.nativeEnum(Enum_Role),
  status: z.nativeEnum(Enum_Status).optional().nullable()
});

// Schema for creating a User
// Based on the base schema, omitting generated fields.
export const createUserSchema = UserSchema.omit({ "id": true, "role": true });

// Schema for updating a User
// Based on the base schema, making all fields optional and omitting generated fields.
export const updateUserSchema = UserSchema.partial().omit({ "id": true });
`;
    // Access the content property
    const { content: generatedContent } = await generateZodSchema(
      enumModel,
      enums
    );
    expect(generatedContent.trim()).toEqual(expectedSchema.trim());
  });

  // --- Added test case for list/array fields ---
  it('should generate correct Zod schema for a model with list fields', async () => {
    const listModel: ParsedModel = {
      name: 'Config',
      dbName: 'configs',
      fields: [
        {
          name: 'id',
          type: 'number',
          kind: 'scalar',
          enumName: undefined,
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: true,
          hasDefaultValue: true,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'tags',
          type: 'string',
          kind: 'scalar',
          enumName: undefined,
          isList: true,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'values',
          type: 'number',
          kind: 'scalar',
          enumName: undefined,
          isList: true,
          isRequired: false,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
        {
          name: 'permissions',
          type: 'enum',
          kind: 'enum',
          enumName: 'Enum_Perms',
          isList: true,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
          isUpdatedAt: false,
        },
      ],
    };
    const enums: ParsedEnum[] = [
      { name: 'Enum_Perms', values: ['READ', 'WRITE', 'DELETE'] },
    ];
    const expectedSchema = `
import { z } from 'zod';
import { Enum_Perms } from '@prisma/client';

// Base schema for Config (matches Prisma model structure)
export const ConfigSchema = z.object({
  id: z.number(),
  tags: z.array(z.string()),
  values: z.array(z.number()).optional().nullable(),
  permissions: z.array(z.nativeEnum(Enum_Perms))
});

// Schema for creating a Config
// Based on the base schema, omitting generated fields.
export const createConfigSchema = ConfigSchema.omit({ "id": true });

// Schema for updating a Config
// Based on the base schema, making all fields optional and omitting generated fields.
export const updateConfigSchema = ConfigSchema.partial().omit({ "id": true });
`;
    // Access the content property
    const { content: generatedContent } = await generateZodSchema(
      listModel,
      enums
    );
    expect(generatedContent.trim()).toEqual(expectedSchema.trim());
  });
});
