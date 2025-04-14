import { describe, expect, it } from "vitest";
import {
  generateModelIndexFileContent,
  generateRootIndexFileContent,
} from "../generateIndex";
import type { ParsedModel } from "../../parser/types";

describe("generateModelIndexFileContent", () => {
  it("should generate model index file content correctly", () => {
    const mockModel: ParsedModel = {
      name: "user",
      dbName: null,
      fields: [
        {
          name: "id",
          type: "string",
          isId: true,
          isRequired: true,
          isList: false,
          isUnique: true,
          hasDefaultValue: false,
          kind: "scalar",
        },
        {
          name: "name",
          type: "string",
          isId: false,
          isRequired: true,
          isList: false,
          isUnique: false,
          hasDefaultValue: false,
          kind: "scalar",
        },
        {
          name: "email",
          type: "string",
          isId: false,
          isRequired: true,
          isList: false,
          isUnique: true,
          hasDefaultValue: false,
          kind: "scalar",
        },
      ],
    };

    const result = generateModelIndexFileContent(mockModel);

    // Check that the result contains the expected exports
    expect(result).toContain("export const userRoutes = routes");
    expect(result).toContain("export const userTypes = types");
    expect(result).toContain("export default routes");

    // Check imports
    expect(result).toContain("import routes from './routes'");
    expect(result).toContain("import * as types from './types'");

    // Make sure it has proper documentation
    expect(result).toContain("Hono routes for the User model");
    expect(result).toContain("Types for the User model");
  });
});

describe("generateRootIndexFileContent", () => {
  it("should generate root index file content with multiple models", () => {
    const mockModels: ParsedModel[] = [
      {
        name: "user",
        dbName: null,
        fields: [
          {
            name: "id",
            type: "string",
            isId: true,
            isRequired: true,
            isList: false,
            isUnique: true,
            hasDefaultValue: false,
            kind: "scalar",
          },
        ],
      },
      {
        name: "post",
        dbName: null,
        fields: [
          {
            name: "id",
            type: "string",
            isId: true,
            isRequired: true,
            isList: false,
            isUnique: true,
            hasDefaultValue: false,
            kind: "scalar",
          },
        ],
      },
      {
        name: "comment",
        dbName: null,
        fields: [
          {
            name: "id",
            type: "string",
            isId: true,
            isRequired: true,
            isList: false,
            isUnique: true,
            hasDefaultValue: false,
            kind: "scalar",
          },
        ],
      },
    ];

    const result = generateRootIndexFileContent(mockModels);

    // Check imports
    expect(result).toContain("import userRoutes from './user'");
    expect(result).toContain("import postRoutes from './post'");
    expect(result).toContain("import commentRoutes from './comment'");

    // Check named exports
    expect(result).toContain("export { userRoutes }");
    expect(result).toContain("export { postRoutes }");
    expect(result).toContain("export { commentRoutes }");

    // Check routes object
    expect(result).toContain("export const routes = {");
    expect(result).toContain("user: userRoutes,");
    expect(result).toContain("post: postRoutes,");
    expect(result).toContain("comment: commentRoutes,");

    // Check default export
    expect(result).toContain("export default routes");
  });
});
