/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      '@caption-aotearoa/shared/azureLanguages': new URL('../../packages/shared/src/azureLanguages.ts', import.meta.url).pathname,
      '@caption-aotearoa/shared/nzLanguages': new URL('../../packages/shared/src/nzLanguages.ts', import.meta.url).pathname,
      '@caption-aotearoa/shared/recognitionLocales': new URL('../../packages/shared/src/recognitionLocales.ts', import.meta.url).pathname,
      '@caption-aotearoa/shared/ttsLanguages': new URL('../../packages/shared/src/ttsLanguages.ts', import.meta.url).pathname,
      '@caption-aotearoa/shared': new URL('../../packages/shared/src/types.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
