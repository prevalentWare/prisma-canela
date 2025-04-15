# Canela Example Server

This is a simple server that demonstrates how to use the Canela-generated API routes in a Hono application.

## Setup

1. Make sure you have a PostgreSQL database available.
2. Create a `.env` file in the root of the project with your database connection string:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"
```

3. Install dependencies if you haven't already:

```bash
bun install
```

4. Run the Prisma migrations (if you have a proper schema):

```bash
bun prisma migrate dev
```

## Running the Server

Start the example server with:

```bash
bun examples/server.ts
```

The server will start on port 3000 by default. You can change this by setting the `PORT` environment variable.

## Available Endpoints

- `GET /`: Health check endpoint
- `GET /docs`: Swagger UI for API documentation
- `GET /docs/openapi.json`: OpenAPI specification in JSON format
- `GET /debug/context`: Diagnostic endpoint to verify Prisma is in the context

API endpoints:

- `/users`: User CRUD operations
- `/roles`: Role CRUD operations
- `/pages`: Page CRUD operations
- `/sessions`: Session CRUD operations
- `/accounts`: Account CRUD operations
- `/verifications`: Verification CRUD operations

Each resource supports the following operations:

- `GET /`: List all resources
- `GET /{id}`: Get a resource by ID
- `POST /`: Create a new resource
- `PATCH /{id}`: Update a resource by ID
- `DELETE /{id}`: Delete a resource by ID

## Prisma Middleware Usage

The example server demonstrates how to use the generated Prisma middleware:

```typescript
import {
  prisma,
  prismaMiddleware,
  disconnectPrisma,
} from "../src/generated/middleware/prismaMiddleware";

// Add the middleware to your Hono app
app.use("*", prismaMiddleware);

// Add a diagnostic route to confirm Prisma is in the context
app.get("/debug/context", (c) => {
  return c.json({
    hasPrisma: !!c.get("prisma"),
    contextKeys: Object.keys(c.var),
  });
});

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  await disconnectPrisma();
  process.exit(0);
});
```

The middleware:

1. Provides a shared Prisma client instance exported as `prisma`
2. Injects the Prisma client into the Hono context
3. Makes it available to all route handlers
4. Handles error cases when the client is missing
5. Provides proper cleanup on application shutdown

## Modular Route Import Examples

The server demonstrates two ways to import and use the generated routes:

1. Import specific routes:

```typescript
import { userRoutes, roleRoutes } from "../src/generated";

// Mount routes
app.route("/users", userRoutes);
app.route("/roles", roleRoutes);
```

2. Import all routes as a module:

```typescript
import * as api from "../src/generated";

// Mount all routes
Object.entries(api.routes).forEach(([name, routes]) => {
  app.route(`/${name}s`, routes);
});
```

This approach makes it easy to mount the routes at any path and integrate them with your existing Hono application.
