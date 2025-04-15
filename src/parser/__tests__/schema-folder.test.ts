import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import type { Dirent, Stats } from 'node:fs';

// Mock modules before imports
vi.mock('node:fs/promises', () => {
  // Create mock functions inside the mock factory to avoid hoisting issues
  const mockReaddir = vi.fn();
  const mockReadFile = vi.fn();
  const mockStat = vi.fn();
  const mockAccess = vi.fn();

  return {
    readdir: mockReaddir,
    readFile: mockReadFile,
    stat: mockStat,
    access: mockAccess,
    default: {
      readdir: mockReaddir,
      readFile: mockReadFile,
      stat: mockStat,
      access: mockAccess,
    },
  };
});

// Mock @prisma/internals directly without type assertion
vi.mock('@prisma/internals', () => ({
  getDMMF: vi.fn().mockResolvedValue({
    datamodel: {
      enums: [],
      models: [],
      types: [],
      indexes: [],
    },
    schema: {
      rootQueryType: undefined,
      rootMutationType: undefined,
      inputObjectTypes: { model: [], prisma: [] },
      outputObjectTypes: { model: [], prisma: [] },
      enumTypes: { model: [], prisma: [] },
      fieldRefTypes: {},
    },
    mappings: {
      modelOperations: [],
      otherOperations: { read: [], write: [] },
    },
  }),
}));

// Import modules after mocking
import * as fs from 'node:fs/promises';
import { parsePrismaSchema, parsePrismaSchemaFolder } from 'src/parser';
import { getDMMF } from '@prisma/internals';

// Helper function to create mock Dirent objects
const createMockDirent = (name: string, isFile = true): Dirent => {
  return {
    name,
    isFile: () => isFile,
    isDirectory: () => !isFile,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  } as Dirent;
};

describe('Multi-file Prisma Schema Support', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.resetAllMocks();

    // Ensure getDMMF has the correct mock implementation for each test
    vi.mocked(getDMMF).mockResolvedValue({
      datamodel: {
        enums: [],
        models: [],
        types: [],
        indexes: [],
      },
      schema: {
        rootQueryType: undefined,
        rootMutationType: undefined,
        inputObjectTypes: { model: [], prisma: [] },
        outputObjectTypes: { model: [], prisma: [] },
        enumTypes: { model: [], prisma: [] },
        fieldRefTypes: {},
      },
      mappings: {
        modelOperations: [],
        otherOperations: { read: [], write: [] },
      },
    });
  });

  describe('parsePrismaSchemaFolder', () => {
    it('should read and combine all .prisma files in a directory', async () => {
      // Setup mocks
      const mockSchemaDir = '/fake/path/prisma/schema';

      // Mock readdir to return Dirent objects
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('schema1.prisma'),
        createMockDirent('schema2.prisma'),
      ]);

      // Mock readFile to return different content for each file
      vi.mocked(fs.readFile).mockImplementation((filePath) => {
        if (typeof filePath === 'string') {
          if (filePath === path.join(mockSchemaDir, 'schema1.prisma')) {
            return Promise.resolve(
              'datasource db { provider = "postgresql" }\ngenerator client { provider = "prisma-client-js" }'
            );
          }
          if (filePath === path.join(mockSchemaDir, 'schema2.prisma')) {
            return Promise.resolve('model User { id Int @id }');
          }
        }
        return Promise.resolve(
          'datasource db { provider = "postgresql" }\ngenerator client { provider = "prisma-client-js" }'
        );
      });

      // Call the function with our mock directory
      await parsePrismaSchemaFolder(mockSchemaDir);

      // Expect that readdir was called with our directory
      expect(fs.readdir).toHaveBeenCalledWith(mockSchemaDir);
    });

    it('should throw an error if no .prisma files are found', async () => {
      // Setup mocks
      const mockSchemaDir = '/fake/path/prisma/schema';

      // Mock readdir to return no .prisma files
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('notASchema.txt'),
      ]);

      // Expect the function to throw
      await expect(parsePrismaSchemaFolder(mockSchemaDir)).rejects.toThrow(
        'No .prisma files found in directory'
      );
    });

    it('should throw an error if required blocks are missing', async () => {
      // Setup mocks
      const mockSchemaDir = '/fake/path/prisma/schema';

      // Mock readdir to return our test files
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('schema.prisma'),
      ]);

      // Mock readFile to return content without required blocks
      vi.mocked(fs.readFile).mockResolvedValue('model Test { id Int @id }');

      // Expect the function to throw for missing datasource
      await expect(parsePrismaSchemaFolder(mockSchemaDir)).rejects.toThrow(
        'missing required "datasource" block'
      );
    });
  });

  describe('parsePrismaSchema', () => {
    it('should handle a directory path by calling parsePrismaSchemaFolder', async () => {
      // Setup mocks
      const mockSchemaDir = '/fake/path/prisma/schema';

      // Mock stat to indicate a directory
      const dirStats = {
        isDirectory: () => true,
        isFile: () => false,
      };

      vi.mocked(fs.stat).mockResolvedValue(dirStats as unknown as Stats);

      // Mock successful folder parsing
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent('schema.prisma'),
      ]);
      vi.mocked(fs.readFile).mockResolvedValue(
        'datasource db { provider = "postgresql" }\ngenerator client { provider = "prisma-client-js" }'
      );

      // Call parsePrismaSchema with directory
      await parsePrismaSchema(mockSchemaDir);

      // Expect stat was called to check if path is directory
      expect(fs.stat).toHaveBeenCalledWith(
        expect.stringContaining(mockSchemaDir)
      );

      // Expect readdir was called to get schema files
      expect(fs.readdir).toHaveBeenCalled();
    });

    it('should handle a file path by calling parseSingleSchemaFile', async () => {
      // Setup mocks
      const mockSchemaFile = '/fake/path/prisma/schema.prisma';

      // Mock stat to indicate a file
      const fileStats = {
        isDirectory: () => false,
        isFile: () => true,
      };

      vi.mocked(fs.stat).mockResolvedValue(fileStats as unknown as Stats);

      // Mock readFile for single file
      vi.mocked(fs.readFile).mockResolvedValue(
        'datasource db { provider = "postgresql" }\ngenerator client { provider = "prisma-client-js" }'
      );

      // Call parsePrismaSchema with file
      await parsePrismaSchema(mockSchemaFile);

      // Expect stat was called to check if path is directory
      expect(fs.stat).toHaveBeenCalledWith(
        expect.stringContaining(mockSchemaFile)
      );

      // Expect readFile was called once for the file
      expect(fs.readFile).toHaveBeenCalledWith(mockSchemaFile, 'utf-8');
    });
  });
});
