/**
 * Generates a middleware file that injects the Prisma client into the Hono context.
 * This is used to provide the Prisma client to all route handlers.
 *
 * @returns The content of the middleware file as a string.
 */
export function generatePrismaMiddlewareFileContent(): string {
  return `import { PrismaClient } from '@prisma/client';
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
export function createPrismaMiddleware(customPrisma: PrismaClient = prisma) {
  return async (c: Context, next: Next) => {
    c.set('prisma', customPrisma);
    await next();
  };
}

/**
 * Cleanup function to disconnect the Prisma client
 * Call this when your application is shutting down
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
`;
}
