/**
 * Contains details about the generated Zod schemas for a model.
 */
export interface ZodSchemaDetails {
  imports: string[]; // e.g., ["import { UserSchema, createUserSchema, ... } from './user.schema';"]
  modelSchemaName: string; // e.g., "UserSchema"
  createSchemaName: string; // e.g., "createUserSchema"
  updateSchemaName: string; // e.g., "updateUserSchema"
}

/**
 * Contains the names of the generated service functions for a model.
 */
export interface ServiceFunctionNames {
  findMany: string; // e.g., "findManyUsers"
  findById: string; // e.g., "findUserById"
  create: string; // e.g., "createUser"
  update: string; // e.g., "updateUser"
  delete: string; // e.g., "deleteUser"
}
