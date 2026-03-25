import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
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
