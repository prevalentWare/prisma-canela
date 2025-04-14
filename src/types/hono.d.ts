import { Context as HonoContext } from "hono";
import type { z } from "zod";
import type { PrismaClient } from "@prisma/client";

// Extend Hono's Context and Request types to fix validator typing issues
declare module "hono" {
  interface Context {
    req: {
      // Allow any string type for validation but with better return typing
      valid<T extends string>(
        target: T
      ): T extends "json" ? any : T extends "param" ? any : any;
    } & Request;

    // Add Prisma client to the context
    prisma: PrismaClient;
  }

  // Helper type for middleware that use Prisma client
  type PrismaMiddleware = (
    c: Context,
    next: () => Promise<void>
  ) => Promise<void>;
}

// Export a type for context with Prisma client
export type PrismaClientContext = HonoContext & {
  prisma: PrismaClient;
};
