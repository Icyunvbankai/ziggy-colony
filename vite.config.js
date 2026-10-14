import { defineConfig } from 'vite'
import { apiMiddleware } from './server/api.mjs'

/** Serves /api from inside the Vite dev server, so `npm run dev` is the whole game. */
const api = () => ({
  name: 'bot-crossing-api',
  configureServer(server) {
    server.middlewares.use(apiMiddleware)
  },
})

export default defineConfig({
  // GitHub Pages serves the colony under /ziggy-colony/, NOT the domain root.
  // Relative base keeps asset URLs working under any subpath. Do NOT remove:
  // a build without this (or without --base=./) ships absolute /assets/... URLs
  // that 404 on Pages and renders a blank black page (2026-10-14).
  base: './',
  plugins: [api()],
  // PORT lets a second copy run alongside the first without a flag on the command line.
  server: { port: Number(process.env.PORT) || 5274, strictPort: false },
  build: { target: 'esnext' },
})
