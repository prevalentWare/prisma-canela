import { describe, it, expect } from "vitest";
// Import the functions to test (adjust path if necessary)
// We need to export generateZodSchema and mapFieldTypeToZodType for testing
// For now, let's test generateZodSchema which uses the mapper internally.
// We might need to adjust the generator file to export helpers if needed.
import { generateZodSchema } from "../index"; // Placeholder, need exported helpers
import type { ParsedModel, ParsedEnum, ParsedField } from "../../parser/types"; // Adjust path

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

function mapFieldTypeToZodType_Test(
  field: ParsedField,
  enums: ParsedEnum[]
): string {
  // Simplified test version or copy of actual implementation
  if (field.isList) {
    const singleField: ParsedField = { ...field, isList: false };
    const singleType = mapFieldTypeToZodType_Test(singleField, enums);
    return `z.array(${singleType})`;
  }
  if (field.kind === "enum") {
    const enumDef = enums.find((e) => e.name === field.enumName);
    if (enumDef) {
      const enumValues = enumDef.values.map((val) => `'${val}'`).join(", ");
      return `z.enum([${enumValues}])`;
    } else {
      return "z.string()";
    }
  }
  switch (field.type) {
    case "string":
      return "z.string()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "date":
      return "z.date()";
    case "json":
      return "z.record(z.any())";
    default:
      return "z.any()";
  }
}

function generateZodSchema_Test(
  model: ParsedModel,
  enums: ParsedEnum[]
): string {
  const { name, fields } = model;
  const modelNameLower = name.toLowerCase();
  const zodFields = fields
    .filter((field) => field.kind !== "object")
    .map((field) => {
      const zodType = mapFieldTypeToZodType_Test(field, enums);
      let fieldDefinition = `  ${field.name}: ${zodType}`;
      if (!field.isRequired) {
        fieldDefinition += ".optional()";
      }
      return fieldDefinition;
    })
    .join(",\n");

  return `
import { z } from 'zod';

// TODO: Import actual enum definitions if needed elsewhere

export const ${modelNameLower}Schema = z.object({
${zodFields}
});

export type ${name} = z.infer<typeof ${modelNameLower}Schema>;
`;
}

// --- End Mock Implementation ---

describe("Zod Schema Generation", () => {
  it("should generate correct Zod schema for a simple model", () => {
    const simpleModel: ParsedModel = {
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
          isUnique: true,
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
          name: "likes",
          type: "number",
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
          name: "published",
          type: "boolean",
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
          name: "meta",
          type: "json",
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
          name: "publishedAt",
          type: "date",
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
            relationName: "PostAuthor",
          },
        },
      ],
    };

    const expectedSchema = `
import { z } from 'zod';

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional(),
  likes: z.number(),
  published: z.boolean(),
  meta: z.record(z.any()).optional(),
  publishedAt: z.date().optional()
});

export type Post = z.infer<typeof postSchema>;
`;

    const generatedSchema = generateZodSchema(simpleModel, []);

    // Normalize whitespace for comparison
    expect(generatedSchema.trim()).toEqual(expectedSchema.trim());
  });

  // --- Added test case for enums ---
  it("should generate correct Zod schema for a model with enums", () => {
    const enumModel: ParsedModel = {
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
          enumName: "Enum_Role",
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: true,
          relationInfo: undefined,
        },
        {
          name: "status",
          type: "enum",
          kind: "enum",
          enumName: "Enum_Status",
          isList: false,
          isRequired: false,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
        },
      ],
    };
    const enums: ParsedEnum[] = [
      { name: "Enum_Role", values: ["USER", "ADMIN"] },
      { name: "Enum_Status", values: ["ACTIVE", "INACTIVE"] },
    ];
    const expectedSchema = `
import { z } from 'zod';
import { Enum_Role, Enum_Status } from '@prisma/client';

export const userSchema = z.object({
  id: z.string(),
  role: z.nativeEnum(Enum_Role),
  status: z.nativeEnum(Enum_Status).optional()
});

export type User = z.infer<typeof userSchema>;
`;
    const generatedSchema = generateZodSchema(enumModel, enums);
    expect(generatedSchema.trim()).toEqual(expectedSchema.trim());
  });

  // --- Added test case for list/array fields ---
  it("should generate correct Zod schema for a model with list fields", () => {
    const listModel: ParsedModel = {
      name: "Config",
      dbName: "configs",
      fields: [
        {
          name: "id",
          type: "number",
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
          name: "tags",
          type: "string",
          kind: "scalar",
          enumName: undefined,
          isList: true,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
        },
        {
          name: "values",
          type: "number",
          kind: "scalar",
          enumName: undefined,
          isList: true,
          isRequired: false,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
        },
        {
          name: "permissions",
          type: "enum",
          kind: "enum",
          enumName: "Enum_Perms",
          isList: true,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
          relationInfo: undefined,
        },
      ],
    };
    const enums: ParsedEnum[] = [
      { name: "Enum_Perms", values: ["READ", "WRITE", "DELETE"] },
    ];
    const expectedSchema = `
import { z } from 'zod';
import { Enum_Perms } from '@prisma/client';

export const configSchema = z.object({
  id: z.number(),
  tags: z.array(z.string()),
  values: z.array(z.number()).optional(),
  permissions: z.array(z.nativeEnum(Enum_Perms))
});

export type Config = z.infer<typeof configSchema>;
`;
    const generatedSchema = generateZodSchema(listModel, enums);
    expect(generatedSchema.trim()).toEqual(expectedSchema.trim());
  });
});
