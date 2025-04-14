import { describe, it, expect } from "vitest";
import { generateControllerFileContent } from "../generateController";
import type { ParsedModel } from "../../parser/types";
import type { ZodSchemaDetails, ServiceFunctionNames } from "../types";

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
  findById: "findLogEntryById",
  create: "createLogEntry",
  update: "updateLogEntry",
  delete: "deleteLogEntry",
};

// --- Test Suite ---

describe("generateControllerFileContent", () => {
  it("should generate correct controller content for a standard model (User)", () => {
    const result = generateControllerFileContent(
      userModel,
      userZodSchemaInfo,
      userServiceNames
    );
    // Basic checks
    expect(result).toContain("import type { Context } from 'hono';");
    expect(result).toContain("import { Prisma } from '@prisma/client';");
    expect(result).toContain("from './schema';");
    expect(result).toContain("from './service';");
    expect(result).toContain("export const listUser = async (c: Context)");
    expect(result).toContain("export const createUser = async (c: Context)");
    expect(result).toContain("export const getUserById = async (c: Context)");
    expect(result).toContain("export const updateUser = async (c: Context)");
    expect(result).toContain("export const deleteUser = async (c: Context)");
    expect(result).toContain("await findManyUsers()");
    expect(result).toContain("await createUser(data)");
    expect(result).toContain("await findUserById(id)");
    expect(result).toContain("await updateUser(id, data)");
    expect(result).toContain("await deleteUser(id)");
    expect(result).toContain("return c.json(items);");
    expect(result).toContain("return c.json(newItem, 201);");
    expect(result).toContain(
      "return c.json({ error: 'User not found' }, 404);"
    );
    expect(result).toContain(
      "if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025')"
    );
    // Snapshot
    expect(result).toMatchSnapshot();
  });

  it("should generate correct controller content for a model with numeric ID (Product)", () => {
    const result = generateControllerFileContent(
      productModel,
      productZodSchemaInfo,
      productServiceNames
    );
    expect(result).toContain(
      "export const getProductById = async (c: Context)"
    );
    expect(result).toContain("const id = c.req.valid('param').id as number;"); // Check for number type assertion
    expect(result).toContain("await findProductById(id)");
    expect(result).toContain("await updateProduct(id, data)");
    expect(result).toContain("await deleteProduct(id)");
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
    // Check that base handlers are present
    expect(result).toContain("export const listLogEntry = async (c: Context)");
    expect(result).toContain(
      "export const createLogEntry = async (c: Context)"
    );
    expect(result).toContain("await findManyLogEntries()");
    expect(result).toContain("await createLogEntry(data)");
    // Check that ID-specific handlers are NOT present
    expect(result).not.toContain("export const getLogEntryById");
    expect(result).not.toContain("export const updateLogEntry");
    expect(result).not.toContain("export const deleteLogEntry");
    // Check that ID-specific service calls are NOT present
    expect(result).not.toContain("await findLogEntryById(id)");
    expect(result).not.toContain("await updateLogEntry(id, data)");
    expect(result).not.toContain("await deleteLogEntry(id)");
    expect(result).toMatchSnapshot();
  });
});
