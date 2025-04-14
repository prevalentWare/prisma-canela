/**
 * Generates a middleware file that injects the Prisma client into the Hono context.
 * This is used to provide the Prisma client to all route handlers.
 *
 * @returns The content of the middleware file as a string.
 */
export function generatePrismaMiddlewareFileContent(): string {
  return `import { PrismaClient } from '@prisma/client';
import type { Context, Next } from 'hono';

// Default Prisma client instance
let prismaInstance: PrismaClient | null = null;

/**
 * Creates a Prisma middleware with the given Prisma client instance
 * 
 * @param prismaClient Optional custom Prisma client instance.
 * If not provided, a singleton instance will be created.
 * @returns A middleware function that injects the Prisma client into the context
 */
export function createPrismaMiddleware(prismaClient?: PrismaClient) {
  // Use provided client or create a singleton instance
  if (prismaClient) {
    prismaInstance = prismaClient;
  } else if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }

  /**
   * Middleware that injects the Prisma client into the request context
   * This makes the database client available in all route handlers
   */
  return async (c: Context, next: Next) => {
    // Inject the Prisma client into the context
    c.set('prisma', prismaInstance);
    await next();
  };
}

/**
 * Default middleware instance with a singleton Prisma client
 * For custom configuration, use createPrismaMiddleware() instead
 */
export const prismaMiddleware = createPrismaMiddleware();

/**
 * Cleanup function to disconnect the Prisma client
 * Call this when your application is shutting down
 */
export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
  }
}
`;
}
