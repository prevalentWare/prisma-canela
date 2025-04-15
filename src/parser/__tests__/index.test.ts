import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import * as PrismaInternals from '@prisma/internals';
import { parsePrismaSchema } from '@parser/index';
import type { ParsedSchema } from '@parser/types';

// Use vi.mock for module mocking
vi.mock('node:fs/promises');
vi.mock('@prisma/internals');

describe('Prisma Schema Parser', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  it('should parse a simple schema with one model and basic fields', async () => {
    const simpleSchema = `
      datasource db {
        provider = "postgresql"
        url      = env("DATABASE_URL")
      }

      generator client {
        provider = "prisma-client-js"
      }

      model Post {
        id        String   @id @default(cuid())
        title     String
        content   String?
        published Boolean  @default(false)
        createdAt DateTime @default(now())
      }
    `;

    // Set mock implementations for this test
    vi.mocked(fs.readFile).mockResolvedValueOnce(simpleSchema);

    // Create mock DMMF object (simplified, add required fields)
    const mockDMMF = {
      datamodel: {
        models: [
          {
            name: 'Post',
            dbName: null,
            fields: [
              {
                name: 'id',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: true,
                isReadOnly: false,
                hasDefaultValue: true,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'title',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'content',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: false,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'published',
                type: 'Boolean',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: true,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'createdAt',
                type: 'DateTime',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: true,
                isGenerated: false,
                isUpdatedAt: false,
              },
            ],
            uniqueFields: [],
            uniqueIndexes: [],
            primaryKey: null,
            isGenerated: false,
          },
        ],
        enums: [],
        types: [],
      },
      // Add minimal schema and mappings to satisfy DMMF.Document type if strictly needed
      schema: {
        inputObjectTypes: {},
        outputObjectTypes: {},
        enumTypes: {},
        fieldRefTypes: {},
      },
      mappings: {
        modelOperations: [],
        otherOperations: { read: [], write: [] },
      },
    };

    // Disable ESLint for this specific line since the DMMF type is very complex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(PrismaInternals.getDMMF).mockResolvedValueOnce(mockDMMF as any);

    // Expected ParsedSchema (remains the same)
    const expected: ParsedSchema = {
      models: [
        {
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
            },
            {
              name: 'createdAt',
              type: 'date',
              kind: 'scalar',
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: true,
              relationInfo: undefined,
            },
          ],
        },
      ],
      enums: [],
    };

    const result = await parsePrismaSchema('./dummy-schema.prisma');
    expect(result).toEqual(expected);
  });

  // --- Test Case 1: Enums ---
  it('should parse a schema with enums', async () => {
    const enumSchema = `
      enum Role {
        USER
        ADMIN
      }

      model User {
        id   String @id
        role Role   @default(USER)
      }
    `;
    vi.mocked(fs.readFile).mockResolvedValueOnce(enumSchema);

    const mockDMMF = {
      datamodel: {
        models: [
          {
            name: 'User',
            dbName: null,
            fields: [
              {
                name: 'id',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: true,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'role',
                type: 'Role',
                kind: 'enum',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: true,
                isGenerated: false,
                isUpdatedAt: false,
              },
            ],
            uniqueFields: [],
            uniqueIndexes: [],
            primaryKey: null,
            isGenerated: false,
          },
        ],
        enums: [
          {
            name: 'Role',
            values: [
              { name: 'USER', dbName: null },
              { name: 'ADMIN', dbName: null },
            ],
            dbName: null,
          },
        ],
        types: [],
      },
      schema: {
        inputObjectTypes: {},
        outputObjectTypes: {},
        enumTypes: {},
        fieldRefTypes: {},
      },
      mappings: {
        modelOperations: [],
        otherOperations: { read: [], write: [] },
      },
    };

    // Disable ESLint for this specific line since the DMMF type is very complex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(PrismaInternals.getDMMF).mockResolvedValueOnce(mockDMMF as any);

    const expected: ParsedSchema = {
      models: [
        {
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
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: 'role',
              type: 'enum',
              kind: 'enum',
              enumName: 'Role',
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: true,
              relationInfo: undefined,
            },
          ],
        },
      ],
      enums: [{ name: 'Role', values: ['USER', 'ADMIN'] }],
    };

    const result = await parsePrismaSchema('./dummy-schema.prisma');
    expect(result).toEqual(expected);
  });

  // --- Test Case 2: One-to-One ---
  it('should parse a schema with a one-to-one relationship', async () => {
    const oneToOneSchema = `
      model User {
        id      String  @id
        profile Profile? @relation("UserProfile")
      }

      model Profile {
        id     String @id
        bio    String?
        user   User   @relation("UserProfile", fields: [userId], references: [id])
        userId String @unique
      }
    `;
    vi.mocked(fs.readFile).mockResolvedValueOnce(oneToOneSchema);

    const mockDMMF = {
      datamodel: {
        models: [
          {
            name: 'User',
            dbName: null,
            fields: [
              {
                name: 'id',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: true,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'profile',
                type: 'Profile',
                kind: 'object',
                relationName: 'UserProfile',
                isList: false,
                isRequired: false,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
            ],
            uniqueFields: [],
            uniqueIndexes: [],
            primaryKey: null,
            isGenerated: false,
          },
          {
            name: 'Profile',
            dbName: null,
            fields: [
              {
                name: 'id',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: true,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'bio',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: false,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'user',
                type: 'User',
                kind: 'object',
                relationName: 'UserProfile',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'userId',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: true,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
            ],
            uniqueFields: [],
            uniqueIndexes: [],
            primaryKey: null,
            isGenerated: false,
          },
        ],
        enums: [],
        types: [],
      },
      schema: {
        inputObjectTypes: {},
        outputObjectTypes: {},
        enumTypes: {},
        fieldRefTypes: {},
      },
      mappings: {
        modelOperations: [],
        otherOperations: { read: [], write: [] },
      },
    };

    // Disable ESLint for this specific line since the DMMF type is very complex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(PrismaInternals.getDMMF).mockResolvedValueOnce(mockDMMF as any);

    const expected: ParsedSchema = {
      models: [
        {
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
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: 'profile',
              type: 'relation',
              kind: 'object',
              enumName: undefined,
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: {
                relatedModelName: 'Profile',
                relationName: 'UserProfile',
              },
            },
          ],
        },
        {
          name: 'Profile',
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
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: 'bio',
              type: 'string',
              kind: 'scalar',
              enumName: undefined,
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: 'user',
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
                relationName: 'UserProfile',
              },
            },
            {
              name: 'userId',
              type: 'string',
              kind: 'scalar',
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: false,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
          ],
        },
      ],
      enums: [],
    };
    const result = await parsePrismaSchema('./dummy-schema.prisma');
    expect(result).toEqual(expected);
  });

  // --- Test Case 3: One-to-Many ---
  it('should parse a schema with a one-to-many relationship', async () => {
    const oneToManySchema = `
      model User {
        id    String @id
        posts Post[] @relation("UserPosts")
      }

      model Post {
        id     String @id
        title  String
        author User   @relation("UserPosts", fields: [authorId], references: [id])
        authorId String
      }
    `;
    vi.mocked(fs.readFile).mockResolvedValueOnce(oneToManySchema);

    const mockDMMF = {
      datamodel: {
        models: [
          {
            name: 'User',
            dbName: null,
            fields: [
              {
                name: 'id',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: true,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'posts',
                type: 'Post',
                kind: 'object',
                relationName: 'UserPosts',
                isList: true,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
            ],
            uniqueFields: [],
            uniqueIndexes: [],
            primaryKey: null,
            isGenerated: false,
          },
          {
            name: 'Post',
            dbName: null,
            fields: [
              {
                name: 'id',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: true,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'title',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'author',
                type: 'User',
                kind: 'object',
                relationName: 'UserPosts',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'authorId',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
            ],
            uniqueFields: [],
            uniqueIndexes: [],
            primaryKey: null,
            isGenerated: false,
          },
        ],
        enums: [],
        types: [],
      },
      schema: {
        inputObjectTypes: {},
        outputObjectTypes: {},
        enumTypes: {},
        fieldRefTypes: {},
      },
      mappings: {
        modelOperations: [],
        otherOperations: { read: [], write: [] },
      },
    };

    // Disable ESLint for this specific line since the DMMF type is very complex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(PrismaInternals.getDMMF).mockResolvedValueOnce(mockDMMF as any);

    const expected: ParsedSchema = {
      models: [
        {
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
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: 'posts',
              type: 'relation',
              kind: 'object',
              enumName: undefined,
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: {
                relatedModelName: 'Post',
                relationName: 'UserPosts',
              },
            },
          ],
        },
        {
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
              hasDefaultValue: false,
              relationInfo: undefined,
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
                relationName: 'UserPosts',
              },
            },
            {
              name: 'authorId',
              type: 'string',
              kind: 'scalar',
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
          ],
        },
      ],
      enums: [],
    };
    const result = await parsePrismaSchema('./dummy-schema.prisma');
    expect(result).toEqual(expected);
  });

  // --- Test Case 4: Many-to-Many ---
  it('should parse a schema with a many-to-many relationship', async () => {
    const manyToManySchema = `
      model Post {
        id         String   @id
        categories Category[] @relation("PostCategories")
      }

      model Category {
        id    String @id
        name  String
        posts Post[] @relation("PostCategories")
      }
    `;
    vi.mocked(fs.readFile).mockResolvedValueOnce(manyToManySchema);

    const mockDMMF = {
      datamodel: {
        models: [
          {
            name: 'Post',
            dbName: null,
            fields: [
              {
                name: 'id',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: true,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'categories',
                type: 'Category',
                kind: 'object',
                relationName: 'PostCategories',
                isList: true,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
            ],
            uniqueFields: [],
            uniqueIndexes: [],
            primaryKey: null,
            isGenerated: false,
          },
          {
            name: 'Category',
            dbName: null,
            fields: [
              {
                name: 'id',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: true,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'name',
                type: 'String',
                kind: 'scalar',
                isList: false,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
              {
                name: 'posts',
                type: 'Post',
                kind: 'object',
                relationName: 'PostCategories',
                isList: true,
                isRequired: true,
                isUnique: false,
                isId: false,
                isReadOnly: false,
                hasDefaultValue: false,
                isGenerated: false,
                isUpdatedAt: false,
              },
            ],
            uniqueFields: [],
            uniqueIndexes: [],
            primaryKey: null,
            isGenerated: false,
          },
        ],
        enums: [],
        types: [],
      },
      schema: {
        inputObjectTypes: {},
        outputObjectTypes: {},
        enumTypes: {},
        fieldRefTypes: {},
      },
      mappings: {
        modelOperations: [],
        otherOperations: { read: [], write: [] },
      },
    };

    // Disable ESLint for this specific line since the DMMF type is very complex
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(PrismaInternals.getDMMF).mockResolvedValueOnce(mockDMMF as any);

    const expected: ParsedSchema = {
      models: [
        {
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
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: 'categories',
              type: 'relation',
              kind: 'object',
              enumName: undefined,
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: {
                relatedModelName: 'Category',
                relationName: 'PostCategories',
              },
            },
          ],
        },
        {
          name: 'Category',
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
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: 'name',
              type: 'string',
              kind: 'scalar',
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: 'posts',
              type: 'relation',
              kind: 'object',
              enumName: undefined,
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: {
                relatedModelName: 'Post',
                relationName: 'PostCategories',
              },
            },
          ],
        },
      ],
      enums: [],
    };
    const result = await parsePrismaSchema('./dummy-schema.prisma');
    expect(result).toEqual(expected);
  });

  // TODO: Add tests for various field types (Int, Float, Json, etc.)
  // TODO: Add tests for @@map on models
  // TODO: Add tests for lists (String[])
  // TODO: Add tests for unique constraints
});
