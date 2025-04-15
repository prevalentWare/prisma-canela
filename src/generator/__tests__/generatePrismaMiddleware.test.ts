import { describe, expect, it } from 'vitest';
import { generatePrismaMiddlewareFileContent } from '../generatePrismaMiddleware';

describe('generatePrismaMiddlewareFileContent', () => {
  it('should generate middleware content with correct exports', () => {
    const result = generatePrismaMiddlewareFileContent();

    // Check necessary imports
    expect(result).toContain("import { PrismaClient } from '@prisma/client'");
    expect(result).toContain("import type { Context, Next } from 'hono'");

    // Check context type extension
    expect(result).toContain("declare module 'hono'");
    expect(result).toContain('interface ContextVariableMap');

    // Check shared Prisma instance
    expect(result).toContain('export const prisma = new PrismaClient()');

    // Check function exports
    expect(result).toContain('export const prismaMiddleware');
    expect(result).toContain('export function createPrismaMiddleware');
    expect(result).toContain('export async function disconnectPrisma');

    // Check middleware implementation
    expect(result).toContain("c.set('prisma', prisma)");
    expect(result).toContain('await next()');

    // Check custom middleware factory
    expect(result).toContain(
      'createPrismaMiddleware(customPrisma: PrismaClient = prisma)'
    );
    expect(result).toContain("c.set('prisma', customPrisma)");

    // Check disconnect function
    expect(result).toContain('await prisma.$disconnect()');
  });
});
