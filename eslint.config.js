import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Import-boundary enforcement for the dependency graph defined in
// docs/architecture/monorepo_structure.md. A package may only import the
// @strengthsync/* workspaces listed as `allowed` for its directory.
const ALL_WORKSPACES = [
  '@strengthsync/ui',
  '@strengthsync/api',
  '@strengthsync/workflows',
  '@strengthsync/domain',
  '@strengthsync/agent',
  '@strengthsync/db',
]

const BOUNDARY_MESSAGE =
  'Import-boundary violation: see the dependency graph in docs/architecture/monorepo_structure.md.'

const boundary = (files, allowed, extraBanned = []) => {
  const banned = ALL_WORKSPACES.filter((name) => !allowed.includes(name)).flatMap(
    (name) => [name, `${name}/*`],
  )
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
  }
}

export default defineConfig([
  globalIgnores(['**/dist/**', '**/coverage/**', '**/.wrangler/**', 'docs/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      complexity: ['error', 10],
      'max-depth': ['error', 5],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 5],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        // Allow the `const { dropped: _, ...kept } = row` omit idiom used by
        // persistence mappers.
        { ignoreRestSiblings: true, argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['apps/ui/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },
  {
    // Ported shadcn/ui primitives are a component library, not fast-refresh
    // route modules: they legitimately co-export variant helpers.
    files: ['apps/ui/src/shadcn/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['apps/workflows/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  // services/domain imports nothing from other workspaces.
  boundary(['services/domain/**/*.ts'], ['@strengthsync/domain']),
  // services/agent and services/db import domain only, never apps.
  boundary(['services/agent/**/*.ts'], ['@strengthsync/domain']),
  boundary(['services/db/**/*.ts'], ['@strengthsync/domain']),
  // apps/ui only knows HTTP contracts; never db, agent, or Temporal.
  boundary(['apps/ui/**/*.{ts,tsx}'], ['@strengthsync/domain'], ['@temporalio/*']),
  // apps/api may use domain, agent (chat), and db; never other apps.
  boundary(
    ['apps/api/**/*.ts'],
    ['@strengthsync/domain', '@strengthsync/agent', '@strengthsync/db'],
  ),
  // apps/workflows may use domain, agent, and db; never ui or api.
  boundary(
    ['apps/workflows/**/*.ts'],
    ['@strengthsync/domain', '@strengthsync/agent', '@strengthsync/db'],
  ),
])
