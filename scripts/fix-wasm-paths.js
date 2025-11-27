#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * This script fixes hardcoded paths to WASM files in the bundled output.
 * It replaces absolute paths with dynamic path resolution.
 */

const canelaBundlePath = path.resolve('dist/bin/canela.js');

console.log('Fixing WASM paths in:', canelaBundlePath);

if (!fs.existsSync(canelaBundlePath)) {
  console.error('Error: Bundle file not found. Run "bun run build" first.');
  process.exit(1);
}

let content = fs.readFileSync(canelaBundlePath, 'utf8');

// Ensure the shebang line is at the beginning and properly formatted
if (content.startsWith('#!/usr/bin/env node')) {
  // Remove the shebang line temporarily
  content = content.replace(/^#!\/usr\/bin\/env node\n/, '');
}

// Add a resolver function that will reliably find WASM files in different environments
const wasmResolverFunction = `
// WASM file resolver function
import { fileURLToPath } from 'url';
const __canela_filename = fileURLToPath(import.meta.url);
const __canela_dirname = path.dirname(__canela_filename);

function resolveWasmPath(filename) {
  // Try to find the WASM file in different possible locations
  const possiblePaths = [
    // Relative to the package itself (dist/bin/canela.js -> prisma-schema-wasm/src/)
    path.join(__canela_dirname, '..', '..', 'prisma-schema-wasm', 'src', filename),
    // Package installed as dependency (node_modules path)
    path.join(process.cwd(), 'node_modules', '@prevalentware', 'prisma-canela', 'prisma-schema-wasm', 'src', filename),
    // Local development path
    path.join(process.cwd(), 'prisma-schema-wasm', 'src', filename),
  ];

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }

  // If we can't find the file, log paths we tried and return the first one anyway
  console.error('WASM file not found, tried paths:', possiblePaths);
  return possiblePaths[0];
}
`;

// Replace hardcoded __dirname path for the WASM file
content = content.replace(
  /var __dirname = ".*?@prisma\/prisma-schema-wasm\/src";/g,
  'var __dirname = path.join(process.cwd(), "prisma-schema-wasm/src");'
);

// Fix direct path references to the WASM file
content = content.replace(
  /var path2 = __require\("path"\)\.join\(__dirname, "prisma_schema_build_bg\.wasm"\);/g,
  'var path2 = resolveWasmPath("prisma_schema_build_bg.wasm");'
);

// Also fix any other references to the WASM file
content = content.replace(
  /readFileSync\(".*?prisma_schema_build_bg\.wasm"\)/g,
  'readFileSync(resolveWasmPath("prisma_schema_build_bg.wasm"))'
);

// Fix template literal wasmPath references
content = content.replace(
  /var wasmPath = `\$\{__dirname\}\/prisma_schema_build_bg\.wasm`;/g,
  'var wasmPath = resolveWasmPath("prisma_schema_build_bg.wasm");'
);

// Fix any other template literal path references
content = content.replace(
  /`\$\{__dirname\}\/prisma_schema_build_bg\.wasm`/g,
  'resolveWasmPath("prisma_schema_build_bg.wasm")'
);

// Add imports for path and fs
const importsSection = `
import path from 'path';
import fs from 'fs';
`;

// Replace any existing imports if present
content = content.replace(/var path = require\("path"\);\n/, '');
content = content.replace(/var fs = require\("fs"\);\n/, '');

// Add the imports and resolver function at the beginning
content = importsSection + wasmResolverFunction + content;

// Re-add the shebang line at the beginning
content = '#!/usr/bin/env node\n' + content;

fs.writeFileSync(canelaBundlePath, content);
console.log('WASM paths fixed successfully!');
