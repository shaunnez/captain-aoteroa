import 'dotenv/config'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

export const config = {
  port: 3002, // parseInt(process.env.PORT ?? '3002', 10),
  clientUrl: requireEnv('CLIENT_URL'),
  supabaseUrl: requireEnv('SUPABASE_URL'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  azure: {
    speechKey: requireEnv('AZURE_SPEECH_KEY'),
    speechRegion: requireEnv('AZURE_SPEECH_REGION'),
  },
  papaReo: {
    token: process.env.PAPAREO_TOKEN ?? '',
    apiUrl: process.env.PAPAREO_API_URL ?? 'https://api.papareo.io',
  },
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
}
