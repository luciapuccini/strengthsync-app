import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// SPA served publicly from the API Worker in production; in dev the browser
// talks to `wrangler dev` on :8787 through this proxy. Only public API and
// workflow-start routes are proxied.
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
      '/wf': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
    },
  },
});
