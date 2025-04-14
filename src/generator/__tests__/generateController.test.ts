import { describe, it, expect } from "vitest";
import { generateControllerFileContent } from "../generateController";
import type { ParsedModel } from "../../parser/types";
import type { ZodSchemaDetails, ServiceFunctionNames } from "../types";
import * as z from "zod"; // Need z for inferring types

// --- Mock Data ---

// Shared Zod Schema Info (example for a 'User' model)
const userZodSchemaInfo: ZodSchemaDetails = {
  imports: [
    "import { UserSchema, createUserSchema, updateUserSchema } from './schema';",
    "import { Role } from '@prisma/client';", // Example enum import
  ],
  modelSchemaName: "UserSchema",
  createSchemaName: "createUserSchema",
  updateSchemaName: "updateUserSchema",
};

// Shared Service Function Names (example for a 'User' model)
const userServiceNames: ServiceFunctionNames = {
  findMany: "findManyUsers",
  findById: "findUserById",
  create: "createUser",
  update: "updateUser",
  delete: "deleteUser",
};

// 1. Standard Model (User with string ID)
const userModel: ParsedModel = {
  name: "User",
  dbName: null,
  fields: [
    {
      name: "id",
      type: "string",
      kind: "scalar",
      isId: true,
      isRequired: true,
      isUnique: true,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: "email",
      type: "string",
      kind: "scalar",
      isId: false,
      isRequired: true,
      isUnique: true,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: "name",
      type: "string",
      kind: "scalar",
      isId: false,
      isRequired: false,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: "role",
      type: "enum",
      kind: "enum",
      enumName: "Role",
      isId: false,
      isRequired: true,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
  ],
};

// 2. Model with Numeric ID (Product)
const productModel: ParsedModel = {
  name: "Product",
  dbName: null,
  fields: [
    {
      name: "productId",
      type: "number",
      kind: "scalar",
      isId: true,
      isRequired: true,
      isUnique: true,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: "name",
      type: "string",
      kind: "scalar",
      isId: false,
      isRequired: true,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: "price",
      type: "number",
      kind: "scalar",
      isId: false,
      isRequired: true,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
  ],
};
const productZodSchemaInfo: ZodSchemaDetails = {
  imports: [],
  modelSchemaName: "ProductSchema",
  createSchemaName: "createProductSchema",
  updateSchemaName: "updateProductSchema",
};
const productServiceNames: ServiceFunctionNames = {
  findMany: "findManyProducts",
  findById: "findProductById",
  create: "createProduct",
  update: "updateProduct",
  delete: "deleteProduct",
};

// 3. Model without ID (LogEntry)
const logEntryModel: ParsedModel = {
  name: "LogEntry",
  dbName: null,
  fields: [
    {
      name: "message",
      type: "string",
      kind: "scalar",
      isId: false,
      isRequired: true,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: "level",
      type: "string",
      kind: "scalar",
      isId: false,
      isRequired: true,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: "timestamp",
      type: "date",
      kind: "scalar",
      isId: false,
      isRequired: true,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
  ],
};
const logEntryZodSchemaInfo: ZodSchemaDetails = {
  imports: [],
  modelSchemaName: "LogEntrySchema",
  createSchemaName: "createLogEntrySchema",
  updateSchemaName: "updateLogEntrySchema",
};
const logEntryServiceNames: ServiceFunctionNames = {
  findMany: "findManyLogEntries",
  findById: "findLogEntryById", // Still need this for the type even if not used
  create: "createLogEntry",
  update: "updateLogEntry", // Still need this for the type even if not used
  delete: "deleteLogEntry", // Still need this for the type even if not used
};

// --- Test Suite ---

describe("generateControllerFileContent", () => {
  it("should generate correct controller content for a standard model (User)", () => {
    const result = generateControllerFileContent(
      userModel,
      userZodSchemaInfo,
      userServiceNames
    );
    // --- Assertions ---
    // Check imports
    expect(result).toContain("import type { Context } from 'hono';");
    expect(result).toContain("import * as service from './service';"); // Check service import
    expect(result).toContain(
      "import type { createUserSchema, updateUserSchema } from './schema';"
    );
    expect(result).toContain(
      "type CreateInput = z.infer<typeof createUserSchema>;"
    );
    expect(result).toContain(
      "type UpdateInput = z.infer<typeof updateUserSchema>;"
    );
    expect(result).toContain("import { Prisma } from '@prisma/client';"); // Check Prisma import for errors

    // Check function definitions (Updated Signatures)
    expect(result).toContain("export const listUser = async (c: Context)");
    expect(result).toContain("export const createUser = async (c: Context)"); // Simplified check
    expect(result).toContain("export const getUserById = async (c: Context)"); // Simplified check
    expect(result).toContain("export const updateUser = async (c: Context)"); // Simplified check
    expect(result).toContain("export const deleteUser = async (c: Context)"); // Simplified check

    // Check service function calls
    expect(result).toContain("await service.findManyUsers(c);");
    expect(result).toContain("await service.createUser(c, data);");
    expect(result).toContain("await service.findUserById(c, id);");
    expect(result).toContain("await service.updateUser(c, id, data);");
    expect(result).toContain("await service.deleteUser(c, id);");

    // Check basic ID retrieval (string ID)
    expect(result).toContain("const { id } = getValidData(c, 'param');"); // Updated assertion for param destructuring

    // Check error handling for Prisma known request errors (e.g., P2025)
    expect(result).toContain(
      "if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')"
    );
    expect(result).toContain(
      "return c.json({ error: 'User not found' }, 404);"
    );

    // Check generic error handling
    expect(result).toContain(
      "console.error(message, error); // Log the detailed error"
    );
    expect(result).toContain("return c.json({ error: `Failed to");

    expect(result).toMatchSnapshot(); // Keep snapshot check
  });

  it("should generate correct controller content for a model with numeric ID (Product)", () => {
    const result = generateControllerFileContent(
      productModel,
      productZodSchemaInfo,
      productServiceNames
    );
    // --- Assertions ---
    // Check imports (similar to User, but with Product schemas)
    expect(result).toContain("import type { Context } from 'hono';");
    expect(result).toContain("import * as service from './service';");
    expect(result).toContain(
      "import type { createProductSchema, updateProductSchema } from './schema';"
    );
    expect(result).toContain(
      "type CreateInput = z.infer<typeof createProductSchema>;"
    );
    expect(result).toContain(
      "type UpdateInput = z.infer<typeof updateProductSchema>;"
    );
    expect(result).toContain("import { Prisma } from '@prisma/client';");

    // Check function definitions (Updated Signatures)
    expect(result).toContain("export const listProduct = async (c: Context)");
    expect(result).toContain("export const createProduct = async (c: Context)"); // Simplified check
    expect(result).toContain(
      "export const getProductById = async (c: Context)"
    ); // Simplified check
    expect(result).toContain("export const updateProduct = async (c: Context)"); // Simplified check
    expect(result).toContain("export const deleteProduct = async (c: Context)"); // Simplified check

    // Check service function calls
    expect(result).toContain("await service.findManyProducts(c);");
    expect(result).toContain("await service.createProduct(c, data);");
    expect(result).toContain("await service.findProductById(c, id);");
    expect(result).toContain("await service.updateProduct(c, id, data);");
    expect(result).toContain("await service.deleteProduct(c, id);");

    // Check numeric ID retrieval - relaxed check
    expect(result).toContain("const { id } = getValidData(c, 'param');"); // Type is handled by route validation

    // Check error handling
    expect(result).toContain(
      "if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')"
    );
    expect(result).toContain(
      "return c.json({ error: 'Product not found' }, 404);"
    );

    expect(result).toMatchSnapshot();
  });

  it("should generate correct controller content for a model without an ID (LogEntry)", () => {
    const result = generateControllerFileContent(
      logEntryModel,
      logEntryZodSchemaInfo,
      logEntryServiceNames
    );
    // --- Assertions ---
    // Check imports
    expect(result).toContain("import type { Context } from 'hono';");
    expect(result).toContain("import * as service from './service';");
    expect(result).toContain(
      "import type { createLogEntrySchema, updateLogEntrySchema } from './schema';" // Still expect update schema import even if not used in controller
    );
    expect(result).toContain(
      "type CreateInput = z.infer<typeof createLogEntrySchema>;"
    );
    // No UpdateInput type needed if no update handler

    // Check that only list and create functions are defined (Updated Signatures)
    expect(result).toContain("export const listLogEntry = async (c: Context)");
    expect(result).toContain(
      "export const createLogEntry = async (c: Context)"
    ); // Simplified check

    // Check service function calls
    expect(result).toContain("await service.findManyLogEntries(c);");
    expect(result).toContain("await service.createLogEntry(c, data);");

    // Check that ID-specific handlers are NOT present
    expect(result).not.toContain("export const getLogEntryById = async");
    expect(result).not.toContain("export const updateLogEntry = async");
    expect(result).not.toContain("export const deleteLogEntry = async");
    expect(result).not.toContain("findLogEntryById(id)"); // Check no service calls for ID ops
    expect(result).not.toContain("updateLogEntry(id, data)");
    expect(result).not.toContain("deleteLogEntry(id)");

    expect(result).toMatchSnapshot();
  });
});
