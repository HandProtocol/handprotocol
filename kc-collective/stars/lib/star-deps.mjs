/* Real dependencies from the environment, for the Netlify functions.

   Env:
     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   the HAND project for now (service role, server only)
     KC_STARS_TABLE        optional, default kc_stars
     KC_STARS_SCHEMA       optional, default command (the HAND project); public on a KC-only project
     ANTHROPIC_API_KEY     unset → opted-in visitors get a plain star (ai_status "skipped")
     KC_STARS_SECRET       signs the one-tap links and salts the rate-limit hashes (32+ random chars)
     RESEND_API_KEY        send-only key
     KC_STARS_EMAIL_FROM   verified sender, e.g. "KC Collective <stars@…>"; falls back to EMAIL_FROM
     KC_STARS_ADMIN_EMAIL  who gets the notices (comma-separated for more than one)
     KC_SITE_URL           https://… with no trailing slash; falls back to Netlify's URL
     KC_SKY_PATH           where the sky lives on that site, default /#sky
     KC_STARS_DAILY_CAP    optional, stars per day across everyone (default 120) */

import { claudeClient } from './claude-client.mjs';
import { DEFAULT_LIMITS } from './star-handler.mjs';
import { supabaseStore } from './star-store.mjs';

let cached = null;

export function depsFromEnv(env = process.env) {
  if (cached) return cached;
  if (!env.KC_STARS_SECRET || env.KC_STARS_SECRET.length < 32) throw new Error('stars: KC_STARS_SECRET must be set (32+ characters)');
  const cap = Number.parseInt(env.KC_STARS_DAILY_CAP || '', 10);
  cached = {
    store: supabaseStore({ url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY, table: env.KC_STARS_TABLE || 'kc_stars', schema: env.KC_STARS_SCHEMA || 'command' }),
    claude: env.ANTHROPIC_API_KEY ? claudeClient({ apiKey: env.ANTHROPIC_API_KEY }) : null,
    secret: env.KC_STARS_SECRET,
    siteUrl: String(env.KC_SITE_URL || env.URL || '').replace(/\/$/, ''),
    skyPath: env.KC_SKY_PATH || '/#sky',
    mail: {
      apiKey: env.RESEND_API_KEY,
      from: env.KC_STARS_EMAIL_FROM || env.EMAIL_FROM,
      admin: String(env.KC_STARS_ADMIN_EMAIL || '').split(',').map((s) => s.trim()).filter(Boolean),
    },
    limits: Number.isFinite(cap) && cap > 0 ? { ...DEFAULT_LIMITS, dailyCap: cap } : DEFAULT_LIMITS,
  };
  if (!cached.mail.admin.length) cached.mail.admin = null;
  return cached;
}
