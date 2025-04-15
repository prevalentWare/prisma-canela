// --- Import DMMF for FieldKind ---
import type { DMMF } from '@prisma/generator-helper';

/**
 * Represents the overall parsed Prisma schema structure.
 */
export interface ParsedSchema {
  models: ParsedModel[];
  enums: ParsedEnum[];
}

/**
 * Represents a parsed Prisma model.
 */
export interface ParsedModel {
  name: string; // Original Prisma model name
  dbName: string | null; // Name in the database (from @@map)
  fields: ParsedField[];
  // Potentially add other model-level info like @@unique, @@index later
}

/**
 * Represents a parsed Prisma field within a model.
 */
export interface ParsedField {
  name: string; // Original Prisma field name
  type: FieldType; // Simplified field type category
  kind: DMMF.FieldKind; // Prisma kind ('scalar', 'enum', 'object', or 'unsupported')
  enumName?: string; // Original DMMF enum type name (e.g., "Enum_RoleName")
  isList: boolean;
  isRequired: boolean;
  isUnique: boolean;
  isId: boolean;
  hasDefaultValue: boolean;
  isUpdatedAt?: boolean; // Tracks if field has @updatedAt
  relationInfo?: ParsedRelationInfo; // Details if it's a relation field
  // Add specifics like default value, @map, validation rules later
}

/**
 * Simplified field type categories.
 */
export type FieldType =
  | 'string'
  | 'number' // Includes Int, Float, BigInt, Decimal
  | 'boolean'
  | 'date' // DateTime
  | 'json'
  | 'enum'
  | 'relation'
  | 'unsupported'; // For types we don't handle initially

/**
 * Represents details about a relation field.
 */
export interface ParsedRelationInfo {
  relatedModelName: string;
  relationName: string | null; // Explicit @relation name
  // Add fields, references, onDelete, onUpdate later
}

/**
 * Represents a parsed Prisma enum.
 */
export interface ParsedEnum {
  name: string;
  values: string[];
}
