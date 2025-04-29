# Utility Scripts

This directory contains utility scripts for development and CI purposes.

## Scripts

### `generate-test-schema.js`

This script generates a basic Prisma schema for testing purposes. It's primarily used in CI environments where a Prisma schema might not be available.

#### Usage

```bash
# Run directly
node scripts/generate-test-schema.js

# Run with bun
bun scripts/generate-test-schema.js

# Run via npm script
npm run prepare-test-schema

# Run via bun script
bun run prepare-test-schema
```

The script creates a minimal schema with:

- A User model
- A Post model with a relation to User
- A Role enum

This schema is sufficient for testing code generation features but is not committed to the repository.

## WASM Path Fix

The `fix-wasm-paths.js` script fixes a critical issue related to hardcoded paths in the bundled code. When the package is built using Bun, it sometimes includes absolute paths to WASM files from the local development environment, which breaks when users install the package.

The script:

1. Copies the necessary WASM files from `node_modules/@prisma/prisma-schema-wasm/src/` to a package-local directory
2. Modifies the bundled code to use dynamic path resolution instead of hardcoded paths
3. Ensures the package works correctly when installed by end users

This is automatically run as part of the build process.

## Adding New Scripts

When adding new utility scripts:

1. Place them in this directory
2. Make them executable (`chmod +x scripts/your-script.js`)
3. Add a description in this README
4. Add a corresponding npm script in package.json if appropriate
