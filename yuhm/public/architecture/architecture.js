const DATA = {
  "client-simple": {
    eyebrow: "Client · Live", status: "status-live",
    title: "Simple public shell",
    path: "yuhm/src/App.tsx",
    desc: "Mobile-first default experience. Four persistent destinations: Find food, Contribute, Gather, Requests. This is what most visitors see; Advanced workspace is opt-in and remembered per browser.",
    bullets: ["Geolocation prompt is optional, in-memory only", "Drafts survive the sign-in handoff", "Anonymous write attempts open an account prompt"]
  },
  "client-advanced": {
    eyebrow: "Client · Live", status: "status-live",
    title: "Advanced workspace",
    path: "yuhm/src/{RescueBoard,HarvestRunBoard,InventoryBoard,ContributorBoard}.tsx",
    desc: "Coordinator-facing operational boards. Explicit opt-in setting, not the default. Each board is a real persisted workflow, not a mockup.",
    bullets: ["Rescue Ops: submission, review, claim, checkpoints", "Volunteer Command: readiness + training approval", "Harvest Runs: multi-stop dispatch", "Inventory: lot custody + ledger"]
  },
  "client-map": {
    eyebrow: "Client · Live", status: "status-live",
    title: "Austin food map",
    path: "yuhm/src/FoodMap.tsx",
    desc: "Real Leaflet map over OpenStreetMap tiles. Directory-listed locations (City of Austin, Central Texas Food Bank) plus reviewed community pins.",
    bullets: ["Only reviewed coordinates get a marker", "Navigate button opens Apple/Google Maps by platform", "No offline tile caching"]
  },
  "client-auth": {
    eyebrow: "Client · Live", status: "status-live",
    title: "Authentication",
    path: "yuhm/src/lib/auth.ts",
    desc: "Email + password via Supabase Auth. No magic links. Signup starts a session immediately, no email confirmation step required.",
    bullets: ["Password reset via recovery email", "Session drives all write-gating, never a query param", "Redirect allowlist must include /app/?mode=recovery"]
  },
  "client-protocol-board": {
    eyebrow: "Client · Needs API config", status: "status-needs-migration",
    title: "Coordination protocol workspace",
    path: "yuhm/src/ProtocolBoard.tsx",
    desc: "Exposes the deeper protocol (needs, supplies, matching requests, commitments, potlucks) to the web app when the separate Coordination API is configured. Not the default experience.",
    bullets: ["Depends on services layer being reachable", "Distinct from the simple Requests flow"]
  },
  "fn-alert": {
    eyebrow: "Netlify Function · Live", status: "status-live",
    title: "food-alert.mjs",
    path: "netlify/functions/food-alert.mjs",
    desc: "Validates the Supabase access token, re-reads the newly created alert through the authenticated API, then sends a best-effort Resend email. Falls back to HAND's shared feedback endpoint if yuhm-specific Resend vars are missing.",
    bullets: ["Rate limited: 5 alerts / account / 15 min", "Database remains source of truth; email is additive"]
  },
  "fn-subscribe": {
    eyebrow: "Netlify Function · Live", status: "status-live",
    title: "subscribe · feedback",
    path: "netlify/functions/{subscribe,feedback}.js",
    desc: "Email-only updates list (no account created) and the shared feedback widget that fans out to HAND Command Center, Telegram, and Resend.",
    bullets: ["Offline feedback queues locally, retries on reconnect"]
  },
  "data-requests": {
    eyebrow: "Supabase · Live", status: "status-live",
    title: "command.food_requests",
    path: "command/supabase/migrations/024, 027",
    desc: "Community requests with structured offers, owner-checked accept/decline, and immutable status history. The most complete coordination loop in the product today.",
    bullets: ["Reply/supporter/offer counts maintained by triggers", "Public replies, explicit privacy warning shown in UI"]
  },
  "data-rescues": {
    eyebrow: "Supabase · Needs live verification", status: "status-needs-migration",
    title: "command.food_rescues",
    path: "command/supabase/migrations/028",
    desc: "Coordinator-reviewed rescue submissions with atomic claims, safety checkpoints, and incident hold. Schema and RLS are deployed; supervised multi-role rehearsal is still required before real food moves.",
    bullets: ["Chilled food >41°F or hot food <135°F triggers incident hold", "Claims expire after 2h or the pickup deadline"]
  },
  "data-contributors": {
    eyebrow: "Supabase · Needs live verification", status: "status-needs-migration",
    title: "command.food_contributors",
    path: "command/supabase/migrations/029",
    desc: "Private Contributor readiness: training, equipment, run classes, expiry. Rescue claiming is server-enforced against this table, coordinators cannot bypass it.",
    bullets: ["Self-service edits return to submitted, pausing claiming"]
  },
  "data-harvest": {
    eyebrow: "Supabase · Needs live verification", status: "status-needs-migration",
    title: "command.food_harvest_runs",
    path: "command/supabase/migrations/030, 037-039",
    desc: "Multi-stop private dispatch plans with exact capability matching (vehicle, lifting limit, temperature control). Compost pickup is opt-in per stop, never inferred.",
    bullets: ["Start check-in revalidates eligibility 30 min before run", "A rescue cannot belong to two active runs"]
  },
  "data-inventory": {
    eyebrow: "Supabase · Needs live verification", status: "status-needs-migration",
    title: "command.food_inventory_lots",
    path: "command/supabase/migrations/031",
    desc: "Accepted-rescue custody: lot-specific storage limits, row-locked allocations, immutable quantity ledger. A lot can only be created from an already-accepted rescue.",
    bullets: ["Failed condition checks hold the whole lot", "Discards require a reason and use only unreserved stock"]
  },
  "data-spots": {
    eyebrow: "Supabase · Live", status: "status-live",
    title: "command.food_spots · food_alerts",
    path: "command/supabase/migrations/025",
    desc: "Community-submitted public food pins and time-limited FOOD IS HERE! alerts. Realtime inserts/expirations push to open sessions.",
    bullets: ["No private household addresses permitted"]
  },
  "data-partners": {
    eyebrow: "Supabase · Live (internal)", status: "status-live",
    title: "command.food_partners",
    path: "command/supabase/migrations/024",
    desc: "Source nominations from members. Only verified nominations are publicly readable; no coordinator review queue exists in the UI yet.",
    bullets: []
  },
  "data-engagement": {
    eyebrow: "Supabase · Live (internal)", status: "status-live",
    title: "command.food_engagement_events",
    path: "command/supabase/migrations/025",
    desc: "A/B test variant tracking and interaction batching. Feeds an admin-only leaderboard view, invoker RLS.",
    bullets: []
  },
  "proto-participants": {
    eyebrow: "Protocol · Built, gated", status: "status-built-inactive",
    title: "participants",
    path: "command/supabase/migrations/032-036",
    desc: "Tiered trust, verification evidence, consented contact channels, and agent mandates. Part of the channel-independent coordination layer that is deployed but not clientfacing by default.",
    bullets: ["Exact locations stored as opaque ciphertext only"]
  },
  "proto-needs": {
    eyebrow: "Protocol · Built, gated", status: "status-built-inactive",
    title: "needs · supplies",
    path: "command/supabase/migrations/032-036",
    desc: "Canonical needs and supplies spanning three separately-governed lanes: charitable aid, paid marketplace, noncommercial potlucks. One lane's readiness gate does not block another.",
    bullets: []
  },
  "proto-match": {
    eyebrow: "Protocol · Built, gated", status: "status-built-inactive",
    title: "match_runs",
    path: "command/supabase/migrations/032-036",
    desc: "Replayable match runs with candidate hard-rule results, score components, and explanation codes. Designed to run in shadow mode before ever committing a match automatically.",
    bullets: []
  },
  "proto-commitments": {
    eyebrow: "Protocol · Built, gated", status: "status-built-inactive",
    title: "commitments",
    path: "command/supabase/migrations/032-036",
    desc: "Atomic supply-quantity checks, idempotent command receipts, and a transactional outbox. Deterministic policy decisions cannot be overridden by model text.",
    bullets: []
  },
  "proto-potlucks": {
    eyebrow: "Protocol · Built, gated", status: "status-built-inactive",
    title: "potlucks",
    path: "command/supabase/migrations/032-036",
    desc: "Venues, menus, invitations, RSVPs, assignments, capacity, and timed address release. Lowest regulatory risk lane, no food-safety chain-of-custody required.",
    bullets: []
  },
  "proto-payments": {
    eyebrow: "Protocol · Built, gated", status: "status-built-inactive",
    title: "payments · donations · subsidies",
    path: "command/supabase/migrations/032-036",
    desc: "Separate commercial-order, Stripe-transfer, donation, and subsidy accounting kept apart from charitable-aid records.",
    bullets: []
  },
  "svc-api": {
    eyebrow: "Service · Built, not activated", status: "status-built-inactive",
    title: "Coordination API",
    path: "yuhm/services/coordination-api/",
    desc: "TypeScript service exposing scoped REST resources, remote MCP, A2A task history, OAuth protected-resource metadata, and signed Stripe/Twilio webhook intake.",
    bullets: ["No external agent gets commit/payment/location authority pre-certification"]
  },
  "svc-worker": {
    eyebrow: "Service · Built, not activated", status: "status-built-inactive",
    title: "Matching worker",
    path: "yuhm/services/matching-worker/",
    desc: "Python + OR-Tools for hard-filtered min-cost allocation and capacity-aware vehicle routing. Recommended next step: run in shadow mode against a nonproduction Supabase branch to gather comparison data before any live matching.",
    bullets: []
  },
  "svc-other": {
    eyebrow: "Service · Built, not activated", status: "status-built-inactive",
    title: "Payment · potluck · retention workers",
    path: "yuhm/services/",
    desc: "Supervised workers for Stripe reconciliation, potluck planning, and data retention. None are running against production yet.",
    bullets: []
  },
  "ext-resend": {
    eyebrow: "External", status: "status-deferred",
    title: "Resend",
    path: "n/a",
    desc: "Operations and audience email delivery, shared with the rest of HAND Protocol's Netlify functions.",
    bullets: []
  },
  "ext-osm": {
    eyebrow: "External", status: "status-deferred",
    title: "OpenStreetMap",
    path: "n/a",
    desc: "Tile source for the Leaflet map. Attribution required and preserved.",
    bullets: []
  },
  "ext-stripe": {
    eyebrow: "External · Deferred", status: "status-deferred",
    title: "Stripe",
    path: "n/a",
    desc: "Wired for signed webhook intake in the Coordination API, but no live-mode account onboarding has happened. Test mode only.",
    bullets: []
  },
  "ext-twilio": {
    eyebrow: "External · Deferred", status: "status-deferred",
    title: "Twilio Voice",
    path: "n/a",
    desc: "Voice adapter exists with English/Spanish prompts and coordinator transfer, but there is no production phone number or verified consent record yet. SMS is a separate, explicitly deferred scope.",
    bullets: []
  }
};

const ROUTES = {
  publicMap: {
    label: "Find food route",
    nodes: ["client-simple", "client-map", "data-spots", "data-partners", "ext-osm"]
  },
  alerts: {
    label: "Food alert route",
    nodes: ["client-simple", "fn-alert", "data-spots", "ext-resend"]
  },
  community: {
    label: "Community request route",
    nodes: ["client-simple", "client-auth", "data-requests", "data-engagement"]
  },
  rescue: {
    label: "Rescue operations route",
    nodes: ["client-advanced", "client-auth", "data-contributors", "data-rescues", "data-harvest", "data-inventory"]
  },
  updates: {
    label: "Updates and feedback route",
    nodes: ["client-simple", "fn-subscribe", "ext-resend"]
  },
  coordination: {
    label: "Matching and commitment route",
    nodes: ["client-protocol-board", "proto-participants", "proto-needs", "proto-match", "proto-commitments", "svc-api", "svc-worker"]
  },
  potluck: {
    label: "Potluck coordination route",
    nodes: ["client-protocol-board", "proto-participants", "proto-needs", "proto-potlucks", "svc-api", "svc-other"]
  },
  payment: {
    label: "Payment coordination route",
    nodes: ["client-protocol-board", "proto-participants", "proto-needs", "proto-match", "proto-commitments", "proto-payments", "svc-api", "svc-other", "ext-stripe"]
  },
  voice: {
    label: "Voice coordination route",
    nodes: ["client-protocol-board", "proto-participants", "proto-needs", "svc-api", "ext-twilio"]
  }
};

const NODE_ROUTES = {
  "client-simple": "publicMap",
  "client-map": "publicMap",
  "data-spots": "publicMap",
  "data-partners": "publicMap",
  "ext-osm": "publicMap",
  "fn-alert": "alerts",
  "ext-resend": "alerts",
  "client-auth": "community",
  "data-requests": "community",
  "data-engagement": "community",
  "client-advanced": "rescue",
  "data-contributors": "rescue",
  "data-rescues": "rescue",
  "data-harvest": "rescue",
  "data-inventory": "rescue",
  "fn-subscribe": "updates",
  "client-protocol-board": "coordination",
  "proto-participants": "coordination",
  "proto-needs": "coordination",
  "proto-match": "coordination",
  "proto-commitments": "coordination",
  "svc-api": "coordination",
  "svc-worker": "coordination",
  "proto-potlucks": "potluck",
  "svc-other": "potluck",
  "proto-payments": "payment",
  "ext-stripe": "payment",
  "ext-twilio": "voice"
};

const panel = document.getElementById('panel');
const nodes = document.querySelectorAll('.node');
const flows = document.querySelectorAll('.flow-line');
const buttons = document.querySelectorAll('.toolbar button');
const routeLayer = document.getElementById('route-highlight');
const routeSummary = document.getElementById('route-summary');
const initialPanel = panel.innerHTML;

function renderPanel(id, route) {
  const d = DATA[id];
  if (!d) return;
  panel.innerHTML = `
    <div class="panel-eyebrow" style="color:${statusColor(d.status)}">${d.eyebrow}</div>
    <h2>${d.title}</h2>
    <div class="path">${d.path}</div>
    <span class="status-chip ${d.status}">${d.status.replace('status-','').replace('-',' ')}</span>
    ${route ? `<div class="panel-route">Highlighted route: ${route.label}</div>` : ''}
    <p>${d.desc}</p>
    ${d.bullets.length ? `<ul>${d.bullets.map(b=>`<li>${b}</li>`).join('')}</ul>` : ''}
  `;
}
function statusColor(cls) {
  return {
    'status-live':'#34d399',
    'status-needs-migration':'#fbbf24',
    'status-built-inactive':'#a78bfa',
    'status-deferred':'#b7c1d1'
  }[cls] || '#b7c1d1';
}

function setFilter(filter) {
  activeFilter = filter;
  buttons.forEach(button => {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  applyFilter();
}

function renderRouteSummary(route) {
  routeSummary.innerHTML = `
    <div class="route-summary__label">${route.label}</div>
    ${route.nodes.map((id, index) => {
      const title = DATA[id]?.title || id;
      const arrow = index ? '<span class="route-summary__arrow" aria-hidden="true">→</span>' : '';
      return `${arrow}<span class="route-summary__step">${title}</span>`;
    }).join('')}
  `;
  routeSummary.classList.add('visible');
}

function drawRoute(route) {
  routeLayer.replaceChildren();
  const routeNodes = route.nodes
    .map(id => document.querySelector(`.node[data-id="${id}"]`))
    .filter(Boolean);

  for (let index = 0; index < routeNodes.length - 1; index += 1) {
    const from = routeNodes[index].getBBox();
    const to = routeNodes[index + 1].getBBox();
    const x1 = from.x + from.width / 2;
    const y1 = from.y + from.height / 2;
    const x2 = to.x + to.width / 2;
    const y2 = to.y + to.height / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const sameRow = Math.abs(y2 - y1) < 40;
    const curve = sameRow
      ? `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`
      : `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;
    path.setAttribute('d', curve);
    path.setAttribute('class', 'route-line');
    path.setAttribute('marker-end', 'url(#arrow-route)');
    routeLayer.appendChild(path);
  }
}

function highlightRoute(id) {
  const route = ROUTES[NODE_ROUTES[id]];
  if (!route) return null;
  const routeIds = new Set(route.nodes);
  nodes.forEach(node => {
    node.classList.toggle('route-active', routeIds.has(node.dataset.id));
    node.classList.toggle('route-dim', !routeIds.has(node.dataset.id));
  });
  flows.forEach(flow => flow.classList.add('dim'));
  drawRoute(route);
  renderRouteSummary(route);
  return route;
}

function clearRoute() {
  nodes.forEach(node => node.classList.remove('route-active', 'route-dim', 'selected'));
  routeLayer.replaceChildren();
  routeSummary.replaceChildren();
  routeSummary.classList.remove('visible');
  panel.innerHTML = initialPanel;
}

nodes.forEach(n => {
  const details = DATA[n.dataset.id];
  n.setAttribute('tabindex', '0');
  n.setAttribute('role', 'button');
  n.setAttribute('aria-label', details ? `${details.title}: show details` : 'Show node details');

  const selectNode = () => {
    setFilter('all');
    nodes.forEach(x => x.classList.remove('selected'));
    n.classList.add('selected');
    const route = highlightRoute(n.dataset.id);
    renderPanel(n.dataset.id, route);
  };

  n.addEventListener('click', selectNode);
  n.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectNode();
    }
  });
});

let activeFilter = 'all';
buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    clearRoute();
    setFilter(btn.dataset.filter);
  });
});

function applyFilter() {
  nodes.forEach(n => {
    const layer = n.dataset.layer;
    const show = activeFilter === 'all' || layer === activeFilter;
    n.classList.toggle('dim', !show);
  });
  flows.forEach(f => {
    const layers = (f.dataset.layers || '').split(',');
    const wasIntentionallyDim = f.dataset.baseDim === '1';
    if (activeFilter === 'all') {
      f.classList.toggle('dim', wasIntentionallyDim);
    } else {
      f.classList.toggle('dim', !layers.includes(activeFilter));
    }
  });
}

// Preserve the initial gated-flow emphasis when the full map is visible.
document.querySelectorAll('.flow-line.dim').forEach(f => f.dataset.baseDim = '1');
