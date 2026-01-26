#!/usr/bin/env node

/**
 * Script to generate a basic Prisma schema for testing
 * Used in CI environments when no schema is available
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const BASIC_SCHEMA = `
// This is a temporary test schema used for CI
// It contains a minimal set of models for testing the code generator

// Note: Prisma 7+ no longer supports 'url' in datasource blocks
// Connection URLs are now configured via prisma.config.ts or PrismaClient constructor
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  posts     Post[]
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
}

enum Role {
  USER
  ADMIN
}
`;

async function generateTestSchema() {
  try {
    // Create prisma directory if it doesn't exist
    const prismaDir = path.join(process.cwd(), 'prisma');
    await fs.mkdir(prismaDir, { recursive: true });

    // Write the schema file
    const schemaPath = path.join(prismaDir, 'schema.prisma');
    await fs.writeFile(schemaPath, BASIC_SCHEMA, 'utf-8');

    console.log(`✅ Test schema created at ${schemaPath}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to create test schema:', error);
    return false;
  }
}

// Run the function when script is executed directly
if (
  process.argv[1] === import.meta.url ||
  process.argv[1].endsWith('generate-test-schema.js')
) {
  generateTestSchema();
}

export { generateTestSchema };
