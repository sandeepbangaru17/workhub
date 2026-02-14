import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
const noEsbuild = process.env.WORKHUB_NO_ESBUILD === '1'

export default defineConfig({
  plugins: [react()],
  esbuild: noEsbuild ? false : undefined,
  optimizeDeps: noEsbuild
    ? {
        noDiscovery: true,
        include: [],
      }
    : undefined,
  build: noEsbuild
    ? {
        target: 'esnext',
        minify: false,
      }
    : undefined,
})
