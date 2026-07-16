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

## Routing

- `/` is the WXL landing page.
- `/app/` is the WXL:FOOD command center.
- The SPA fallback is defined in `netlify.toml` and `public/_redirects`.

## Database

Apply `../command/supabase/migrations/024_wxl_food.sql` to the HAND Supabase project, then add `command` to the project's exposed schemas if it is not already present.

## Domain

The Netlify site `wxl-food` is configured with `wxl.handprotocol.org` as its primary custom domain. Netlify provisioned SSL and manages the DNS record for the existing `handprotocol.org` zone. The current deployment is live at `https://wxl.handprotocol.org`.
