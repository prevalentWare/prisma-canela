import { describe, it, expect } from "vitest";
import type { ParsedModel } from "../../parser/types"; // Adjusted import path
import { generateRoutesFileContent } from "../generateRoutes"; // Adjusted import path
import type { ZodSchemaDetails } from "../types"; // Import from shared types

// Mock Data
const mockUserModel: ParsedModel = {
  name: "User",
  dbName: "users",
  fields: [
    {
      name: "id",
      type: "number",
      kind: "scalar",
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: true,
      hasDefaultValue: true,
    },
    {
      name: "email",
      type: "string",
      kind: "scalar",
      isList: false,
      isRequired: true,
      isUnique: true,
      isId: false,
      hasDefaultValue: false,
    },
    {
      name: "name",
      type: "string",
      kind: "scalar",
      isList: false,
      isRequired: false,
      isUnique: false,
      isId: false,
      hasDefaultValue: false,
    },
    // Example enum field
    {
      name: "role",
      type: "enum",
      kind: "enum",
      enumName: "Role", // Assume an enum Role exists
      isList: false,
      isRequired: true,
      isUnique: false,
      isId: false,
      hasDefaultValue: false,
    },
  ],
};

const mockZodSchemaInfo: ZodSchemaDetails = {
  imports: [
    `import { UserSchema, createUserSchema, updateUserSchema } from './schema';`,
    `import { Role } from '@prisma/client';`, // Assuming enum comes from prisma client
  ],
  modelSchemaName: "UserSchema",
  createSchemaName: "createUserSchema",
  updateSchemaName: "updateUserSchema",
};

describe("generateRoutesFileContent", () => {
  it("should generate correct refactored route file content for a User model", () => {
    const result = generateRoutesFileContent(mockUserModel, mockZodSchemaInfo);

    // Check for controller import
    expect(result).toContain("import * as controller from './controller';");
    // Check Zod/Hono imports still exist
    expect(result).toContain(
      "import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';"
    );
    expect(result).toContain("from './schema';");
    // Check service import is REMOVED
    expect(result).not.toContain("from './service';");
    // Check handler definitions are REMOVED
    expect(result).not.toContain("const handleListUser = async");
    expect(result).not.toContain("const handleGetUserById = async");
    // Check route definitions still exist
    expect(result).toContain("const listUserRoute = createRoute");
    expect(result).toContain("const getUserByIdRoute = createRoute");
    expect(result).toContain("const createUserRoute = createRoute");
    expect(result).toContain("const updateUserRoute = createRoute");
    expect(result).toContain("const deleteUserRoute = createRoute");
    // Check routes are mapped to controller functions using standard Hono methods and validator
    expect(result).toMatch(/userRoutes\.get\(\s*'\/',\s*controller\.listUser/);
    expect(result).toMatch(
      /userRoutes\.post\(\s*'\/',\s*validator\('json'/ // Check POST starts correctly
    );
    expect(result).toMatch(/\s*controller\.createUser/); // Check controller follows validator
    expect(result).toMatch(
      /userRoutes\.get\(\s*'\/{id}',\s*validator\('param'/ // Check GET by ID starts correctly
    );
    expect(result).toMatch(/\s*controller\.getUserById/); // Check controller follows validator
    expect(result).toMatch(
      /userRoutes\.patch\(\s*'\/{id}',\s*validator\('param'/ // Check PATCH starts correctly
    );
    expect(result).toMatch(/\s*validator\('json'/); // Check PATCH includes json validator
    expect(result).toMatch(/\s*controller\.updateUser/); // Check controller follows validators
    expect(result).toMatch(
      /userRoutes\.delete\(\s*'\/{id}',\s*validator\('param'/ // Check DELETE starts correctly
    );
    expect(result).toMatch(/\s*controller\.deleteUser/); // Check controller follows validator

    expect(result).toMatchSnapshot();
  });

  it("should generate only non-ID routes if model has no ID field", () => {
    const modelWithoutId: ParsedModel = {
      name: "LogEntry",
      dbName: null,
      fields: [
        {
          name: "message",
          type: "string",
          kind: "scalar",
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: false,
        },
        {
          name: "timestamp",
          type: "date",
          kind: "scalar",
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: false,
          hasDefaultValue: true,
        },
      ],
    };
    // Provide necessary Zod info even if updateSchema isn't used in routes
    const logEntryZodInfo: ZodSchemaDetails = {
      imports: [
        `import { LogEntrySchema, createLogEntrySchema, updateLogEntrySchema } from './schema';`,
      ],
      modelSchemaName: "LogEntrySchema",
      createSchemaName: "createLogEntrySchema",
      updateSchemaName: "updateLogEntrySchema",
    };

    const result = generateRoutesFileContent(modelWithoutId, logEntryZodInfo);

    // Check controller import is present
    expect(result).toContain("import * as controller from './controller';");
    // Check LIST and CREATE routes ARE defined
    expect(result).toContain("const listLogEntryRoute = createRoute");
    expect(result).toContain("const createLogEntryRoute = createRoute");
    // Check LIST and CREATE routes ARE mapped using standard Hono methods
    expect(result).toMatch(
      /logEntryRoutes\.get\(\s*'\/',\s*controller\.listLogEntry/ // Check GET list
    );
    expect(result).toMatch(
      /logEntryRoutes\.post\(\s*'\/',\s*validator\('json'/ // Check POST create with validator
    );
    expect(result).toMatch(/\s*controller\.createLogEntry/); // Check controller follows validator

    // Check ID-based routes are NOT defined
    expect(result).not.toContain("const getLogEntryByIdRoute = createRoute");
    expect(result).not.toContain("const updateLogEntryRoute = createRoute");
    expect(result).not.toContain("const deleteLogEntryRoute = createRoute");
    // Check ID-based routes are NOT mapped
    expect(result).not.toContain("openapi(getLogEntryByIdRoute");
    expect(result).not.toContain("openapi(updateLogEntryRoute");
    expect(result).not.toContain("openapi(deleteLogEntryRoute");

    expect(result).toMatchSnapshot();
  });
});
