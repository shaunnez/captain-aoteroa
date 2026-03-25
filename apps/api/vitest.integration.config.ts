import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/__tests__/integration/**/*.integration.test.ts'],
    testTimeout: 30000,
    setupFiles: ['src/__tests__/integration/setup.ts'],
    // Placeholder values keep config.ts from throwing on import.
    // setup.ts loads the real .env with override:true so real keys win.
    // Tests use skipIf(key === '__placeholder__') to skip when no real key is present.
    env: {
      CLIENT_URL: 'http://localhost:5173',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      AZURE_SPEECH_KEY: '__placeholder__',
      AZURE_SPEECH_REGION: 'australiaeast',
      OPENAI_API_KEY: '__placeholder__',
    },
  },
})
