import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { PrismaClient } from "@prisma/client";

// Import routes from generated code
// Import specific routes
import { userRoutes, roleRoutes, pageRoutes } from "../src/generated";
// Alternative: import all routes as a module
import * as api from "../src/generated";

// Import the generated prismaMiddleware
import {
  createPrismaMiddleware,
  disconnectPrisma,
} from "../src/generated/middleware/prismaMiddleware";

// Create Prisma client
const prisma = new PrismaClient();

// Create main app
const app = new Hono();

// Add middleware
app.use("*", logger());
app.use("*", prettyJSON());

// Add middleware to inject Prisma client into context using the generated middleware
// Pass the Prisma client instance to the middleware factory
app.use("*", createPrismaMiddleware(prisma));

// Build OpenAPI app with generated routes
const openApiApp = new OpenAPIHono();

// Mount specific routes
openApiApp.route("/users", userRoutes);
openApiApp.route("/roles", roleRoutes);
openApiApp.route("/pages", pageRoutes);

// Mount all routes from the api object
Object.entries(api.routes).forEach(([name, routes]) => {
  if (!["user", "role", "page"].includes(name)) {
    // Skip already mounted routes
    openApiApp.route(`/${name}s`, routes);
  }
});

// Generate OpenAPI documentation
const openApiDoc = openApiApp.getOpenAPIDocument({
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Canela API",
    description: "Auto-generated API using Canela code generator",
  },
});

// Mount OpenAPI app and docs
app.route("/api", openApiApp);
app.get("/docs", swaggerUI({ url: "/docs/openapi.json" }));
app.get("/docs/openapi.json", (c) => {
  return c.json(openApiDoc);
});

// Health check route
app.get("/", (c) => c.json({ status: "ok", message: "Canela API is running" }));

// Start server
const port = process.env.PORT || 3000;
console.log(`Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port: Number(port),
});

// Handle shutdown gracefully
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await disconnectPrisma(); // Use the generated disconnect function instead
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await disconnectPrisma(); // Use the generated disconnect function instead
  process.exit(0);
});
