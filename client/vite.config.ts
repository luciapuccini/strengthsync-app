import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// SPA served publicly from the API Worker in production; in dev the browser
// talks to `wrangler dev` on :8787 through this proxy. Only public API routes
// are proxied — workflow-start now lives under /api, like everything else
// behind the session guard.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/auth': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
      // Analytics takes the same path in dev as in production, through the
      // Worker's PostHog proxy (server/src/routes/ingest.ts). Without this the
      // dev server answers the capture itself with index.html.
      '/ingest': 'http://localhost:8787',
    },
  },
});
