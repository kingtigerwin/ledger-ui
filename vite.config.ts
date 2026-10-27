/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev, Vite plays CloudFront's part: the UI, ledger-api and ledger-agent share one origin,
// so the refresh cookie (Path=/api/v1/auth) is first-party, as in production.
const backend = (target: string) => ({ target, changeOrigin: true, secure: true })

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': backend(process.env.API_ORIGIN ?? 'https://api.haoran.cloud'),
      '/agent': backend(process.env.AGENT_ORIGIN ?? 'https://agent.haoran.cloud'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
