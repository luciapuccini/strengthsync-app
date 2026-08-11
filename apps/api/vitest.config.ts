import { defineConfig } from 'vitest/config'

// Independently runnable from this package directory (`pnpm test`), and
// picked up by the root aggregate run via vitest.config.ts's
// `projects: ['apps/*']`.
export default defineConfig({
  test: {},
})
