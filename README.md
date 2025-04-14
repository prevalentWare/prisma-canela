# Canela 🌿

[![npm version](https://badge.fury.io/js/canela.svg)](https://badge.fury.io/js/canela) <!-- Placeholder -->
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
bun install canela

# Using npm
npm install canela

# Using yarn
yarn add canela
```

## Usage

### Basic Usage

```bash
# Generate API from a Prisma schema
bun canela generate --schema ./prisma/schema.prisma --output ./src/generated
```

### Generated Code Structure

For each model in your Prisma schema, Canela generates:

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
import { Hono } from "hono";
import { userRoutes, accountRoutes } from "./generated";

const app = new Hono();

// Mount generated API routes
app.route("/api/users", userRoutes);
app.route("/api/accounts", accountRoutes);

// Add Swagger UI
import { swaggerUI } from "@hono/swagger-ui";
app.get("/docs/*", swaggerUI({ url: "/api/docs" }));

export default app;
```

### Clean Modular Exports

Canela provides clean, modular exports for easy integration with any Hono application:

```typescript
// Import specific routes
import { userRoutes, accountRoutes } from "./generated";

// Or import all routes as a module
import * as api from "./generated";

// Mount specific routes
app.route("/api/users", userRoutes);

// Or mount all routes dynamically
Object.entries(api.routes).forEach(([name, routes]) => {
  app.route(`/api/${name}s`, routes);
});
```

You can also access the types generated for each model:

```typescript
import { userTypes } from "./generated/user";

// Use the types in your application
const createUserData: userTypes.CreateUserInput = {
  email: "user@example.com",
  name: "Test User",
};
```

### Example Server

You can find a working example of a Hono server using the generated routes in the `examples` directory.
To run the example:

```bash
# Generate the API code first
bun canela generate --schema ./prisma/schema.prisma --output ./src/generated

# Run the example server
bun examples/server.ts
```

The example server demonstrates how to:

- Import and mount the generated routes
- Set up Swagger UI for API documentation
- Provide a Prisma client to the routes

### Upcoming Features

#### Prisma Client from Context

Canela supports extracting the Prisma client from the Hono context instead of creating a new one in each service:

```typescript
// Example of providing Prisma client to routes using the generated middleware
import { PrismaClient } from "@prisma/client";
import { Hono } from "hono";
import {
  createPrismaMiddleware,
  disconnectPrisma,
} from "./generated/middleware/prismaMiddleware";
import { userRoutes } from "./generated";

const prisma = new PrismaClient();
const app = new Hono();

// Use the generated middleware to inject Prisma client into context
app.use("*", createPrismaMiddleware(prisma));

// Mount routes that will use the Prisma client from context
app.route("/api/users", userRoutes);

// Handle shutdown gracefully
process.on("SIGTERM", async () => {
  await disconnectPrisma();
  process.exit(0);
});
```

The generated middleware provides:

- A factory function `createPrismaMiddleware(prismaClient?)` that accepts an optional Prisma client instance
- A default middleware instance `prismaMiddleware` that creates its own singleton client
- A utility function `disconnectPrisma()` for proper cleanup when your application shuts down

All generated service functions extract the Prisma client from the Hono context, with proper error handling for cases when the client is not available.

#### Multi-file Prisma Schema Support

Canela will support the `prismaSchemaFolder` preview feature from Prisma, allowing you to split your schema into multiple files:

```bash
# Generate API from a Prisma schema folder
bun canela generate --schema ./prisma/schema --output ./src/generated
```

```
prisma/
└── schema/
    ├── schema.prisma    # Main schema with datasource and generator
    ├── user.prisma      # User-related models
    └── product.prisma   # Product-related models
```

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
- ✅ Unit tests for core generation features

### In Progress

- 🔄 Use Prisma client from Hono context
- 🔄 Additional unit tests

### Planned

- 📝 Multi-file Prisma schema support
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
- Your feature includes tests
- Code follows the project style guidelines

## License

[MIT](LICENSE) <!-- Placeholder -->
