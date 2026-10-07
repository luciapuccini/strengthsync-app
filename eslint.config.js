import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

const ALL_WORKSPACES = ['@strengthsync/client', '@strengthsync/server'];

const BOUNDARY_MESSAGE = 'Import-boundary violation';

const boundary = (files, allowed, extraBanned = []) => {
  const banned = ALL_WORKSPACES.filter((name) => !allowed.includes(name)).flatMap((name) => [
    name,
    `${name}/*`,
  ]);
  return {
    files,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: banned, message: BOUNDARY_MESSAGE },
            ...(extraBanned.length > 0 ? [{ group: extraBanned, message: BOUNDARY_MESSAGE }] : []),
          ],
        },
      ],
    },
  };
};

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/.wrangler/**',
    'docs/**',
    '**/worker-configuration.d.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      complexity: ['error', 10],
      'max-depth': ['error', 5],
      'max-lines-per-function': ['error', { max: 90, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 5],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['client/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['client/src/shadcn/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['client/src/api/openapi.d.ts'],
    rules: { 'max-lines': 'off', 'max-lines-per-function': 'off' },
  },
  boundary(['client/**/*.{ts,tsx}'], []),
  boundary(['server/**/*.ts'], []),
  boundary(
    ['server/src/domain/**/*.ts'],
    [],
    ['**/db/**', '**/routes/**', '**/workflows/**', '**/agent/**'],
  ),
  boundary(['server/src/db/**/*.ts'], [], ['**/routes/**', '**/workflows/**', '**/agent/**']),
]);
