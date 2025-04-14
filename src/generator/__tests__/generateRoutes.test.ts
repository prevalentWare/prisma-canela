import { describe, it, expect } from "vitest";
import type { ParsedModel } from "../../parser/types"; // Adjusted import path
import { generateRoutesFileContent } from "../generateRoutes"; // Adjusted import path
import type { DMMF } from "@prisma/generator-helper";

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

const mockZodSchemaInfo = {
  imports: [
    `import { UserSchema, createUserSchema, updateUserSchema } from './user.schema';`, // Path relative to generated file, not test file
    `import { Role } from '@prisma/client';`, // Assuming enum comes from prisma client
  ],
  modelSchemaName: "UserSchema",
  createSchemaName: "createUserSchema",
  updateSchemaName: "updateUserSchema",
};

const mockServiceFunctionNames = {
  findMany: "findManyUsers",
  findById: "findUserById",
  create: "createUser",
  update: "updateUser",
  delete: "deleteUser",
};

describe("generateRoutesFileContent", () => {
  it("should generate correct route file content for a User model", () => {
    const result = generateRoutesFileContent(
      mockUserModel,
      mockZodSchemaInfo,
      mockServiceFunctionNames
    );
    // Use snapshot testing to compare the output
    expect(result).toMatchSnapshot();
  });

  it("should return an error string if model has no ID field", () => {
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
    const result = generateRoutesFileContent(
      modelWithoutId,
      mockZodSchemaInfo, // Schemas might not be relevant here but needed by function signature
      mockServiceFunctionNames
    );
    expect(result).toContain("Error: Model LogEntry has no ID field");
    expect(result).toMatchSnapshot(); // Snapshot the error message
  });
});
