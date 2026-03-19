import 'dotenv/config'

function require(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

export const config = {
  port: 3002, // parseInt(process.env.PORT ?? '3002', 10),
  clientUrl: require('CLIENT_URL'),
  presenterSecret: require('PRESENTER_SECRET'),
  jwtSecret: require('JWT_SECRET'),
  supabaseUrl: require('SUPABASE_URL'),
  supabaseServiceRoleKey: require('SUPABASE_SERVICE_ROLE_KEY'),
  azure: {
    speechKey: require('AZURE_SPEECH_KEY'),
    speechRegion: require('AZURE_SPEECH_REGION'),
  },
  papaReo: {
    token: process.env.PAPAREO_TOKEN ?? '',
    apiUrl: process.env.PAPAREO_API_URL ?? 'https://api.papareo.io',
  },
}
