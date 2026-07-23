import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// SPA served publicly from the API Worker in production; in dev the browser
// talks to `wrangler dev` on :8787 through this proxy. `/internal/*` is never
// proxied — the browser must not reach the service-secret data commands.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/health': 'http://localhost:8787',
    },
  },
})
