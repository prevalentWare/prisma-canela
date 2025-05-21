import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { joinPathForImport, normalizePath } from '../getPrismaPath';

describe('getPrismaPath utility functions', () => {
  describe('joinPathForImport', () => {
    it('should join path segments with forward slashes', () => {
      const result = joinPathForImport(
        'prisma',
        'schema',
        'generated',
        'client'
      );
      expect(result).toBe('prisma/schema/generated/client');
    });

    it('should handle empty segments', () => {
      const result = joinPathForImport('prisma', '', 'client');
      expect(result).toBe('prisma//client');
    });
  });

  describe('normalizePath', () => {
    it('should convert Windows backslashes to forward slashes', () => {
      const windowsPath = 'prisma\\schema\\generated\\client';
      expect(normalizePath(windowsPath)).toBe('prisma/schema/generated/client');
    });

    it('should leave Unix paths unchanged', () => {
      const unixPath = 'prisma/schema/generated/client';
      expect(normalizePath(unixPath)).toBe('prisma/schema/generated/client');
    });

    it('should handle mixed path separators', () => {
      const mixedPath = 'prisma/schema\\generated/client';
      expect(normalizePath(mixedPath)).toBe('prisma/schema/generated/client');
    });
  });

  describe('Path normalization for cross-platform imports', () => {
    it('should normalize Windows paths (backslashes) to forward slashes', () => {
      // Simulate Windows path
      const windowsPath = 'prisma\\schema\\generated';
      const normalizedPath = normalizePath(windowsPath);
      const result = joinPathForImport(normalizedPath, 'client');

      expect(result).toBe('prisma/schema/generated/client');
    });

    it('should maintain Unix paths correctly', () => {
      const unixPath = 'prisma/schema/generated';
      const normalizedPath = normalizePath(unixPath);
      const result = joinPathForImport(normalizedPath, 'client');

      expect(result).toBe('prisma/schema/generated/client');
    });

    it('should correctly normalize paths using actual code logic', () => {
      // This test simulates the actual getPrismaPath implementation logic
      const simulatePathLogic = (inputPath: string): string => {
        const normalizedPath = normalizePath(inputPath);
        return joinPathForImport(normalizedPath, 'client');
      };

      // Windows path with backslashes
      const windowsPath = 'prisma\\schema\\generated';
      expect(simulatePathLogic(windowsPath)).toBe(
        'prisma/schema/generated/client'
      );

      // Unix path with forward slashes
      const unixPath = 'prisma/schema/generated';
      expect(simulatePathLogic(unixPath)).toBe(
        'prisma/schema/generated/client'
      );

      // Mixed separators
      const mixedPath = 'prisma\\schema/generated';
      expect(simulatePathLogic(mixedPath)).toBe(
        'prisma/schema/generated/client'
      );
    });
  });
});
