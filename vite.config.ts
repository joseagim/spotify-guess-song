import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { deezerAudioProxy } from './vite/deezerAudioProxy.ts'

// The dev server is pinned to 127.0.0.1:5173 because the Spotify redirect URI
// registered in the Developer Dashboard depends on it (Spotify rejects "localhost").
export default defineConfig({
  plugins: [react(), tailwindcss(), deezerAudioProxy()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      // Deezer's API sends no CORS headers, so the browser calls it through this proxy.
      // The trailing slash keeps this rule from also matching /api/deezer-audio.
      '/api/deezer/': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deezer/, ''),
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
