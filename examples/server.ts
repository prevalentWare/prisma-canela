import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';

// Import routes and utility functions from generated code
import { registerAllRoutes } from '../src/generated';

// Import the generated prismaMiddleware
import {
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
    title: 'Canela API',
    description: 'Auto-generated API using Canela code generator',
  },
});

// Swagger UI documentation
app.get('/docs', swaggerUI({ url: '/docs/openapi.json' }));
app.get('/docs/openapi.json', (c) => {
  return c.json(openApiDoc);
});

// Health check route
app.get('/', (c) => c.json({ status: 'ok', message: 'Canela API is running' }));

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
  await disconnectPrisma(); // Use the generated disconnect function instead
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await disconnectPrisma(); // Use the generated disconnect function instead
  process.exit(0);
});
