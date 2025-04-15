# Prisma-Canela 🌿

[![npm version](https://badge.fury.io/js/prisma-canela.svg)](https://badge.fury.io/js/prisma-canela) <!-- Placeholder -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) <!-- Placeholder -->

Canela is a codegen tool that takes a Prisma schema and generates a fully typed REST API using [Hono](https://hono.dev/) and [Zod](https://zod.dev/).

## Features

- **Prisma Schema Driven:** Generates API endpoints directly from your data models.
- **Fully Typed:** Leverages Zod for request/response validation and OpenAPIHono for type-safe routing.
- **Vertical Slicing:** Organizes generated code by feature (model) for better maintainability.
- **Standard REST Endpoints:** Automatically creates CRUD (Create, Read, Update, Delete) endpoints for each model:
  - `GET /models`: List all items.
  - `GET /models/:id`: Fetch a single item by ID.
  - `POST /models`: Create a new item.
  - `PATCH /models/:id`: Update an item by ID.
  - `DELETE /models/:id`: Delete an item by ID.
- **OpenAPI Ready:** Generates routes compatible with `OpenAPIHono` for easy Swagger/OpenAPI documentation.
- **Type Inference:** Automatically generates TypeScript types from Zod schemas.
- **Error Handling:** Built-in error handling for common Prisma errors and HTTP responses.
- **Clean Modular Exports:** Easy to import and mount the generated routes in any Hono application.

## Technology Stack

- [Hono](https://hono.dev/): Web framework for the generated API.
- [Zod](https://zod.dev/): Schema validation.
- [Prisma](https://www.prisma.io/): Database ORM and schema definition.
- [TypeScript](https://www.typescriptlang.org/): Language for the codegen and the generated API.
- [Bun](https://bun.sh/): JavaScript runtime and package manager.

## Getting Started

### Prerequisites

- Node.js 18+
- Bun (recommended)
- A Prisma schema

### Installation

```bash
# Using bun (recommended)
bun install @prevalentware/prisma-canela

# Using npm
npm install @prevalentware/prisma-canela

# Using yarn
yarn add @prevalentware/prisma-canela
```

## Usage

### Basic Usage

```bash
# Generate API from a Prisma schema
bun @prevalentware/prisma-canela generate --schema ./prisma/schema.prisma --output ./src/generated
```

### Generated Code Structure

For each model in your Prisma schema, Prisma-Canela generates:

```
src/generated/
├── index.ts            # Root exports for all models
└── modelName/
    ├── schema.ts      # Zod schemas for validation
    ├── types.ts       # TypeScript types derived from Zod schemas
    ├── controller.ts  # Request handlers
    ├── service.ts     # Database operations
    ├── routes.ts      # Hono routes with OpenAPI
    └── index.ts       # Exports for this model
```

### Using Generated API

```typescript
// In your main app file
import { Hono } from 'hono';
import { userRoutes, accountRoutes } from './generated';

const app = new Hono();

// Mount generated API routes
app.route('/api/users', userRoutes);
app.route('/api/accounts', accountRoutes);

// Add Swagger UI
import { swaggerUI } from '@hono/swagger-ui';
app.get('/docs/*', swaggerUI({ url: '/api/docs' }));

export default app;
```

### Simplified Route Registration

Prisma-Canela provides a utility function to register all routes at once, making it easier to mount all routes on your Hono app:

```typescript
// Import the utility function
import { registerAllRoutes } from './generated';
import { OpenAPIHono } from '@hono/zod-openapi';
import { createPrismaMiddleware } from './generated/middleware/prismaMiddleware';

// Create a Prisma client
const prisma = new PrismaClient();

// Create an OpenAPIHono app and add the middleware
const api = new OpenAPIHono();
api.use('*', createPrismaMiddleware(prisma));

// Register all routes at once with a single function call
registerAllRoutes(api, {
  prefix: '', // Optional path prefix for all routes
  pluralize: true, // Whether to add 's' to route paths (default: true)
});

// Mount the API app on your main app
app.route('/api', api);
```

This approach simplifies the process of adding new routes as your schema evolves, since you don't need to manually add each new model's routes.

### Clean Modular Exports

Prisma-Canela provides clean, modular exports for easy integration with any Hono application:

```typescript
// Import specific routes
import { userRoutes, accountRoutes } from './generated';

// Or import all routes as a module
import * as api from './generated';

// Import all types for a specific model
import { userTypes } from './generated/user';

// Access model-specific types
const newUser: userTypes.CreateUserInput = {
  name: 'John Doe',
  email: 'john@example.com',
};
```

The modular export pattern allows you to choose exactly what you need for your application.

### Example Server

The generated code includes a complete example server implementation in [examples/server.ts](examples/server.ts):

```typescript
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';

// Import routes and utility functions from generated code
import { registerAllRoutes } from '../src/generated';

// Import the generated prismaMiddleware
import {
  prisma,
  prismaMiddleware,
  disconnectPrisma,
} from '../src/generated/middleware/prismaMiddleware';

// Create a single OpenAPIHono app for everything
const app = new OpenAPIHono();

// Add middleware
app.use('*', logger());
app.use('*', prettyJSON());

// Apply prismaMiddleware to inject the Prisma client
app.use('*', prismaMiddleware);

// Add diagnostic route to check prisma in context
app.get('/debug/context', (c) => {
  return c.json({
    hasPrisma: !!c.get('prisma'),
    contextKeys: Object.keys(c.var),
  });
});

// Register all API routes
registerAllRoutes(app, { prefix: '' });

// Generate OpenAPI documentation
const openApiDoc = app.getOpenAPIDocument({
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Prisma-Canela API',
    description: 'Auto-generated API using Prisma-Canela code generator',
  },
});

// Swagger UI documentation
app.get('/docs', swaggerUI({ url: '/docs/openapi.json' }));
app.get('/docs/openapi.json', (c) => {
  return c.json(openApiDoc);
});

// Health check route
app.get('/', (c) =>
  c.json({ status: 'ok', message: 'Prisma-Canela API is running' })
);

// Start server
const port = process.env.PORT || 3000;
console.log(`Server starting on port ${port}...`);
console.log(`API available at http://localhost:${port}`);
console.log(`API documentation at http://localhost:${port}/docs`);

serve({
  fetch: app.fetch,
  port: Number(port),
});

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await disconnectPrisma();
  process.exit(0);
});
```

Run the example server with:

```bash
cd examples
bun install
bun dev
```

Then access:

- API documentation: http://localhost:3000/docs
- Health check: http://localhost:3000/
- API endpoints: http://localhost:3000/users, etc.
- Diagnostic route: http://localhost:3000/debug/context

### Current Features

#### Prisma Client Middleware

The generated middleware makes it easy to use Prisma in your Hono routes:

```typescript
// Import the middleware from the generated code
import {
  prisma,
  prismaMiddleware,
  disconnectPrisma,
} from './src/generated/middleware/prismaMiddleware';

// Add it to your Hono app
app.use('*', prismaMiddleware);

// Now you can access prisma in your route handlers:
app.get('/users', async (c) => {
  const users = await c.get('prisma').user.findMany();
  return c.json(users);
});

// For graceful shutdown:
process.on('SIGTERM', async () => {
  await disconnectPrisma();
  process.exit(0);
});
```

Benefits of the generated middleware:

1. **Type safety**: The Prisma client is correctly typed based on your schema
2. **Context accessibility**: Available through `c.get("prisma")` in all routes
3. **Simplified shared instance**: Uses a single shared Prisma client for your application
4. **Clean disconnection**: Utility function for proper cleanup during shutdown
5. **Type extensions**: Automatically extends the Hono context type definition

#### Multi-file Prisma Schema Support

Prisma-Canela supports Prisma's multi-file schema feature (introduced in Prisma 5.15.0), allowing you to split your schema across multiple files for better organization:

```
prisma/
└── schema/
    ├── schema.prisma    # Main schema with datasource and generator blocks
    ├── user.prisma      # User-related models
    ├── product.prisma   # Product-related models
    └── order.prisma     # Order-related models
```

The tool automatically detects if you're using a single schema file or a directory of schema files:

1. If you've enabled the `prismaSchemaFolder` preview feature in Prisma
2. If you have a `prisma/schema` directory containing `.prisma` files

You don't need to do anything special - just run the CLI command as usual:

```bash
bun @prevalentware/prisma-canela generate
```

The tool will:

1. First look for schema location in your package.json (prisma.schema field)
2. If not found, look for the standard schema.prisma file
3. If not found, check if a prisma/schema directory exists with .prisma files
4. Use the first one found

You can also explicitly specify a schema directory:

```bash
bun @prevalentware/prisma-canela generate --schema ./prisma/schema
```

##### Multi-file Schema Best Practices

For the best results with multi-file schemas:

- Keep datasource and generator blocks in a main schema file (e.g., schema.prisma)
- Group related models into domain-specific files
- Use clear naming conventions for schema files

### Upcoming Features

#### Multi-file Prisma Schema Support

Prisma-Canela supports Prisma's multi-file schema feature (introduced in Prisma 5.15.0), allowing you to split your schema across multiple files for better organization:

```
prisma/
└── schema/
    ├── schema.prisma    # Main schema with datasource and generator blocks
    ├── user.prisma      # User-related models
    ├── product.prisma   # Product-related models
    └── order.prisma     # Order-related models
```

The tool automatically detects if you're using a single schema file or a directory of schema files:

1. If you've enabled the `prismaSchemaFolder` preview feature in Prisma
2. If you have a `prisma/schema` directory containing `.prisma` files

You don't need to do anything special - just run the CLI command as usual:

```bash
bun @prevalentware/prisma-canela generate
```

The tool will:

1. First look for schema location in your package.json (prisma.schema field)
2. If not found, look for the standard schema.prisma file
3. If not found, check if a prisma/schema directory exists with .prisma files
4. Use the first one found

You can also explicitly specify a schema directory:

```bash
bun @prevalentware/prisma-canela generate --schema ./prisma/schema
```

#### Multi-file Schema Best Practices

For the best results with multi-file schemas:

- Keep datasource and generator blocks in a main schema file (e.g., schema.prisma)
- Group related models into domain-specific files
- Use clear naming conventions for schema files

### Configuration Options

_(Coming Soon)_

## Development Status

### Completed

- ✅ Core Prisma schema parser
- ✅ Zod schema generation
- ✅ TypeScript type generation
- ✅ Controller generation with error handling
- ✅ OpenAPI route generation
- ✅ Service layer for database operations
- ✅ Modular route exports for seamless integration
- ✅ Prisma client from Hono context
- ✅ Route registration utilities
- ✅ Multi-file Prisma schema support
- ✅ Unit tests for core generation features

### In Progress

- 🔄 Additional unit tests

### Planned

- 📝 Relation handling in API
- 📝 Configuration options
- 📝 Authentication & authorization integration
- 📝 Integration tests
- 📝 Documentation enhancements

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Before submitting your code, please make sure:

- All tests pass (`bun run test`)
- Code linting passes (`bun run lint`)
- Your feature includes tests
- Code follows the project style guidelines

### Code Style and Linting

This project uses ESLint to enforce consistent code style and best practices:

- Use absolute imports with path aliases (e.g., `@parser/types`) instead of relative imports
- Follow TypeScript best practices and maintain type safety
- Use function expressions and arrow functions over function declarations
- Keep files under 300 lines to maintain readability
- Write descriptive variable and function names
- Follow established patterns in the codebase

To check your code against our linting rules:

```bash
bun run lint
```

To automatically fix issues:

```bash
bun run lint -- --fix
```

## License

[MIT](LICENSE) <!-- Placeholder -->
