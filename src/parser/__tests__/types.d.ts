/**
 * Type definition for the DMMF mock used in testing
 * This simplifies the full DMMF type from Prisma to just what we need for tests
 */
export type MockDMMF = {
  datamodel: {
    models: Array<{
      name: string;
      dbName: string | null;
      fields: Array<{
        name: string;
        type: string;
        kind: string;
        isList: boolean;
        isRequired: boolean;
        isUnique: boolean;
        isId: boolean;
        isReadOnly: boolean;
        hasDefaultValue: boolean;
        isGenerated: boolean;
        isUpdatedAt: boolean;
        [key: string]: unknown;
      }>;
      uniqueFields: unknown[];
      uniqueIndexes: unknown[];
      primaryKey: unknown | null;
      isGenerated: boolean;
    }>;
    enums: Array<{
      name: string;
      values: Array<{
        name: string;
        dbName: string | null;
      }>;
      dbName: string | null;
    }>;
    types: unknown[];
  };
  schema: {
    inputObjectTypes: Record<string, unknown>;
    outputObjectTypes: Record<string, unknown>;
    enumTypes: Record<string, unknown>;
    fieldRefTypes: Record<string, unknown>;
  };
  mappings: {
    modelOperations: unknown[];
    otherOperations: {
      read: unknown[];
      write: unknown[];
    };
  };
};
