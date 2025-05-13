import { generateServiceFileContent } from '@generator/generateService';
import { describe, it, expect, vi } from 'vitest';
import type { ParsedModel } from '@parser/types';
import type { DMMF } from '@prisma/generator-helper';

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

// Mock getPrismaPath to return a fixed path
vi.mock('@generator/getPrismaPath', () => ({
  getPrismaPath: vi.fn().mockResolvedValue('prisma/schema/generated/client'),
}));

describe('generateServiceFileContent', () => {
  it('should generate correct service file content for a User model', async () => {
    const model: ParsedModel = {
      name: 'User',
      dbName: null,
      fields: [
        {
          name: 'id',
          type: 'string',
          kind: 'scalar' as DMMF.FieldKind,
          isRequired: true,
          isId: true,
          isUnique: true,
          isUpdatedAt: false,
          isList: false,
          hasDefaultValue: true,
        },
        {
          name: 'email',
          type: 'string',
          kind: 'scalar' as DMMF.FieldKind,
          isRequired: true,
          isId: false,
          isUnique: true,
          isUpdatedAt: false,
          isList: false,
          hasDefaultValue: false,
        },
      ],
    };

    const result = await generateServiceFileContent(model);
    expect(result).toMatchSnapshot();
    expect(result).toContain('export const findManyUser');
    expect(result).toContain('export const createUser');
    expect(result).toContain('export const findUserById');
    expect(result).toContain('export const updateUser');
    expect(result).toContain('export const deleteUser');

    // Model name in prisma client access should be camelCase
    expect(result).toContain('prisma.user.findMany');
    expect(result).toContain('prisma.user.create');
    expect(result).toContain('prisma.user.findUnique');
    expect(result).toContain('prisma.user.update');
    expect(result).toContain('prisma.user.delete');
  });

  it('should generate service file content with a custom prisma client path', async () => {
    const result = await generateServiceFileContent(
      userModel,
      '../../libs/prisma'
    );
    expect(result).toContain("from '../../libs/prisma'");
    // Use snapshot testing for the generated code string
    expect(result).toMatchSnapshot();
  });

  it('should generate service file content for a model without an ID', async () => {
    const model: ParsedModel = {
      name: 'Junction',
      dbName: null,
      fields: [
        {
          name: 'userId',
          type: 'relation',
          kind: 'object' as DMMF.FieldKind,
          isRequired: true,
          isId: false,
          isUnique: false,
          isUpdatedAt: false,
          isList: false,
          hasDefaultValue: false,
          relationInfo: {
            relatedModelName: 'User',
            relationName: null,
          },
        },
      ],
    };

    const result = await generateServiceFileContent(model);
    expect(result).toMatchSnapshot();
    // Should only include findMany and create functions
    expect(result).toContain('export const findManyJunction');
    expect(result).toContain('export const createJunction');
    // Should not include ID-based functions
    expect(result).not.toContain('export const findJunctionById');
    expect(result).not.toContain('export const updateJunction');
    expect(result).not.toContain('export const deleteJunction');
  });

  it('should use number type for ID if the id field type is number', async () => {
    const model: ParsedModel = {
      name: 'Product',
      dbName: null,
      fields: [
        {
          name: 'id',
          type: 'number',
          kind: 'scalar' as DMMF.FieldKind,
          isRequired: true,
          isId: true,
          isUnique: true,
          isUpdatedAt: false,
          isList: false,
          hasDefaultValue: true,
        },
      ],
    };

    const result = await generateServiceFileContent(model);
    expect(result).toMatchSnapshot();
    // ID parameter should be typed as number
    expect(result).toContain('id: number');
  });

  it('should generate service file content with a custom prisma client path', async () => {
    const model: ParsedModel = {
      name: 'User',
      dbName: null,
      fields: [
        {
          name: 'id',
          type: 'string',
          kind: 'scalar' as DMMF.FieldKind,
          isRequired: true,
          isId: true,
          isUnique: true,
          isUpdatedAt: false,
          isList: false,
          hasDefaultValue: true,
        },
      ],
    };

    const customPath = '@prisma/custom-client';
    const result = await generateServiceFileContent(model, customPath);
    expect(result).toMatchSnapshot();
    expect(result).toContain(
      `import type { PrismaClient } from '${customPath}'`
    );
  });

  it('should preserve underscores in model names when generating prisma client access', async () => {
    const model: ParsedModel = {
      name: 'Hist_AuditoriaDesarrollador',
      dbName: null,
      fields: [
        {
          name: 'id',
          type: 'string',
          kind: 'scalar' as DMMF.FieldKind,
          isRequired: true,
          isId: true,
          isUnique: true,
          isUpdatedAt: false,
          isList: false,
          hasDefaultValue: true,
        },
      ],
    };

    const result = await generateServiceFileContent(model);
    expect(result).toMatchSnapshot();

    // Function names should use PascalCase without underscores
    expect(result).toContain('export const findManyHistAuditoriaDesarrollador');
    expect(result).toContain('export const createHistAuditoriaDesarrollador');

    // Prisma client access should preserve the underscore
    expect(result).toContain('prisma.hist_AuditoriaDesarrollador.findMany');
    expect(result).toContain('prisma.hist_AuditoriaDesarrollador.create');
    expect(result).toContain('prisma.hist_AuditoriaDesarrollador.findUnique');
    expect(result).toContain('prisma.hist_AuditoriaDesarrollador.update');
    expect(result).toContain('prisma.hist_AuditoriaDesarrollador.delete');
  });
});
