# WXL:FOOD deployment

## Target

- Host: `wxl.handprotocol.org`
- Netlify site: `wxl-food`, id `56ee91bf-bf15-472d-8c1c-d6c30af05d6c`
- Netlify base directory: `wxl`
- Build command: `npm run build`
- Publish directory: `dist`

## Environment

Set these variables on the WXL:FOOD Netlify site:

```text
VITE_SUPABASE_URL=https://<HAND project ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<HAND anon key>
```

The browser receives only the anon key. The service-role key stays in the HAND Command Center and is never added to WXL:FOOD.

In the HAND Supabase dashboard, open **Authentication > Sign In / Providers > Email** and turn off **Confirm email**. WXL signup expects `signUp` to return a session immediately. The client then opens `/app/`; standard `username`, `new-password`, and form-submit metadata lets the member's browser offer to save the credentials locally.

In **Authentication > URL Configuration**, set:

```text
Site URL: https://wxl.handprotocol.org
Redirect URL: https://wxl.handprotocol.org/app/?mode=recovery
Redirect URL: http://localhost:5173/app/?mode=recovery
```

The production recovery URL must appear exactly in the redirect allowlist. Otherwise Supabase can fall back to its default Site URL, which is commonly `http://localhost:3000`.

If the recovery email template was customized, keep `{{ .ConfirmationURL }}` as the link target. A manually constructed link must use `{{ .RedirectTo }}`, not `{{ .SiteURL }}`, so the `redirectTo` value supplied by WXL is preserved.

The `FOOD IS HERE!` operations email hook also reads these server-side values:

```text
RESEND_API_KEY
EMAIL_FROM
EMAIL_TO_OPS
```

`EMAIL_FROM` should use the existing verified `handprotocol.org` domain, for example `WXL:FOOD <alerts@handprotocol.org>`. The function falls back to HAND's existing `RESEND_NOTIFY_FROM`, `RESEND_NOTIFY_TO`, and `RESEND_FORWARD_TO` names when present. Do not add a Resend key to any `VITE_` variable.

If WXL does not have its own Resend variables, the function forwards the authenticated alert to HAND's shared feedback endpoint. That endpoint provides the existing Command Center, Telegram, and Resend notification fan-out without exposing a key to WXL.

## Routing

- `/` is the WXL landing page.
- `/app/` is the WXL:FOOD command center.
- The SPA fallback is defined in `netlify.toml` and `public/_redirects`.

## Database

Apply `../command/supabase/migrations/024_wxl_food.sql` and `../command/supabase/migrations/025_wxl_community_map_alerts.sql` to the HAND Supabase project, then add `command` to the project's exposed schemas if it is not already present.

## Domain

The Netlify site `wxl-food` is configured with `wxl.handprotocol.org` as its primary custom domain. Netlify provisioned SSL and manages the DNS record for the existing `handprotocol.org` zone. The current deployment is live at `https://wxl.handprotocol.org`.
