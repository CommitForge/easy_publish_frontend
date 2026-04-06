import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const translationVersion =
  process.env.VITE_TRANSLATION_VERSION
  || process.env.GITHUB_SHA
  || String(Date.now());

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_TRANSLATION_VERSION': JSON.stringify(translationVersion),
  },
  plugins: [react()],
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-syntax-highlighter') || id.includes('/refractor/')) {
            return 'syntax-highlighter';
          }
          if (id.includes('/node_modules/@iota/')) {
            return 'iota-sdk';
          }
        },
      },
    },
  },
})
