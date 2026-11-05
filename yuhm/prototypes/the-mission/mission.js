/* THE MISSION — clickable UX demo. Everything here is sample content; nothing talks to Supabase. */
(() => {
  'use strict'

  // Icon paths from lucide (ISC), the same set the app already ships.
  const P = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    chef: '<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    radar: '<path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  }
  const icon = (name, size = 18) => `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${P[name]}</svg>`

  // Produce-colored routes: tomato, leaf, corn, aubergine, pea, carrot. [fill, tint, tilt]
  const LOOK = { eat: ['#f08a6c', '#fde6dc', -2.2], grow: ['#8cc084', '#e3f1df', 1.6], make: ['#f5c451', '#fcefc9', -1.2], move: ['#b79ac6', '#efe6f4', 2], share: ['#b9d99b', '#edf6e2', -1.8], organize: ['#f3a552', '#fde9d0', 1.4] }

  const ROUTES = [
    { id: 'eat', label: 'Eat', icon: 'utensils', copy: 'Find food, help others find it',
      bite: { q: 'Last time you stopped by a community fridge, how was it?', opts: ['Well stocked', 'A few things', 'Empty', "Haven't been yet"] },
      mission: { title: 'Fridge check: Chestnut fridge', when: 'Any time today', dist: '0.4 mi · 15 min', needs: 'Just your phone', moves: 'Keeps one listing honest for everyone after you', seeds: 20, stamp: 'First check',
        steps: [['Walk to the fridge', 'The exact spot shows here now that you have accepted.', "I'm here"], ['Note what is inside', 'A quick look. No need to touch anything.', 'Noted', ['Fridge is running and clean', 'Shelves photographed', 'Hours on the door match the listing']], ['Send the update', 'Your note goes to the listing and to the fridge host.', 'Send it']],
        thanks: ['Thanks for checking on us. We restocked an hour after your note.', 'Fridge host, Chestnut'] } },
    { id: 'grow', label: 'Grow', icon: 'sprout', copy: 'Share your garden’s extra',
      bite: { q: 'What do you have more of than you can eat?', opts: ['Tomatoes and peppers', 'Herbs', 'Figs, citrus, pecans', 'Eggs', 'Nothing yet'] },
      mission: { title: 'Harvest share: Saturday pool table', when: 'Sat Sep 26, 9 to 10 am', dist: '0.8 mi · 45 min', needs: 'Bags or a crate', moves: 'About 12 lb of garden extras', seeds: 35, stamp: 'First harvest',
        steps: [['Pick and bag', 'Whatever you can spare this week.', 'Bagged', ['Soil rinsed off', 'Bagged by type', 'Date written on the bag']], ['Bring it to the pool table', 'The exact spot shows here now that you have accepted.', "I'm here"], ['Hand off to the pool host', 'They weigh it in so the circle can count it.', 'Handed off']],
        thanks: ['Your peppers were gone in ten minutes. Bring more any time.', 'Pool host, Eastside'] } },
    { id: 'make', label: 'Make', icon: 'chef', copy: 'Cook or bake for a gathering',
      bite: { q: 'What can your kitchen do?', opts: ['Batch cooking', 'Baking', 'Canning and preserving', 'Prep and chopping', 'Washing up'] },
      mission: { title: 'Kitchen shift: soup night prep', when: 'Thu Sep 24, 5 to 7 pm', dist: '1.4 mi · 2 hours', needs: 'Closed shoes, hair tied back', moves: 'About 60 portions of soup', seeds: 45, stamp: 'First shift',
        steps: [['Arrive and wash in', 'The kitchen address shows here now that you have accepted.', 'Washed in', ['Hands washed', 'Hair tied back', 'Closed shoes on']], ['Cook with the crew', 'The kitchen lead hands out stations.', 'Shift done'], ['Portion and label', 'Every container gets a date and an allergen note.', 'All labeled']],
        thanks: ['Sixty bowls went out warm. The crew says you chop fast.', 'Kitchen lead'] } },
    { id: 'move', label: 'Move', icon: 'truck', copy: 'Carry food to where it is needed',
      bite: { q: 'What wheels do you have?', opts: ['On foot', 'Bike', 'Cargo bike', 'Car', 'Truck or van'] },
      mission: { title: 'Rescue run: bakery to fridge', when: 'Today, 4:30 to 5:30 pm', dist: '2.1 mi · 40 min', needs: 'Car or cargo bike, can lift 25 lb', moves: 'About 60 lb of day-old bread', seeds: 40, stamp: 'First rescue',
        steps: [['Pick up at the bakery', 'The address and the contact show here now that you have accepted.', 'Picked up', ['Crates counted (4)', 'Bags sealed', 'Pickup photo taken']], ['Drive to the fridge', 'The fridge host gets a heads-up that you are on the way.', "I'm here"], ['Stock and hand off', 'Bread on the top shelf, oldest in front.', 'Handed off']],
        thanks: ['The bread shelf was empty this morning. It is full now. Thank you.', 'Fridge host, Eastside'] } },
    { id: 'share', label: 'Share', icon: 'heart', copy: 'Stock a fridge, pass it along',
      bite: { q: 'What could you share this month?', opts: ['Pantry staples', 'Garden extras', 'Fridge or freezer space', 'A ride', 'My time'] },
      mission: { title: 'Stock the fridge: pantry staples', when: 'Any time before Friday', dist: '0.6 mi · 20 min', needs: 'Sealed, in-date items', moves: 'About 10 lb of staples', seeds: 25, stamp: 'First drop',
        steps: [['Gather your items', 'Rice, beans, pasta, canned fish, peanut butter all go fast.', 'Packed', ['Everything sealed', 'Dates checked', 'Nothing home-canned']], ['Drop at the fridge', 'The exact spot shows here now that you have accepted.', "I'm here"], ['Shelve and snap a photo', 'The photo updates the listing for the next neighbor.', 'Stocked']],
        thanks: ["Somebody's dinner tonight started on your shelf.", 'Fridge host'] } },
    { id: 'organize', label: 'Organize', icon: 'users', copy: 'Bring neighbors to the table',
      bite: { q: 'Where would you gather people?', opts: ['My block', 'A park', 'A church or school', 'An apartment courtyard', 'Not sure yet'] },
      mission: { title: 'Welcome table: Saturday pool', when: 'Sat Sep 26, 9 to 11 am', dist: '0.8 mi · 2 hours', needs: 'A friendly face. Spanish is a plus', moves: 'Around 40 neighbors welcomed', seeds: 40, stamp: 'First welcome',
        steps: [['Set up the table', 'The exact spot shows here now that you have accepted.', 'Set up', ['Sign is out', 'Sign-in sheet ready', 'Water and shade sorted']], ['Welcome neighbors', 'Say hello, point to the table, answer what you can.', 'Wrapped up'], ['Close out', 'Send the visitor count so the circle can plan next week.', 'Count sent']],
        thanks: ['Three new families came back because someone said hello.', 'Circle organizer'] } },
  ]
  const BOARD_BITES = [['Confirm hours at a fridge near you', '2 min', 10, 'clock'], ['Translate one listing into Spanish', '3 min', 10, 'languages'], ['Nominate a food source you know', '2 min', 15, 'pin']]
  const LEVELS = [['Seed', 0], ['Sprout', 50], ['Vine', 150], ['Bloom', 400], ['Harvest', 900], ['Perennial', 2000]]
  const CORE_SCREENS = [['arrive', 'Arrive'], ['route', 'Pick a route'], ['bite', 'First bite'], ['save', 'Save your spot'], ['optin', 'Opt in'], ['board', 'Mission board'], ['offer', 'The offer'], ['active', 'On a mission'], ['done', 'Done'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['controls', 'Controls']]
  const CORE_GROUPS = [['First visit', 0, 5], ['The loop', 5, 9], ['Staying in touch', 9, 12]]

  const state = { screen: 'arrive', route: 'move', picked: [], biteDone: false, seeds: 0, done: 0, optedIn: null, goal: 2, email: true, whatsapp: false, free: false, offerReady: false, passed: false, step: 0, checks: [], missionDone: false, miniDone: [], mailTab: 'offer', chat: null, paused: false, left: false, foodNote: false, seen: ['arrive'] }
  // Pending replies are never cancelled: they settle state even if the viewer moved on,
  // and only repaint when their screen is still showing. Only the hold countdown is per-render.
  let holdTimer = null
  let lastScreen = null
  let countFrom = null
  let uid = 0
  const later = (fn, ms) => { setTimeout(fn, ms) }
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const route = () => ROUTES.find((r) => r.id === state.route)
  const level = () => {
    const at = LEVELS.reduce((found, entry, i) => (state.seeds >= entry[1] ? i : found), 0)
    const next = LEVELS[at + 1]
    const span = next ? next[1] - LEVELS[at][1] : 1
    return { name: LEVELS[at][0], next: next ? next[0] : null, toNext: next ? next[1] - state.seeds : 0, pct: next ? Math.round(((state.seeds - LEVELS[at][1]) / span) * 100) : 100 }
  }

  /* ---------- components ---------- */
  const seedsTag = (n) => `<span class="seeds">${icon('leaf', 14)}+${n}</span>`
  const statusBar = (cls = '') => `<div class="sb ${cls}"><span>9:41</span><span class="sb-r"><svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true"><rect x=".75" y=".75" width="21.5" height="10.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".5"/><rect x="2.5" y="2.5" width="15" height="7" rx="1.6" fill="currentColor"/><rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity=".5"/></svg></span></div>`
  const top = (right = '<span class="tag">Sample data</span>') => `${statusBar()}<div class="p-top"><span class="lockup">yuhm<span class="heart">♥</span></span>${right}</div>`
  const shell = (body, foot = '', right) => `${top(right)}<div class="p-body">${body}</div>${foot ? `<div class="p-foot">${foot}</div>` : ''}`
  const trail = (n) => `<ol class="trail" aria-label="Step ${n} of 3">${['Route', 'First bite', 'Save'].map((l, i) => `<li class="${i + 1 < n ? 'on' : i + 1 === n ? 'on now' : ''}">${l}</li>`).join('')}</ol>`
  const switchRow = (label, sub, on, key) => `<div class="switch-row"><span>${label}<small>${sub}</small></span><button class="switch" role="switch" aria-checked="${on}" aria-label="${label}" ${key ? `data-act="sw:${key}"` : 'disabled'}></button></div>`
  const burst = () => Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return `<i style="--x:${Math.round(Math.cos(a) * 130)}px;--y:${Math.round(Math.sin(a) * 104)}px;animation-delay:${i * 16}ms"></i>` }).join('')

  // An embroidered-patch stamp: scalloped edge, stitched ring, text on two arcs.
  function patch(topText, bottomText, iconName, fill, size = 132, cls = '') {
    const id = `pt${++uid}`; const n = 20; const R = 54; const c = 66
    const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; return [(c + R * Math.cos(a)).toFixed(2), (c + R * Math.sin(a)).toFixed(2)] })
    const r = (R * Math.sin(Math.PI / n)).toFixed(2)
    const d = `M${pts[0][0]} ${pts[0][1]}${pts.map((_, i) => { const p = pts[(i + 1) % n]; return `A${r} ${r} 0 0 1 ${p[0]} ${p[1]}` }).join('')}Z`
    return `<svg class="patch ${cls}" width="${size}" height="${size}" viewBox="0 0 132 132" role="img" aria-label="${topText} stamp">
      <path d="${d}" fill="${fill}"/><circle cx="66" cy="66" r="47" fill="none" stroke="#3b2922" stroke-width="1.6" stroke-dasharray="4 3.5" opacity=".6"/>
      <defs><path id="${id}a" d="M31 66A35 35 0 0 1 101 66"/><path id="${id}b" d="M22 66A44 44 0 0 0 110 66"/></defs>
      <text class="patch-t"><textPath href="#${id}a" startOffset="50%" text-anchor="middle">${topText}</textPath></text>
      <text class="patch-t"><textPath href="#${id}b" startOffset="50%" text-anchor="middle">${bottomText}</textPath></text>
      <g transform="translate(50 50) scale(1.34)" fill="none" stroke="#3b2922" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[iconName]}</g></svg>`
  }
  const ring = (pct, inner) => { const r = 24; const c = 2 * Math.PI * r; return `<svg width="58" height="58" viewBox="0 0 58 58" aria-hidden="true"><circle cx="29" cy="29" r="${r}" fill="none" stroke="#e4d8bd" stroke-width="6"/><circle cx="29" cy="29" r="${r}" fill="none" stroke="#f0b429" stroke-width="6" stroke-linecap="round" stroke-dasharray="${((c * Math.max(pct, 3)) / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 29 29)"/><g transform="translate(18 18) scale(.92)" fill="none" stroke="#3b2922" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[inner]}</g></svg>` }
  const factList = (m) => `<dl class="tk-facts"><div><dt>${icon('clock', 13)}When</dt><dd>${m.when}</dd></div><div><dt>${icon('pin', 13)}How far</dt><dd>${m.dist}</dd></div><div><dt>${icon('bag', 13)}You need</dt><dd>${m.needs}</dd></div><div><dt>${icon('box', 13)}It moves</dt><dd>${m.moves}</dd></div></dl>`
  const cadence = () => `<div class="cadence">${[[1, 'Easy'], [2, 'Steady'], [3, 'All in']].map(([n, l]) => `<button aria-pressed="${state.goal === n}" data-act="goal:${n}"><span class="pips">${'<i></i>'.repeat(n)}</span><strong>${n} a week</strong><small>${l}</small></button>`).join('')}</div>`
  const heroArt = `<div class="hero-art"><svg viewBox="0 0 390 118" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><circle cx="318" cy="44" r="27" fill="#f0b429"/><path d="M0 84C70 50 130 58 200 80S330 96 390 62V118H0Z" fill="#a9c98b"/><path d="M0 102C90 72 170 98 250 94S350 80 390 94V118H0Z" fill="#2d6b50"/><g transform="translate(62 44) rotate(-10)"><circle r="20" fill="#fffdf6"/><circle r="15.5" fill="#f08a6c"/><path d="M-2-14q3-7 9-5" stroke="#2d6b50" stroke-width="3.2" fill="none" stroke-linecap="round"/></g><g transform="translate(142 30) rotate(9)"><circle r="16" fill="#fffdf6"/><circle r="12" fill="#b79ac6"/><path d="M-1-11q1-6 6-6" stroke="#2d6b50" stroke-width="3" fill="none" stroke-linecap="round"/></g><g transform="translate(222 56) rotate(-6)"><circle r="14" fill="#fffdf6"/><circle r="10.5" fill="#f3a552"/></g></svg></div>`

  /* ---------- screens ---------- */
  const VIEWS = {
    arrive: () => shell(`
      ${heroArt}
      <h2 class="big">Food, shared full circle.</h2>
      <p class="sub">Find food near you, or take part in moving it. Nothing good goes to waste.</p>
      <button class="p-btn" data-act="food">${icon('pin')}Find food near me</button>
      ${state.foodNote ? '<div class="quiet-note"><b>Unchanged.</b> Straight to the map. No account, no seeds, no prompts to join. A hungry neighbor never meets a game.</div>' : ''}
      <button class="p-btn quiet" data-go="route">${icon('sprout')}Take part</button>
      <button class="p-link" data-go="board">I have an account. Sign in</button>`),

    route: () => shell(`
      ${trail(1)}
      <h2>How do you want to take part?</h2>
      <div class="routes" role="radiogroup" aria-label="Routes">${ROUTES.map((r) => `
        <button class="route" role="radio" aria-checked="${state.route === r.id}" data-act="route:${r.id}" style="--c:${LOOK[r.id][0]};--tilt:${LOOK[r.id][2]}deg">
          ${state.route === r.id ? `<span class="tick">${icon('check', 17)}</span>` : ''}${icon(r.icon, 30)}<strong>${r.label}</strong><small>${r.copy}</small>
        </button>`).join('')}</div>
      <p class="sub">Pick one to start. You can add more later.</p>`,
      `<button class="p-btn" data-go="bite">Show me a first mission ${icon('arrow')}</button>`),

    bite: () => {
      const b = route().bite
      if (state.biteDone) return shell(`
        ${trail(2)}
        <div class="cele"><div class="burst">${burst()}</div>
          ${patch('First bite', 'yuhm · Austin', 'leaf', LOOK[state.route][0], 150, 'stamped')}
          <h2>First mission done</h2>${seedsTag(10)}
          <p class="sub">That was a bite: two minutes, and yuhm already knows what to offer you. Runs and shifts are the bigger ones.</p></div>`,
        `<button class="p-btn" data-go="save">Save my seeds ${icon('arrow')}</button>`)
      return shell(`
        ${trail(2)}
        <div class="bite-q"><span class="row"><span class="kick">First bite · ${route().label} · 2 min</span>${seedsTag(10)}</span>
          <h2>${b.q}</h2>
          <div class="opts">${b.opts.map((o, i) => `<button class="opt" aria-pressed="${state.picked.includes(i)}" data-act="pick:${i}">${state.picked.includes(i) ? icon('check', 15) : ''}${o}</button>`).join('')}</div></div>
        <p class="sub">Your answer shapes which missions you get offered. Change it any time.</p>`,
        `<button class="p-btn" data-act="bite-done" ${state.picked.length ? '' : 'disabled'}>Done</button>`)
    },

    save: () => shell(`
      ${trail(3)}
      <div class="keep">${patch('First bite', 'yuhm · Austin', 'leaf', LOOK[state.route][0], 64)}<div><b>${state.seeds || 10} seeds and a stamp</b><span>${route().label} route. An account keeps them.</span></div></div>
      <h2>Save your spot</h2>
      <p class="sub">One step. If this email already has a yuhm account, this signs you in.</p>
      <label class="field-in" for="demo-email">Email<input id="demo-email" type="email" autocomplete="email" placeholder="you@example.org"></label>
      <label class="field-in" for="demo-pass">Password<input id="demo-pass" type="password" autocomplete="new-password" placeholder="At least 8 characters"></label>`,
      `<button class="p-btn" data-go="optin">Continue</button>`),

    optin: () => shell(`
      <span class="kick">Optional · your account works either way</span>
      <div class="row" style="align-items:flex-end"><div class="mission-mark">Join the<span>MISSION?</span></div>${patch('Opt in', 'Pause any time', route().icon, LOOK[state.route][0], 92)}</div>
      <p class="sub">Missions matched to your ${route().label} route, near your neighborhood, at a rhythm you choose.</p>
      <div class="shelf"><span class="kick">Your weekly rhythm</span>${cadence()}</div>
      <div class="shelf"><span class="kick">How may we reach you?</span><div class="group">
        ${switchRow('In the app', 'Always on', true, null)}
        ${switchRow('Email', 'Offers, reminders, a Sunday digest', state.email, 'email')}
        ${switchRow('WhatsApp', 'Offers and a helper you can talk to', state.whatsapp, 'whatsapp')}</div></div>
      <ul class="pledge">
        <li>${icon('check', 17)}Passing on a mission never costs you anything.</li>
        <li>${icon('check', 17)}Pause or leave in one tap. Quiet from 9 pm to 8 am.</li>
        <li>${icon('check', 17)}Addresses stay hidden until you accept.</li>
        <li>${icon('check', 17)}Seeds are thanks, not money. No public ranking.</li></ul>`,
      `<button class="p-btn" data-act="join">I'm in</button><button class="p-btn quiet" data-act="notnow">Not now, just let me use yuhm</button>`),

    board: () => {
      if (state.optedIn === false) return shell(`
        <h2 class="big">You're in. No missions.</h2>
        <p class="sub">Your account works like it does today: post, request, gather, coordinate. THE MISSION waits in your profile as one quiet card, and nothing will message you about it.</p>
        <div class="list"><div class="item"><span class="dot">${icon('sprout')}</span><span>THE MISSION<small>Missions near you, at your rhythm. See what it is.</small></span>${icon('arrow', 16)}</div></div>`,
        `<button class="p-btn quiet" data-go="optin">${icon('back')}Back to the opt-in</button>`)
      const lv = level(); const m = route().mission
      const now = state.missionDone ? '<div class="quiet-note"><b>Nothing held for you right now.</b> New missions show here the moment they match.</div>'
        : state.passed ? '<div class="quiet-note"><b>Passed. No harm done.</b> It went to the next neighbor.</div>'
        : state.offerReady || !state.free ? `<button class="ticket-wrap" data-go="offer" aria-label="Open the offer: ${m.title}"><span class="ticket compact" style="display:block"><span class="tk-head" style="display:flex"><span class="row"><span class="lab">Held for you · 15 min</span>${seedsTag(m.seeds)}</span><h3>${m.title}</h3></span><span class="tk-stub"><b>${m.when}</b>${icon('arrow', 18)}</span></span></button>`
        : `<div class="searching">${icon('radar', 20)}Looking for missions near Eastside…</div>`
      return shell(`
        ${state.paused ? `<div class="banner">${icon('pause', 16)}<span>Paused until Oct 3. Your rhythm is frozen, not broken.</span></div>` : ''}
        <div class="passport">
          <div class="lvl">${ring(lv.pct, 'leaf')}<b>${lv.name}</b><small>${lv.next ? `${lv.toNext} to ${lv.next}` : 'top level'}</small></div>
          <div class="pp-head"><h3>Week 1 rhythm</h3>${`<span class="seeds">${icon('leaf', 14)}${state.seeds}</span>`}</div>
          <ol class="punch" aria-label="This week">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => `<li class="${i === 5 ? (state.done ? 'on' : 'now') : ''}"><i>${i === 5 && state.done ? icon('check', 13) : ''}</i>${d}</li>`).join('')}</ol>
          <div class="goal"><span><b>${Math.min(state.done, state.goal)} of ${state.goal}</b> this week</span><span class="pips">${Array.from({ length: state.goal }, (_, i) => `<i class="${i < state.done ? 'on' : ''}"></i>`).join('')}</span></div>
        </div>
        <button class="free" role="switch" aria-checked="${state.free}" data-act="sw:free"><span class="knob">${icon('radar', 20)}</span><span><b>${state.free ? 'Free until 6:30 pm' : "I'm free now"}</b><small>${state.free ? 'Looking nearby. Tap to go off the clock.' : 'Find me something nearby for the next 2 hours'}</small></span></button>
        <div class="shelf"><span class="kick">For you now</span>${now}</div>
        <div class="shelf"><span class="kick"><span>Bites</span><span>two minutes each</span></span><div class="list">${BOARD_BITES.map((b, i) => `<button class="item ${state.miniDone.includes(i) ? 'done' : ''}" data-act="mini:${i}"><span class="dot">${icon(state.miniDone.includes(i) ? 'check' : b[3], 17)}</span><span>${b[0]}<small>${b[1]}</small></span>${seedsTag(b[2])}</button>`).join('')}</div></div>
        <div class="shelf"><span class="kick">Claim a slot this week</span><div class="list">
          <div class="item"><span class="cal"><em>Sun</em><b>20</b></span><span>Compost return<small>4 pm · 1 spot left</small></span>${seedsTag(30)}</div>
          <div class="item"><span class="cal"><em>Sat</em><b>26</b></span><span>Eastside pool table<small>9 am · 2 spots left</small></span>${seedsTag(35)}</div></div></div>
        <div class="circle"><div class="row"><b>Eastside Circle this week</b><span class="tag">Sample</span></div><div class="crates" role="img" aria-label="310 of 500 pounds"><span style="width:62%"></span></div><p>310 of 500 lb moved together. No ranking, one shared goal.</p></div>`,
        '', `<span class="row"><span class="tag">Sample data</span><button class="p-link" style="padding:0" data-go="controls">Controls</button></span>`)
    },

    offer: () => {
      const m = route().mission
      return shell(`
        <div class="ticket-wrap"><article class="ticket">
          <header class="tk-head"><span class="row"><span class="lab">${route().label} · held for you</span>${icon(route().icon, 22)}</span><h2>${m.title}</h2></header>
          ${factList(m)}
          <footer class="tk-stub"><div><span class="lab">Seeds</span><b>+${m.seeds}</b></div><div style="text-align:right"><span class="lab">Hold ends in</span><b id="hold">14:59</b></div></footer>
        </article></div>
        <p class="lockline">${icon('lock', 16)}<span>Exact addresses and contacts appear after you accept. Until then it is neighborhood-level only.</span></p>
        <p class="sub">Not a fit? Passing is free. It goes to the next neighbor and nothing is held against you.</p>`,
        `<button class="p-btn" data-act="accept">Accept</button><button class="p-btn quiet" data-act="pass">Pass</button>`)
    },

    active: () => {
      const m = route().mission
      const live = Math.min(state.step, m.steps.length - 1)
      const items = [`<li class="past"><span class="node">${icon('check', 16)}</span><div class="body"><h4>Accepted</h4><p>Details unlocked. Reminder set for 2 hours before.</p></div></li>`]
        .concat(m.steps.map((s, i) => {
          const cls = i < live ? 'past' : i === live ? 'live' : ''
          const checks = i === live && s[3] ? `<div class="cks">${s[3].map((c, n) => `<button class="ck" aria-pressed="${state.checks.includes(n)}" data-act="ck:${n}"><span class="box">${icon('check', 15)}</span>${c}</button>`).join('')}</div>` : ''
          return `<li class="${cls}"><span class="node">${i < live ? icon('check', 16) : i + 1}</span><div class="body"><h4>${s[0]}</h4>${i <= live ? `<p>${s[1]}</p>` : ''}${checks}</div></li>`
        }))
      const s = m.steps[live]
      const ready = !s[3] || s[3].every((_, n) => state.checks.includes(n))
      return shell(`
        <div class="row"><span class="kick">On a mission · ${route().label}</span>${seedsTag(m.seeds)}</div>
        <h2>${m.title}</h2>
        <ol class="steps">${items.join('')}</ol>`,
        `<button class="p-btn" data-act="step" ${ready ? '' : 'disabled'}>${s[2]}</button><button class="p-link" data-act="release">Need to drop out? Release this mission</button>`)
    },

    done: () => {
      const m = route().mission; const lv = level()
      return shell(`
        <div class="cele"><div class="burst">${burst()}</div>
          ${patch(m.stamp, 'yuhm · Austin', route().icon, LOOK[state.route][0], 156, 'stamped')}
          <h2>Mission done</h2>
          <div class="count">${icon('leaf', 30)}<span id="seedcount">${state.seeds}</span><small>seeds</small></div>
          <p class="sub">${m.moves}. ${Math.min(state.done, state.goal)} of ${state.goal} this week, and your rhythm holds.</p></div>
        <div class="ringrow">${ring(lv.pct, 'sprout')}<div><b>${lv.name}</b><span>${lv.next ? `${lv.toNext} seeds until you grow to ${lv.next}` : 'Top level'}</span></div></div>
        <blockquote class="thanks" style="margin-block:8px 0">${m.thanks[0]}<cite>${m.thanks[1]} · sample note</cite></blockquote>
        <div class="loop">${patch('Full circle', 'back to soil', 'sprout', '#b9d99b', 58)}<div><div class="row"><h3>Take the scraps to compost</h3>${seedsTag(15)}</div><p>What is left returns to the soil. Optional, ten minutes.</p></div></div>`,
        `<button class="p-btn" data-go="board">Back to the board</button>`)
    },

    email: () => {
      const m = route().mission
      const MAILS = {
        offer: ['A mission near Eastside', '3:58 pm', m.title, `<p>${m.when}<br>${m.dist}<br>You need: ${m.needs}<br>It moves: ${m.moves}</p><p>Held for you until 4:15 pm. Passing is free.</p><div class="m-btns"><span>Accept</span><span class="alt">Pass</span></div>`, 'One tap, no login. The address arrives after you accept.'],
        reminder: ['In 2 hours', '2:30 pm', m.title, `<p>${m.when}. Calendar file attached.</p><p>Bring: ${m.needs}.</p><div class="m-btns"><span>See the steps</span><span class="alt">I can't make it</span></div>`, 'Releasing early costs nothing. It goes straight back to the board.'],
        digest: ['Your week with yuhm', 'Sun 5:00 pm', 'Week 1 of your rhythm', `<p><b>You:</b> ${Math.max(state.done, 1)} mission${Math.max(state.done, 1) === 1 ? '' : 's'} and ${Math.max(state.seeds, 10)} seeds.</p><p><b>Eastside Circle:</b> 310 lb moved, 4 fridges checked. (sample)</p><p><b>Open next week:</b> Compost return Sun 4 pm · Pool table Sat 9 am</p><div class="m-btns"><span>Claim a slot</span></div>`, 'Sundays at 5 pm. One email a week, never more.'],
        checkin: ['Still want missions?', 'Wed 10:00 am', 'Either answer is fine', `<p>You have not picked one up in three weeks, which is completely okay. Life is full.</p><p>Should we keep sending them?</p><div class="m-btns"><span>Keep them coming</span><span class="alt">Pause a month</span><span class="alt">Stop missions</span></div>`, 'If we do not hear back, we go quiet on our own. Your account and history stay.'],
      }
      const mail = MAILS[state.mailTab]
      return shell(`
        <h2>What lands in the inbox</h2>
        <div class="segs" role="tablist">${[['offer', 'Offer'], ['reminder', 'Reminder'], ['digest', 'Digest'], ['checkin', 'Check-in']].map(([id, l]) => `<button role="tab" aria-selected="${state.mailTab === id}" data-act="mail:${id}">${l}</button>`).join('')}</div>
        <article class="mail"><header><span class="av">y</span><b>${mail[0]}</b><time>${mail[1]}</time><span>yuhm &lt;missions@yuhm.handprotocol.org&gt;</span></header><h3>${mail[2]}</h3><div class="m-body">${mail[3]}</div><footer>${mail[4]} · Pause · Stop mission email</footer></article>`)
    },

    whatsapp: () => `${statusBar('wa')}
      <div class="wa-head"><span class="av">y</span><span><b>yuhm helper</b><small>automated · a person is one message away</small></span></div>
      <div class="wa-log" id="wa-log" aria-live="polite">${state.chat.map((c) => (c.typing ? '<div class="msg typing" aria-label="typing"><i></i><i></i><i></i></div>' : `<div class="msg ${c.who === 'me' ? 'me' : ''}">${c.html}${c.qr ? `<div class="qr">${c.qr.map(([l, k]) => `<button data-act="say:${k}">${l}</button>`).join('')}</div>` : ''}</div>`)).join('')}</div>
      <div class="wa-suggest" aria-label="Try a message">${[['What do I need to bring?', 'bring'], ['Pausa por dos semanas', 'pausa'], ["What's my rhythm?", 'rhythm'], ['Talk to a person', 'person']].map(([l, k]) => `<button data-act="say:${k}">${l}</button>`).join('')}</div>
      <div class="wa-bar" aria-hidden="true"><span>Tap a suggestion above</span><i>${icon('send', 17)}</i></div>`,

    controls: () => shell(`
      <h2>Your controls</h2>
      ${state.left ? '<div class="banner"><span><b>You left THE MISSION.</b> Your account and history stay. Your phone number is deleted and mission messages have stopped.</span></div>' : ''}
      <div class="shelf"><span class="kick">Weekly rhythm</span>${cadence()}</div>
      <div class="shelf"><span class="kick">Reach me by</span><div class="group">${switchRow('In the app', 'Always on', true, null)}${switchRow('Email', 'Offers, reminders, Sunday digest', state.email, 'email')}${switchRow('WhatsApp', 'Offers and the helper', state.whatsapp, 'whatsapp')}
        <div class="switch-row"><span>Quiet hours<small>Nothing is sent in between</small></span><b>9 pm to 8 am</b></div></div></div>
      <div class="shelf"><span class="kick">Take a break</span><div class="group"><div class="pause-tile"><p>${state.paused ? 'Paused until Oct 3. No offers, no nudges. Your rhythm is frozen, not broken.' : 'Pausing freezes your rhythm and stops every mission message.'}</p>
        <button class="p-btn quiet" data-act="pause">${icon('pause')}${state.paused ? 'Resume now' : 'Pause for 2 weeks'}</button></div></div></div>`,
      `<button class="p-link ${state.left ? '' : 'danger'}" data-act="leave">${state.left ? 'Rejoin THE MISSION' : 'Leave THE MISSION'}</button>`),
  }

  const NOTES = {
    arrive: ['Arrive: two doors, one new label', 'The landing keeps its two doors. Find food stays exactly as it is: no account, no game, straight to the map. For first-time visitors the second door changes from Sign in to Take part, and Sign in drops to a text link for returning members.', ['Borrowed', 'Nothing yet. The rule on this screen is restraint.'], ['Writes', 'Nothing. A first-visit flag in localStorage (<code>yuhm:first-visit</code>) decides which label the second door wears.'], ['Guardrail', 'Find food never shows seeds, streaks, or prompts to join. Tap it to see.']],
    route: ['Pick a route: commitment before paperwork', 'Six routes, the same six the living world already uses (<code>WorldRole</code>: eat, grow, make, move, share, organize). Each gets a produce color that follows the person through every later screen: the first bite, the ticket, the stamps.', ['Borrowed', 'Duolingo asks what you want to learn before it asks who you are.'], ['Writes', 'Nothing yet. The choice rides in localStorage (<code>yuhm:mission-draft</code>) until the account exists.']],
    bite: ['First bite: a mission before the account', 'A two-minute mission finished before sign-up. It is the profile form in disguise: the answer becomes the capabilities the dispatcher matches on (wheels, kitchen skills, what they grow). Finishing it earns the first 10 seeds and the first stamp.', ['Borrowed', 'Duolingo lets you finish a lesson, then offers to save your progress. People protect what they have already earned.'], ['Writes', 'Draft only. On account creation the draft is claimed: capabilities go to <code>food_mission_enrollments</code>, the seeds go to <code>food_reputation_ledger</code> as <code>training_completed</code>.']],
    save: ['Save your spot: the same one-step form', 'This is the existing <code>EmailContinueForm</code>, untouched: email, password, Continue. It signs in or creates the account. The only change is a header showing what the person is about to keep. Email and password stays the mechanism.', ['Borrowed', 'The save-your-progress moment. Sign-up reads as keeping something, not as paperwork.'], ['Writes', 'Supabase auth user, <code>command.profiles</code>, then the existing <code>ensure_food_participant()</code>. The draft is claimed right after.'], ['Guardrail', 'No new fields. The September funnel pass cut sign-up to one step and this keeps it there.']],
    optin: ['Opt in: a separate yes', 'An account does not enroll anyone. This screen says what the person gets, asks for a rhythm, asks how yuhm may reach them, and states four promises. Not now is a full-size button, and it leads to the normal app.', ['Borrowed', 'Duolingo’s goal picker (casual, regular, serious), changed from daily to weekly because food work runs on a weekly beat.'], ['Writes', '<code>food_mission_enrollments</code> (status, routes, rhythm goal, zone, consent version). One <code>food_notification_prefs</code> row per category and channel. A WhatsApp number goes to <code>food_contact_channels</code>, encrypted, with consent time recorded.'], ['Notifies', 'A welcome email listing this week’s open slots. WhatsApp sends its own opt-in confirmation.']],
    board: ['Mission board: home for members who opted in', 'A punch card on top: level ring, the week’s punches, the goal. Then one ticket held for you, bites that take two minutes, and slots to claim. The I’m free now bar is the volunteer version of going online. The circle goal is shared progress, not a ranking.', ['Borrowed', 'DoorDash: Dash Now, scheduled shifts, the offer card. Duolingo: streak counter, daily quests, goal ring.'], ['Writes', 'The bar sets <code>available_until</code> on the enrollment. Everything else is one read: <code>list_food_missions()</code>.'], ['Guardrail', 'Only real missions appear. A quiet zone says it is quiet. Bites always exist because the public directory always has hours to confirm, so the board is never empty and never fake.']],
    offer: ['The offer: a ticket you can accept or pass', 'One ticket, four facts: when, how far, what you need, what it moves. The hold on the stub is calm and long: 15 minutes for same-day rescues, hours for scheduled work. Pass is free and says so. The exact address stays hidden until acceptance.', ['Borrowed', 'DoorDash’s offer card and countdown, without the red urgency or the acceptance-rate penalty.'], ['Writes', '<code>food_mission_offers</code> moves to accepted or passed. Accept locks the mission row, fills a slot, creates <code>food_mission_assignments</code>, and for rescues calls the existing <code>claim_food_rescue()</code>.'], ['Notifies', 'Accept schedules the 24-hour and 2-hour reminders. Pass re-offers to the next neighbor.']],
    active: ['On a mission: one live step', 'A route line with one stop live at a time. A stop can ask for light evidence: a checklist, a count, a photo. Releasing is always visible, and releasing early costs nothing.', ['Borrowed', 'DoorDash’s pickup and drop-off flow, with a confirmation at each stop.'], ['Writes', 'Each tap appends to <code>food_mission_checkpoints</code> with an idempotency key, so a double tap on bad signal never double-counts. Rescue missions also call the existing <code>record_food_rescue_checkpoint()</code>.'], ['Notifies', 'The coordinator sees progress live. The receiving spot gets a heads-up at the on-the-way step.'], ['Guardrail', 'Food-safety checklists live on the mission template, so a cold-chain run always asks about the cooler.']],
    done: ['Done: the payoff', 'A stamp thunks down, the seeds count up, the week gets its punch, and a real thank-you note shows when there is one. Then one optional next step, the compost return, which closes the loop back to soil.', ['Borrowed', 'Duolingo’s lesson-complete screen. DoorDash’s delivery summary, with impact where earnings would be.'], ['Writes', 'One transaction: assignment completed, a ledger row (<code>delivery_completed</code>, points), the <code>food_mission_progress</code> cache, a stamp if earned, and an outbox row for the receipt.'], ['Notifies', 'A receipt on the person’s chosen channel. No upsell.']],
    email: ['Email: four messages, all one-tap', 'Email is the default channel because Resend is already wired. Every email works without a login: signed links accept, pass, pause, or stop. Scheduled missions attach a calendar file. The fourth tab matters most: after three quiet weeks yuhm asks once, and silence means it goes quiet.', ['Borrowed', 'Duolingo’s reminder cadence, turned around: fewer messages when someone drifts, never more.'], ['Writes', '<code>food_notification_log</code> on every send and every suppression. One-tap links hit a Netlify function that verifies the signature and calls the same RPCs as the app.']],
    whatsapp: ['WhatsApp: a one-to-one helper', 'Opt-in only. The helper sends offers and reminders as approved utility templates with quick-reply buttons, and answers questions in English or Spanish. It can do only what the person could do in the app, and it hands off to a coordinator on request or when something sounds like safety or urgent need. Tap the buttons and suggestions to try it.', ['Borrowed', 'DoorDash’s text-message offer loop, moved to the app many Austin neighbors already live in.'], ['Writes', 'Rows in <code>food_messages</code> under one <code>food_conversations</code> thread. Every action lands in <code>food_agent_actions</code> under a <code>food_agent_mandates</code> grant.'], ['Guardrail', 'Official Cloud API only. A bot inside a big neighborhood group is not possible there (groups cap at 8 people and need a verified business badge), so circle-wide news goes to a human-run announcement group.']],
    controls: ['Controls: pause and leave are one tap', 'Rhythm, channels, quiet hours, pause, leave. Pausing freezes the rhythm instead of breaking it. Leaving keeps the account and the history, deletes the phone number, and stops every mission message.', ['Borrowed', 'Duolingo’s streak freeze, made automatic and generous.'], ['Writes', '<code>food_mission_enrollments.status</code> and <code>paused_until</code>, <code>food_notification_prefs</code>, and on leave a hard delete of the WhatsApp row in <code>food_contact_channels</code>.']],
  }

  // Extensions (gather.js) add a group of screens without touching the core flow. Each one is a
  // function that takes the shared components and returns { group, screens, views, notes, state, actions }.
  const EXT = (window.YUHM_DEMO_EXT ?? []).map((extend) => extend({ icon, shell, seedsTag, patch, state, render: () => render() }))
  const SCREENS = EXT.reduce((all, ext) => [...all, ...ext.screens], CORE_SCREENS)
  const GROUPS = EXT.reduce((all, ext) => [...all, [ext.group, all.at(-1)[2], all.at(-1)[2] + ext.screens.length]], CORE_GROUPS)
  const merged = (key) => Object.assign({}, ...EXT.map((ext) => ext[key]))
  const views = { ...VIEWS, ...merged('views') }
  const notesFor = { ...NOTES, ...merged('notes') }
  const extActions = merged('actions')
  Object.assign(state, merged('state'))

  const phone = document.getElementById('phone')
  const stepper = document.getElementById('stepper')
  const notes = document.getElementById('notes')
  const mastPatch = document.getElementById('mast-patch')
  const index = () => SCREENS.findIndex((s) => s[0] === state.screen)

  function seedChat() {
    const r = route(); const m = r.mission
    state.chat = [{ who: 'bot', html: `A mission near Eastside fits your ${r.label} route:<br><b>${m.title}</b><br>${m.when} · ${m.dist}<br>${m.moves}.<br>Want it?`, qr: [['Accept', 'accept'], ['Pass', 'pass'], ['Tell me more', 'bring']] }]
  }
  function reply(key) {
    const m = route().mission; const lv = level()
    return {
      accept: ['Accept', `It's yours. <b>${m.title}</b>, ${m.when}. The spot is on E 11th (sample), shown only now that you have accepted. I'll remind you 2 hours before. Reply DROP any time to release it, no hard feelings.`],
      pass: ['Pass', 'No problem, passed. It goes to the next neighbor and costs you nothing. If it was the wrong kind of mission, tell me what did not fit and I will adjust.'],
      bring: ['What do I need to bring?', `${m.needs}. ${m.moves}. Anything else you want to know before you decide?`],
      pausa: ['Pausa por dos semanas', 'Listo. Pausé tus misiones por dos semanas, hasta el 3 de octubre. No te escribo hasta entonces y tu ritmo queda guardado. Responde VOLVER cuando quieras regresar.'],
      rhythm: ["What's my rhythm?", `Week 1 of your rhythm, ${Math.min(state.done, state.goal)} of ${state.goal} missions this week. ${state.seeds} seeds${lv.next ? `, ${lv.toNext} more and you grow to ${lv.next}` : ''}.`],
      person: ['Talk to a person', 'Of course. I flagged this chat for a coordinator, and a person will answer here, usually within a few hours. If anyone needs food right now, the map is open with no sign-in: yuhm.handprotocol.org'],
    }[key]
  }

  function countUp() {
    const el = document.getElementById('seedcount')
    if (!el || countFrom === null) return
    const from = countFrom; const to = state.seeds; countFrom = null
    if (reduced()) return
    const t0 = performance.now()
    const tick = (t) => { const k = Math.min(1, (t - t0) / 900); const e = 1 - Math.pow(1 - k, 4); el.textContent = String(Math.round(from + (to - from) * e)); if (k < 1) requestAnimationFrame(tick) }
    el.textContent = String(from); requestAnimationFrame(tick)
  }

  function render() {
    if (holdTimer) { clearInterval(holdTimer); holdTimer = null }
    const pastSave = index() >= SCREENS.findIndex((s) => s[0] === 'save')
    if (pastSave && !state.biteDone) { state.biteDone = true; state.seeds += 10; state.done += 1 }
    if (state.screen === 'whatsapp' && !state.chat) seedChat()
    if (state.screen === 'done' && !state.missionDone) { countFrom = state.seeds; state.missionDone = true; state.seeds += route().mission.seeds; state.done += 1 }
    if (!state.seen.includes(state.screen)) state.seen = [...state.seen, state.screen]
    phone.dataset.enter = lastScreen === state.screen ? '0' : '1'
    lastScreen = state.screen
    phone.style.setProperty('--rc', LOOK[state.route][0]); phone.style.setProperty('--rt', LOOK[state.route][1])
    phone.innerHTML = views[state.screen]()
    const at = index()
    stepper.innerHTML = GROUPS.map(([label, a, b]) => `<div class="rail-row"><span class="lab">${label}</span><ol>${SCREENS.slice(a, b).map((s, i) => `<li class="${state.seen.includes(s[0]) ? 'seen' : ''}"><button data-go="${s[0]}" ${a + i === at ? 'aria-current="step"' : ''}><b>${a + i + 1}</b>${s[1]}</button></li>`).join('')}</ol></div>`).join('')
    const n = notesFor[state.screen]
    notes.innerHTML = `<span class="lab">Screen ${at + 1} of ${SCREENS.length}</span><h2>${n[0]}</h2><p>${n[1]}</p><dl>${n.slice(2).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      <div class="nav-row"><button data-nav="-1" ${at === 0 ? 'disabled' : ''}>${icon('back', 17)}Back</button><button class="primary" data-nav="1" ${at === SCREENS.length - 1 ? 'disabled' : ''}>Next screen${icon('arrow', 17)}</button></div>`
    if (state.screen === 'offer') {
      let left = 899
      holdTimer = setInterval(() => { left = Math.max(0, left - 1); const el = document.getElementById('hold'); if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` }, 1000)
    }
    if (state.screen === 'done') countUp()
    const log = document.getElementById('wa-log'); if (log) log.scrollTop = log.scrollHeight
  }

  function act(name, arg) {
    const A = {
      food: () => { state.foodNote = !state.foodNote },
      route: () => { if (state.route !== arg) { state.route = arg; state.picked = []; state.chat = null; state.step = 0; state.checks = [] } },
      pick: () => { const i = Number(arg); state.picked = state.picked.includes(i) ? state.picked.filter((p) => p !== i) : [...state.picked, i] },
      'bite-done': () => { if (!state.biteDone) { state.biteDone = true; state.seeds += 10; state.done += 1 }; lastScreen = null },
      goal: () => { state.goal = Number(arg) },
      sw: () => {
        state[arg] = !state[arg]
        if (arg === 'free' && state.free && !state.missionDone) { state.offerReady = false; state.passed = false; later(() => { state.offerReady = true; if (state.screen === 'board') render() }, 1900) }
      },
      join: () => { state.optedIn = true; state.left = false; state.screen = 'board' },
      notnow: () => { state.optedIn = false; state.screen = 'board' },
      mini: () => { const i = Number(arg); if (!state.miniDone.includes(i)) { state.miniDone = [...state.miniDone, i]; state.seeds += BOARD_BITES[i][2]; state.done += 1 } },
      accept: () => { state.step = 0; state.checks = []; state.screen = 'active' },
      pass: () => { state.passed = true; state.screen = 'board' },
      ck: () => { const i = Number(arg); state.checks = state.checks.includes(i) ? state.checks.filter((c) => c !== i) : [...state.checks, i] },
      step: () => { state.checks = []; if (state.step >= route().mission.steps.length - 1) state.screen = 'done'; else state.step += 1 },
      release: () => { state.passed = true; state.step = 0; state.checks = []; state.screen = 'board' },
      mail: () => { state.mailTab = arg },
      pause: () => { state.paused = !state.paused },
      leave: () => { state.left = !state.left; if (state.left) state.whatsapp = false },
      say: () => {
        const r = reply(arg)
        state.chat = [...state.chat.map((c) => ({ ...c, qr: null })), { who: 'me', html: r[0] }, { who: 'bot', typing: true }]
        later(() => { state.chat = [...state.chat.filter((c) => !c.typing), { who: 'bot', html: r[1] }]; if (state.screen === 'whatsapp') render() }, 1100)
      },
    }
    const run = A[name] ?? extActions[name]
    if (run) { run(arg); render() }
  }

  document.addEventListener('click', (event) => {
    const el = event.target instanceof Element ? event.target.closest('[data-go],[data-act],[data-nav]') : null
    if (!el || el.disabled) return
    if (el.dataset.go) { if (state.optedIn === null && ['board', 'offer', 'active', 'done'].includes(el.dataset.go)) state.optedIn = true; state.screen = el.dataset.go; render(); return }
    if (el.dataset.nav) { const next = SCREENS[index() + Number(el.dataset.nav)]; if (next) { if (state.optedIn === false && next[0] !== 'board') state.optedIn = true; state.screen = next[0]; render() } return }
    const [name, arg] = el.dataset.act.split(':')
    act(name, arg)
  })

  if (mastPatch) mastPatch.innerHTML = patch('Demo + plan', 'Not built yet', 'sprout', '#f08a6c', 176)
  const start = (data) => { if (data && data.state) Object.assign(state, data.state); render() }
  try { window.claude?.hot?.snapshot?.(() => ({ state })) } catch { /* preview without the runtime */ }
  if (window.claude?.hot?.ready) window.claude.hot.ready(start)
  else start(window.claude?.hot?.data ?? {})
})()
