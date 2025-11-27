import { describe, expect, it } from 'vitest';
import { generatePrismaMiddlewareFileContent } from '@generator/generatePrismaMiddleware';

describe('generatePrismaMiddlewareFileContent', () => {
  it('should generate middleware content with correct exports', async () => {
    const result = await generatePrismaMiddlewareFileContent();

    // Check necessary imports
    expect(result).toContain('import { PrismaClient }');
    expect(result).toContain("import type { Context, Next } from 'hono'");
    expect(result).toContain("import { PrismaPg } from '@prisma/adapter-pg'");
    expect(result).toContain("import { Pool } from 'pg'");

    // Check context type extension
    expect(result).toContain("declare module 'hono'");
    expect(result).toContain('interface ContextVariableMap');

    // Check connection pool setup
    expect(result).toContain(
      'const pool = new Pool({ connectionString: process.env.DATABASE_URL })'
    );

    // Check shared Prisma instance with adapter
    expect(result).toContain('export const prisma = new PrismaClient({');
    expect(result).toContain('adapter: new PrismaPg(pool)');

    // Check function exports
    expect(result).toContain('export const prismaMiddleware');
    expect(result).toContain('export const createPrismaMiddleware');
    expect(result).toContain('export const createPrismaClient');
    expect(result).toContain('export const disconnectPrisma');

    // Check middleware implementation
    expect(result).toContain("c.set('prisma', prisma)");
    expect(result).toContain('await next()');

    // Check custom middleware factory
    expect(result).toContain(
      'createPrismaMiddleware = (customPrisma: PrismaClient = prisma)'
    );
    expect(result).toContain("c.set('prisma', customPrisma)");

    // Check createPrismaClient helper
    expect(result).toContain('createPrismaClient = (connectionString: string)');
    expect(result).toContain(
      'const customPool = new Pool({ connectionString })'
    );

    // Check disconnect function with pool cleanup
    expect(result).toContain('await prisma.$disconnect()');
    expect(result).toContain('await pool.end()');
  });
});
