# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.11] - 2025-05-13

### Fixed

- Properly handle models with underscores in their names in Prisma client calls
- Service files now preserve original underscore format in Prisma client access
- This ensures compatibility with model names like `Hist_AuditoriaDesarrollador`

## [0.1.3] - 2025-04-28

### Added

- Professional logging system with multiple log levels (SILENT, ERROR, WARNING, INFO, DEBUG)
- CLI options for controlling log verbosity (`--log-level`, `--silent`)
- Environment variable support for log levels (`CANELA_LOG_LEVEL`)
- Documentation for using log levels in README

### Improved

- More concise and focused logging throughout the codebase
- Better formatting of log messages with colors and prefixes
- Fixed linting issues related to console output

## [0.1.2] - 2025-04-15

### Added

- Multi-file Prisma schema support
- Support for `prismaSchemaFolder` preview feature
- Smart location detection for schema files

### Fixed

- Improved error handling for invalid schema directories

## [0.1.1] - 2025-04-01

### Added

- Prisma client middleware for injecting into Hono context
- Proper Context type extensions for TypeScript
- Examples in README for middleware usage

### Changed

- Refactored service layer to extract Prisma client from Hono context
- Updated context access using `c.get('prisma')` instead of direct property access

## [0.1.0] - 2025-07-15

### Added

- Initial release
- Basic Prisma schema parsing
- Generation of Zod schemas, TypeScript types, controllers, and routes
- OpenAPI integration
- Modular route exports
- Basic CLI with schema detection
