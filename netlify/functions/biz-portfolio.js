// Serves the gated /demos portfolio its data: every lead that has a generated
// demo, with live visit counts. Reached via a rewrite from /demos/portfolio.json
// (see netlify.toml) so the demos-portfolio-auth edge gate (Basic Auth) protects
// it; the browser resends the same credentials for this /demos path.
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

const SELECT =
  'slug,name,category,city,state,google_rating,reviews_count,status,demo_url,demo_generated_at,demo_deployed_at';

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  // Only reachable through the gated edge proxy (/demos/portfolio.json), which
  // adds this shared key. Blocks direct hits to the raw function path.
  const required = process.env.DEMOS_PITCH_PASSWORD;
  if (required) {
    const hdrs = event && event.headers ? event.headers : {};
    const key = hdrs["x-portfolio-key"] || hdrs["X-Portfolio-Key"] || "";
    if (key !== required) return json(403, { error: "forbidden", demos: [] });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'missing config', demos: [] });
  }

  const restBase = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const h = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Accept-Profile': 'command',
  };

  let leads = [];
  try {
    const res = await fetch(
      `${restBase}/biz_leads?demo_url=not.is.null&select=${SELECT}&order=demo_generated_at.desc.nullslast`,
      { headers: h }
    );
    if (res.ok) leads = await res.json();
    else console.error('portfolio leads fetch', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.error('portfolio leads fetch failed', err);
  }

  // Visit aggregates. Low volume, so fetch slug + time and roll up in JS.
  const visits = {};
  try {
    const res = await fetch(
      `${restBase}/biz_visits?select=lead_slug,created_at&order=created_at.desc`,
      { headers: h }
    );
    if (res.ok) {
      const rows = await res.json();
      for (const r of rows) {
        const s = r.lead_slug;
        if (!visits[s]) visits[s] = { count: 0, last: r.created_at }; // desc order: first seen is latest
        visits[s].count += 1;
      }
    }
  } catch (err) {
    console.error('portfolio visits fetch failed', err);
  }

  const demos = (Array.isArray(leads) ? leads : []).map((l) => ({
    slug: l.slug,
    name: l.name,
    category: l.category,
    city: l.city,
    state: l.state,
    google_rating: l.google_rating,
    reviews_count: l.reviews_count,
    status: l.status,
    demo_url: l.demo_url || `/demos/${l.slug}/`,
    pitch_url: `/demos/${l.slug}/pitch/`,
    built_at: l.demo_generated_at || l.demo_deployed_at || null,
    visits: visits[l.slug] ? visits[l.slug].count : 0,
    last_visit: visits[l.slug] ? visits[l.slug].last : null,
  }));

  return json(200, { demos, generated_at: new Date().toISOString() });
};
