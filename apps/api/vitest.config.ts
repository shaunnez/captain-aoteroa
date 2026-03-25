import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/integration/**'],
    env: {
      CLIENT_URL: 'http://localhost:5173',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      AZURE_SPEECH_KEY: 'test-azure-key',
      AZURE_SPEECH_REGION: 'australiaeast',
    },
  },
})
