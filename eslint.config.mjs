import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

// Prettier configuration
const prettierConfig = {
  singleQuote: true,
  jsxSingleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
};

const config = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // We need to keep these ignores minimal as generated code should follow linting rules
    ignores: [
      'prisma/schema/**',
      'eslint.config.mjs',
      'dist/**',
      'node_modules/**',
      'jest.config.ts',
      'src/config/prisma.ts', // Prisma client config
    ],
    plugins: {
      prettier: prettierPlugin,
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // Path imports
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../*'],
        },
      ],

      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': 'allow-with-description' },
      ],

      // Import rules
      'import/prefer-default-export': 'off',
      'import/no-default-export': 'error', // Disallow default exports
      'import/first': 'off', // Allow imports anywhere in the file
      'import/no-duplicates': 'error',

      // General code quality
      'prefer-destructuring': 'warn',
      'no-nested-ternary': 'warn',
      'prettier/prettier': ['error', prettierConfig],
      'no-console': 'error',
      complexity: ['warn', 10],
      eqeqeq: 'error',
      'prefer-arrow-callback': 'error',
      'arrow-body-style': 'off',
      'func-style': ['error', 'expression'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-expressions': 'error',
      'no-duplicate-imports': 'error',
    },
  },
  {
    // Special rules for controller files
    files: ['src/controllers/**/*.ts'],
    rules: {
      complexity: ['warn', 5], // Controllers should be simpler
    },
  },
  {
    // Special rules for route files
    files: ['src/routes/**/*.ts'],
    rules: {
      'import/no-default-export': 'error',
      'import/prefer-default-export': 'off', // Routes should use named exports
    },
  },
  {
    // Exception for main index.ts
    files: ['src/index.ts'],
    rules: {
      'import/no-default-export': 'off', // Allow default export for main entry point
      'no-console': 'off', // Allow console for CLI command
    },
  },
  {
    // Allow relative imports in test files
    files: ['**/__tests__/**'],
    rules: {
      'no-restricted-imports': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn', // Tests often import things for type checking only
    },
  },
  {
    // Allow console in generator files since this is a CLI tool
    files: ['src/generator/**/*.ts', 'src/parser/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Special rules for generated files to make them more lenient
    files: ['src/generated/**/*.ts'],
    rules: {
      'func-style': 'off', // Generated files may use function declarations
      'no-console': 'off', // Allow console in generated files
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'import/no-default-export': 'off', // Allow default exports in generated files
      'import/no-duplicates': 'off', // Allow duplicate imports in generated code
      'no-duplicate-imports': 'off',
    },
  }
);

export default config;
