import { HttpError } from './types.js'

export type Config = {
  port: number
  publicBaseUrl: string
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string
  stripeSecretKey?: string
  stripeWebhookSecret?: string
  twilioAuthToken?: string
  coordinatorPhone?: string
  contactFingerprintSecret?: string
  contactEncryptionKey?: string
  locationEncryptionKey?: string
  corsOrigins: Set<string>
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const required = (name: string): string => {
    const value = env[name]?.trim()
    if (!value) throw new HttpError(500, `Missing required environment variable: ${name}`, 'configuration_error')
    return value
  }
  return {
    port: Number(env.PORT ?? 8787),
    publicBaseUrl: env.PUBLIC_BASE_URL?.trim() || 'http://127.0.0.1:8787',
    supabaseUrl: required('SUPABASE_URL').replace(/\/$/, ''),
    supabaseAnonKey: required('SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    stripeSecretKey: env.STRIPE_SECRET_KEY?.trim(),
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim(),
    twilioAuthToken: env.TWILIO_AUTH_TOKEN?.trim(),
    coordinatorPhone: env.COORDINATOR_PHONE?.trim(),
    contactFingerprintSecret: env.CONTACT_FINGERPRINT_SECRET?.trim(),
    contactEncryptionKey: env.CONTACT_ENCRYPTION_KEY?.trim(),
    locationEncryptionKey: env.LOCATION_ENCRYPTION_KEY?.trim(),
    corsOrigins: new Set((env.CORS_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean)),
  }
}
