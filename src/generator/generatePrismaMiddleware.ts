import { getPrismaPath } from './getPrismaPath';

/**
 * Generates a middleware file that injects the Prisma client into the Hono context.
 * This is used to provide the Prisma client to all route handlers.
 * Uses the new Prisma 7 adapter-based initialization with PrismaPg.
 *
 * @returns The content of the middleware file as a string.
 */
export const generatePrismaMiddlewareFileContent =
  async (): Promise<string> => {
    const prismaClientPath = await getPrismaPath();
    return `import { PrismaClient } from '${prismaClientPath}';
import type { Context, Next } from 'hono';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Extend Hono Context to include the Prisma client
declare module 'hono' {
  interface ContextVariableMap {
    prisma: PrismaClient;
  }
}

// Create a connection pool using the DATABASE_URL environment variable
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create a shared Prisma client instance with the PostgreSQL adapter
export const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

/**
 * Injects the Prisma client into the request context
 * This makes the database client available in all route handlers
 */
export const prismaMiddleware = async (c: Context, next: Next) => {
  // Inject the Prisma client into the context
  c.set('prisma', prisma);
  await next();
};

/**
 * Shorthand function to create a middleware with a custom Prisma client
 * Useful when you want to use your own Prisma client instance
 */
export const createPrismaMiddleware = (customPrisma: PrismaClient = prisma) => {
  return async (c: Context, next: Next) => {
    c.set('prisma', customPrisma);
    await next();
  };
};

/**
 * Creates a new Prisma client with a custom connection string
 * Useful for multi-tenant applications or different database connections
 */
export const createPrismaClient = (connectionString: string): PrismaClient => {
  const customPool = new Pool({ connectionString });
  return new PrismaClient({
    adapter: new PrismaPg(customPool),
  });
};

/**
 * Cleanup function to disconnect the Prisma client and close the pool
 * Call this when your application is shutting down
 */
export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
  await pool.end();
};
`;
  };
