import { describe, expect, it } from "vitest";
import { generatePrismaMiddlewareFileContent } from "../generatePrismaMiddleware";

describe("generatePrismaMiddlewareFileContent", () => {
  it("should generate middleware content with correct exports", () => {
    const result = generatePrismaMiddlewareFileContent();

    // Check necessary imports
    expect(result).toContain("import { PrismaClient } from '@prisma/client'");
    expect(result).toContain("import type { Context, Next } from 'hono'");

    // Check function exports
    expect(result).toContain("export function createPrismaMiddleware");
    expect(result).toContain("export const prismaMiddleware");
    expect(result).toContain("export async function disconnectPrisma");

    // Check singleton pattern
    expect(result).toContain("let prismaInstance: PrismaClient | null = null");

    // Check middleware implementation
    expect(result).toContain("c.set('prisma', prismaInstance)");
    expect(result).toContain("await next()");

    // Check disconnect function
    expect(result).toContain("await prismaInstance.$disconnect()");
  });
});
