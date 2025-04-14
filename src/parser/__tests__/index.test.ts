import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs/promises";
// --- Adjusted import path ---
import { parsePrismaSchema } from "../index";
// --- Adjusted import path ---
import type { ParsedSchema } from "../types";

// Mock the fs.readFile function
vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
  },
}));

// Helper to set mock implementation for readFile
const mockReadFile = (content: string) => {
  vi.mocked(fs.readFile).mockResolvedValue(content);
};

describe("Prisma Schema Parser", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // Restore mocks after each test
  });

  it("should parse a simple schema with one model and basic fields", async () => {
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

    mockReadFile(simpleSchema);

    const expected: ParsedSchema = {
      models: [
        {
          name: "Post",
          dbName: null,
          fields: [
            {
              name: "id",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: true,
              hasDefaultValue: true,
              relationInfo: undefined,
            },
            {
              name: "title",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "content",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "published",
              type: "boolean",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: true,
              relationInfo: undefined,
            },
            {
              name: "createdAt",
              type: "date",
              kind: "scalar",
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

    // Since parsePrismaSchema takes a path, we provide one, but readFile is mocked
    const result = await parsePrismaSchema("./dummy-schema.prisma");

    // We use deep equality check
    expect(result).toEqual(expected);
  });

  // --- Test Case 1: Enums ---
  it("should parse a schema with enums", async () => {
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
    mockReadFile(enumSchema);

    const expected: ParsedSchema = {
      models: [
        {
          name: "User",
          dbName: null,
          fields: [
            {
              name: "id",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: true,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "role",
              type: "enum",
              kind: "enum",
              enumName: "Role",
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
      enums: [{ name: "Role", values: ["USER", "ADMIN"] }],
    };

    const result = await parsePrismaSchema("./dummy-schema.prisma");
    expect(result).toEqual(expected);
  });

  // --- Test Case 2: One-to-One ---
  it("should parse a schema with a one-to-one relationship", async () => {
    const oneToOneSchema = `
      model User {
        id      String  @id
        profile Profile? @relation("UserProfile")
      }

      model Profile {
        id     String @id
        bio    String?
        user   User   @relation("UserProfile", fields: [userId], references: [id])
        userId String @unique // relation scalar field (used in fields)
      }
    `;
    mockReadFile(oneToOneSchema);

    const expected: ParsedSchema = {
      models: [
        {
          name: "User",
          dbName: null,
          fields: [
            {
              name: "id",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: true,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "profile",
              type: "relation",
              kind: "object",
              enumName: undefined,
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: {
                relatedModelName: "Profile",
                relationName: "UserProfile",
              },
            },
          ],
        },
        {
          name: "Profile",
          dbName: null,
          fields: [
            {
              name: "id",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: true,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "bio",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "user",
              type: "relation",
              kind: "object",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: {
                relatedModelName: "User",
                relationName: "UserProfile",
              },
            },
            {
              name: "userId",
              type: "string",
              kind: "scalar",
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
    const result = await parsePrismaSchema("./dummy-schema.prisma");
    expect(result).toEqual(expected);
  });

  // --- Test Case 3: One-to-Many ---
  it("should parse a schema with a one-to-many relationship", async () => {
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
    mockReadFile(oneToManySchema);
    const expected: ParsedSchema = {
      models: [
        {
          name: "User",
          dbName: null,
          fields: [
            {
              name: "id",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: true,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "posts",
              type: "relation",
              kind: "object",
              enumName: undefined,
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: {
                relatedModelName: "Post",
                relationName: "UserPosts",
              },
            },
          ],
        },
        {
          name: "Post",
          dbName: null,
          fields: [
            {
              name: "id",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: true,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "title",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "author",
              type: "relation",
              kind: "object",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: {
                relatedModelName: "User",
                relationName: "UserPosts",
              },
            },
            {
              name: "authorId",
              type: "string",
              kind: "scalar",
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
    const result = await parsePrismaSchema("./dummy-schema.prisma");
    expect(result).toEqual(expected);
  });

  // --- Test Case 4: Many-to-Many ---
  it("should parse a schema with a many-to-many relationship", async () => {
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
    mockReadFile(manyToManySchema);
    const expected: ParsedSchema = {
      models: [
        {
          name: "Post",
          dbName: null,
          fields: [
            {
              name: "id",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: true,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "categories",
              type: "relation",
              kind: "object",
              enumName: undefined,
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: {
                relatedModelName: "Category",
                relationName: "PostCategories",
              },
            },
          ],
        },
        {
          name: "Category",
          dbName: null,
          fields: [
            {
              name: "id",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: true,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "name",
              type: "string",
              kind: "scalar",
              enumName: undefined,
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: undefined,
            },
            {
              name: "posts",
              type: "relation",
              kind: "object",
              enumName: undefined,
              isList: true,
              isRequired: true,
              isUnique: false,
              isId: false,
              hasDefaultValue: false,
              relationInfo: {
                relatedModelName: "Post",
                relationName: "PostCategories",
              },
            },
          ],
        },
      ],
      enums: [],
    };
    const result = await parsePrismaSchema("./dummy-schema.prisma");
    expect(result).toEqual(expected);
  });

  // TODO: Add tests for various field types (Int, Float, Json, etc.)
  // TODO: Add tests for @@map on models
  // TODO: Add tests for lists (String[])
  // TODO: Add tests for unique constraints
});
