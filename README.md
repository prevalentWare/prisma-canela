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

## Technology Stack

- [Hono](https://hono.dev/): Web framework for the generated API.
- [Zod](https://zod.dev/): Schema validation.
- [Prisma](https://www.prisma.io/): Database ORM and schema definition.
- [TypeScript](https://www.typescriptlang.org/): Language for the codegen and the generated API.
- [Bun](https://bun.sh/): JavaScript runtime and package manager.

## Getting Started

_(Coming Soon)_

## Usage

_(Coming Soon)_

## Contributing

_(Coming Soon)_

## License

[MIT](LICENSE) <!-- Placeholder -->
