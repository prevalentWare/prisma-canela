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

## Adding New Scripts

When adding new utility scripts:

1. Place them in this directory
2. Make them executable (`chmod +x scripts/your-script.js`)
3. Add a description in this README
4. Add a corresponding npm script in package.json if appropriate
