import { getPrismaPath } from './getPrismaPath';

/**
 * Generates a middleware file that injects the Prisma client into the Hono context.
 * This is used to provide the Prisma client to all route handlers.
 *
 * @returns The content of the middleware file as a string.
 */
export const generatePrismaMiddlewareFileContent =
  async (): Promise<string> => {
    const prismaClientPath = await getPrismaPath();
    return `import { PrismaClient } from '${prismaClientPath}';
import type { Context, Next } from 'hono';

// Extend Hono Context to include the Prisma client
declare module 'hono' {
  interface ContextVariableMap {
    prisma: PrismaClient;
  }
}

// Create a shared Prisma client instance
export const prisma = new PrismaClient();

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
 * Shorthand function to create a middleware with the given Prisma client
 * Useful when you want to use your own Prisma client instance
 */
export const createPrismaMiddleware = (customPrisma: PrismaClient = prisma) => {
  return async (c: Context, next: Next) => {
    c.set('prisma', customPrisma);
    await next();
  };
};

/**
 * Cleanup function to disconnect the Prisma client
 * Call this when your application is shutting down
 */
export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
};
`;
  };
