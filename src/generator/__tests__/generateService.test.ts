import { describe, it, expect } from 'vitest';
import { generateServiceFileContent } from '@generator/generateService';
import type { ParsedModel } from '@parser/types';

// Mock data for a simple User model
const userModel: ParsedModel = {
  name: 'User',
  fields: [
    {
      name: 'id',
      type: 'string',
      kind: 'scalar',
      isId: true,
      isRequired: true,
      isUnique: true,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: 'email',
      type: 'string',
      kind: 'scalar',
      isId: false,
      isRequired: true,
      isUnique: true,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: 'name',
      type: 'string',
      kind: 'scalar',
      isId: false,
      isRequired: false,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: 'role',
      type: 'enum',
      kind: 'enum',
      enumName: 'Role',
      isId: false,
      isRequired: true,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    }, // Example enum field
  ],
  dbName: null,
};

// Mock data for a model without an ID field (e.g., LogEntry)
const logEntryModel: ParsedModel = {
  name: 'LogEntry',
  fields: [
    {
      name: 'message',
      type: 'string',
      kind: 'scalar',
      isId: false,
      isRequired: true,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: 'level',
      type: 'string',
      kind: 'scalar',
      isId: false,
      isRequired: true,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
    {
      name: 'timestamp',
      type: 'date',
      kind: 'scalar',
      isId: false,
      isRequired: true,
      isUnique: false,
      isList: false,
      hasDefaultValue: false,
    },
  ],
  dbName: null,
};

describe('generateServiceFileContent', () => {
  it('should generate correct service file content for a User model', () => {
    const result = generateServiceFileContent(userModel, '@prisma/client');
    // Use snapshot testing for the generated code string
    expect(result).toMatchSnapshot();
  });

  it('should generate service file content with a custom prisma client path', () => {
    const result = generateServiceFileContent(userModel, '../../libs/prisma');
    expect(result).toContain("from '../../libs/prisma'");
    // Use snapshot testing for the generated code string
    expect(result).toMatchSnapshot();
  });

  it('should generate service file content for a model without an ID', () => {
    const result = generateServiceFileContent(logEntryModel, '@prisma/client');
    expect(result).toContain('findManyLogEntry');
    expect(result).toContain('createLogEntry');
    // Assert that ID-based functions are NOT present
    expect(result).not.toContain('export const findLogEntryById');
    expect(result).not.toContain('export const updateLogEntry');
    expect(result).not.toContain('export const deleteLogEntry');
    expect(result).toMatchSnapshot();
  });

  it('should use number type for ID if the id field type is number', () => {
    const modelWithNumericId: ParsedModel = {
      ...userModel,
      name: 'Product',
      dbName: null,
      fields: [
        {
          name: 'id',
          type: 'number',
          kind: 'scalar',
          isId: true,
          isRequired: true,
          isUnique: true,
          isList: false,
          hasDefaultValue: false,
        },
        ...userModel.fields.filter((f) => f.name !== 'id'),
      ],
    };
    const result = generateServiceFileContent(
      modelWithNumericId,
      '@prisma/client'
    );
    expect(result).toContain('id: number');
    expect(result).toContain('findProductById');
    expect(result).toContain('updateProduct');
    expect(result).toContain('deleteProduct');
    // Update snapshot with new format
    expect(result).toMatchSnapshot();
  });
});
