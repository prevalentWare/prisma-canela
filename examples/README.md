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

API endpoints (all prefixed with `/api`):

- `/api/users`: User CRUD operations
- `/api/roles`: Role CRUD operations
- `/api/pages`: Page CRUD operations
- `/api/sessions`: Session CRUD operations
- `/api/accounts`: Account CRUD operations
- `/api/verifications`: Verification CRUD operations

Each resource supports the following operations:

- `GET /`: List all resources
- `GET /{id}`: Get a resource by ID
- `POST /`: Create a new resource
- `PATCH /{id}`: Update a resource by ID
- `DELETE /{id}`: Delete a resource by ID

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
