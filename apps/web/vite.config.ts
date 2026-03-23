/// <reference types="vitest" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const sharedSrc = path.resolve(__dirname, '../../packages/shared/src')

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      '@caption-aotearoa/shared/nzLanguages': path.join(sharedSrc, 'nzLanguages.ts'),
      '@caption-aotearoa/shared/azureLanguages': path.join(sharedSrc, 'azureLanguages.ts'),
      '@caption-aotearoa/shared/recognitionLocales': path.join(sharedSrc, 'recognitionLocales.ts'),
      '@caption-aotearoa/shared': path.join(sharedSrc, 'types.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
