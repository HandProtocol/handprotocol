/* Gatherings (beta): five screens added to THE MISSION demo through its extension hook.
   Everything here is sample content; nothing talks to Supabase. Plan: plans/005-yuhm-gatherings-koord.md */
(() => {
  'use strict'

  // Icon paths from lucide (ISC) that the core demo does not already carry.
  const GP = {
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  }

  const ME = 4
  const PANTRY_CENTS = 150
  const PANTRY_REAL = 138
  const BUFFER = 1.15
  const CEILING = 1.25
  const SWAP_REAL = 219
  const MAX_BATCHES = 3
  const ON_LIST = ['paid', 'covered', 'keep']
  const SECTIONS = ['Produce', 'Meat and dairy', 'Cans and dry']
  const MAKE_LOOK = 'style="--rc:#f5c451;--rt:#fcefc9"'

  // A small catalog in units a store sells. cents = the estimate, real = what the receipt said.
  const ITEMS = {
    onion: { name: 'Yellow onions', unit: 'each', sec: 'Produce', cents: 79, real: 72 },
    garlic: { name: 'Garlic heads', unit: 'each', sec: 'Produce', cents: 68, real: 68 },
    jalapeno: { name: 'Jalapeños', unit: 'each', sec: 'Produce', cents: 20, real: 18, net: true },
    cilantro: { name: 'Cilantro', unit: 'bunch', sec: 'Produce', cents: 78, real: 78, net: true },
    roma: { name: 'Roma tomatoes', unit: 'each', sec: 'Produce', cents: 40, real: 45, net: true },
    lime: { name: 'Limes', unit: 'each', sec: 'Produce', cents: 33, real: 25, net: true },
    chicken: { name: 'Chicken thighs', unit: 'lb', sec: 'Meat and dairy', cents: 399, real: 429, cold: true },
    bacon: { name: 'Bacon, 12 oz', unit: 'each', sec: 'Meat and dairy', cents: 399, real: 379, cold: true },
    chipotle: { name: 'Chipotles in adobo', unit: 'can', sec: 'Cans and dry', cents: 229, real: 249 },
    'tomato-can': { name: 'Crushed tomatoes, 28 oz', unit: 'can', sec: 'Cans and dry', cents: 189, real: 179 },
    pinto: { name: 'Pinto beans', unit: 'lb', sec: 'Cans and dry', cents: 148, real: 148 },
    rice: { name: 'Long grain rice', unit: 'lb', sec: 'Cans and dry', cents: 109, real: 109 },
  }
  const KITS = [
    { id: 'tinga', name: 'Chicken tinga', serves: 6, mins: 50, lines: [['chicken', 2], ['onion', 2], ['chipotle', 1], ['tomato-can', 1], ['garlic', 1]] },
    { id: 'beans', name: 'Charro beans', serves: 8, mins: 90, lines: [['pinto', 1], ['bacon', 1], ['onion', 1], ['jalapeno', 2], ['cilantro', 1], ['roma', 3]] },
    { id: 'rice', name: 'Cilantro lime rice', serves: 8, mins: 30, lines: [['rice', 2], ['lime', 3], ['cilantro', 1]] },
  ]
  const OTHERS = [
    { bin: 1, name: 'Marisol', dishes: { tinga: 1, rice: 1 }, src: {} },
    { bin: 2, name: 'Deshawn', dishes: { beans: 2 }, src: {} },
    { bin: 3, name: 'Priya', dishes: { rice: 2 }, src: {} },
    { bin: 5, name: 'Tomás', dishes: { tinga: 2 }, src: {} },
    { bin: 6, name: 'Ana', dishes: { beans: 1, rice: 1 }, src: {} },
    { bin: 7, name: 'Lee', dishes: { tinga: 1, beans: 1 }, src: {} },
  ]
  const ROLES = [['shop', 'Shop run · the grocery', 'Sat 10 am · about an hour', 40, 'cart'], ['sort', 'Sort the bins', 'Sun 1:15 pm · 30 min', 20, 'box'], ['clean', 'Cleanup crew', 'Sun 5 to 5:45 pm', 25, 'sprout']]
  const AUDIT = { paid: 'ticked by Rosa · today 3:42 pm', covered: 'covered by the pot · only you see this', keep: 'shop anyway · Rosa vouched', drop: 'dropped from the shop list' }

  const money = (cents) => `$${(cents / 100).toFixed(2)}`
  const PLURAL = { bunch: 'bunches', can: 'cans', jar: 'jars' }
  const amount = (qty, unit) => `${qty} ${qty === 1 ? unit : PLURAL[unit] ?? unit}`
  const toggled = (list, value) => (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value])

  window.YUHM_DEMO_EXT = [...(window.YUHM_DEMO_EXT ?? []), ({ icon, shell, seedsTag, patch, state }) => {
    const gi = (name, size = 18) => (GP[name] ? `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${GP[name]}</svg>` : icon(name, size))
    const g = () => state.g
    const set = (changes) => { state.g = { ...state.g, ...changes } }

    /* ---------- orders and money ---------- */
    // One order's lines: the same item from two dishes merges into one line.
    const linesFor = (order) => {
      const qty = KITS.flatMap((kit) => kit.lines.map(([key, n]) => [key, n * (order.dishes[kit.id] ?? 0)]))
        .reduce((sum, [key, n]) => ({ ...sum, [key]: (sum[key] ?? 0) + n }), {})
      return Object.keys(ITEMS).filter((key) => qty[key] > 0).map((key) => ({ key, qty: qty[key], source: order.src[key] ?? 'buy' }))
    }
    const buying = (order) => linesFor(order).filter((line) => line.source === 'buy')
    const cooking = (order) => Object.values(order.dishes).some((n) => n > 0)
    const swappedLine = (key) => key === 'chipotle' && g().swapped
    const realOf = (key) => (swappedLine(key) ? SWAP_REAL : ITEMS[key].real)
    const itemName = (key) => (swappedLine(key) ? 'Chipotle salsa' : ITEMS[key].name)
    const unitOf = (key) => (swappedLine(key) ? 'jar' : ITEMS[key].unit)
    const share = (order) => {
      const sub = buying(order).reduce((sum, line) => sum + line.qty * ITEMS[line.key].cents, 0)
      const pantry = cooking(order) ? PANTRY_CENTS : 0
      return { sub, pantry, total: Math.ceil(((sub + pantry) * BUFFER) / 100) * 100 }
    }
    const realShare = (order) => buying(order).reduce((sum, line) => sum + line.qty * realOf(line.key), 0) + (cooking(order) ? PANTRY_REAL : 0)
    // Named as the money holder would see it, since the checklist is her screen.
    const mine = () => ({ bin: ME, name: 'Sam (you)', dishes: g().dishes, src: g().src })
    const orders = () => [...OTHERS, mine()].sort((a, b) => a.bin - b.bin)
    const onList = () => orders().filter((order) => ON_LIST.includes(g().paid[order.bin]))
    const receiptTotal = () => onList().reduce((sum, order) => sum + realShare(order), 0)
    const shopRows = () => {
      const parts = onList().flatMap((order) => buying(order).map((line) => ({ ...line, bin: order.bin })))
      return Object.keys(ITEMS).map((key) => ({ key, parts: parts.filter((part) => part.key === key) }))
        .map((row) => ({ ...row, qty: row.parts.reduce((sum, part) => sum + part.qty, 0) })).filter((row) => row.qty > 0)
    }
    // Jumping straight to a later screen: carry the viewer through the steps they skipped.
    const ensureOnList = () => { if (!ON_LIST.includes(g().paid[ME])) set({ paid: { ...g().paid, [ME]: g().cover ? 'covered' : 'paid' } }) }
    const ensureShopped = () => { ensureOnList(); if (!g().receipt) set({ bought: shopRows().map((row) => row.key), receipt: true }) }

    /* ---------- components ---------- */
    const persona = (html) => `<div class="persona">${gi('eye', 15)}<span>${html}</span></div>`
    const bin = (n) => `<span class="bin">${n}</span>`
    const slip = (rows, total) => `<div class="slip">${rows.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('')}<div class="tot"><span>${total[0]}</span><b>${total[1]}</b></div></div>`
    const segs = (act, current, options) => `<div class="segs" role="tablist">${options.map(([id, label]) => `<button role="tab" aria-selected="${current === id}" data-act="${act}:${id}">${label}</button>`).join('')}</div>`
    const tally = (left, right) => `<div class="tally">${[left, right].map(([big, small]) => `<div><b>${big}</b><span>${small}</span></div>`).join('')}</div>`
    const plainList = (lines, glyph, note) => `<div class="list">${lines.map((line) => `<div class="item"><span class="dot">${gi(glyph, 17)}</span><span>${ITEMS[line.key].name}<small>${amount(line.qty, ITEMS[line.key].unit)} · ${note}</small></span></div>`).join('')}</div>`

    const dishRow = (kit) => {
      const n = g().dishes[kit.id] ?? 0
      return `<div class="item"><span class="dot">${gi('chef', 17)}</span><span>${kit.name}<small>${n ? `${n} batch${n > 1 ? 'es' : ''} · serves ${n * kit.serves}` : `a batch serves ${kit.serves}`}</small></span>
        <span class="qty"><button data-act="gdish:${kit.id}|-1" aria-label="One less batch of ${kit.name}" ${n === 0 ? 'disabled' : ''}>${gi('minus', 16)}</button><b>${n}</b><button data-act="gdish:${kit.id}|1" aria-label="One more batch of ${kit.name}" ${n === MAX_BATCHES ? 'disabled' : ''}>${gi('plus', 16)}</button></span></div>`
    }

    const lineRow = (line) => {
      const item = ITEMS[line.key]
      const cost = line.source === 'buy' ? money(line.qty * item.cents) : line.source === 'network' ? 'free' : 'yours'
      const option = (id, label, off) => `<button role="radio" aria-checked="${line.source === id}" data-act="gsrc:${line.key}|${id}" ${off ? 'disabled title="None listed nearby this week"' : ''}>${label}</button>`
      return `<div class="line"><div class="line-top"><b>${item.name}</b><span>${amount(line.qty, item.unit)}${item.cold ? ' <em class="cold">chilled</em>' : ''}</span><i>${cost}</i></div>
        <div class="src" role="radiogroup" aria-label="Source for ${item.name}">${option('bring', 'Bring')}${option('network', 'Network', !item.net)}${option('buy', 'Buy')}</div>
        ${line.source === 'network' ? '<small>From the Saturday pool table. A runner brings it to the kitchen.</small>' : ''}</div>`
    }

    const paidRow = (order) => {
      const mark = g().paid[order.bin] ?? null
      const asked = order.bin === ME && g().cover && !mark
      const late = g().payBy && !mark ? `<span class="led-acts"><button data-act="gkeep:${order.bin}">Shop anyway</button><button data-act="gdrop:${order.bin}">Drop</button></span>` : ''
      return `<div class="led ${mark ?? ''}"><button class="box" aria-pressed="${mark === 'paid' || mark === 'covered'}" aria-label="Mark bin ${order.bin} paid" data-act="gpaid:${order.bin}">${gi('check', 15)}</button>
        ${bin(order.bin)}<span class="who">${order.name}<small>${mark ? AUDIT[mark] : asked ? 'asked to be covered' : 'not marked yet'}</small></span><b>${money(share(order).total)}</b>${late}</div>`
    }

    const settleRow = (order) => {
      const mark = g().paid[order.bin]
      const diff = share(order).total - realShare(order)
      const owed = mark === 'covered' ? 'covered · nothing to settle' : mark === 'keep' ? `collect ${money(realShare(order))} · vouched, not paid yet` : diff >= 0 ? `hand back ${money(diff)}` : `collect ${money(-diff)}`
      const done = g().settled.includes(order.bin)
      return `<div class="led"><button class="box" aria-pressed="${done}" aria-label="Mark bin ${order.bin} settled" data-act="gsettle:${order.bin}">${gi('check', 15)}</button>
        ${bin(order.bin)}<span class="who">${order.name}<small>${done ? 'settled · ticked by Rosa' : owed}</small></span><b>${money(realShare(order))}</b></div>`
    }

    const shopRow = (row) => {
      const item = ITEMS[row.key]
      const where = swappedLine(row.key) ? 'swap for chipotles in adobo · every bin said swaps are fine' : `bins ${[...new Set(row.parts.map((part) => part.bin))].join(', ')}`
      return `<button class="shop-row" aria-pressed="${g().bought.includes(row.key)}" data-act="gbuy:${row.key}"><span class="box">${gi('check', 15)}</span>
        <span>${itemName(row.key)}${item.cold ? ' <em class="cold">chilled</em>' : ''}<small>${where}</small></span>
        <span class="amt"><b>${amount(row.qty, unitOf(row.key))}</b><small>up to ${money(Math.round(row.qty * item.cents * CEILING))}</small></span></button>`
    }
    const shopSection = (sec, rows) => {
      const inSec = rows.filter((row) => ITEMS[row.key].sec === sec)
      const cantFind = sec === 'Cans and dry' && !g().swapped && !g().receipt && inSec.some((row) => row.key === 'chipotle')
      return inSec.length ? `<div class="shelf"><span class="kick">${sec}</span><div class="list">${inSec.map(shopRow).join('')}</div>${cantFind ? '<button class="p-link" data-act="gswap">Can’t find the chipotles?</button>' : ''}</div>` : ''
    }
    const sortRow = (row) => `<div class="sort-row"><div class="row"><b>${itemName(row.key)}</b><span>${amount(row.qty, unitOf(row.key))}</span></div><div class="chips">${row.parts.map((part) => `<span class="chip">${bin(part.bin)}${amount(part.qty, unitOf(row.key))}</span>`).join('')}</div></div>`

    const pickRow = (line) => `<button class="ck" aria-pressed="${g().picked.includes(line.key)}" data-act="gpick:${line.key}"><span class="box">${gi('check', 15)}</span><span>${itemName(line.key)} · ${amount(line.qty, unitOf(line.key))}${swappedLine(line.key) ? '<small>Swapped for chipotles in adobo. You said swaps are fine.</small>' : ''}</span></button>`

    /* ---------- screens ---------- */
    const views = {
      gather: () => shell(`
        <div class="ticket-wrap" ${MAKE_LOOK}><article class="ticket">
          <header class="tk-head"><span class="row"><span class="lab">Gathering · food prep · beta</span>${gi('chef', 22)}</span><h2>Sunday batch cook</h2></header>
          <dl class="tk-facts"><div><dt>${gi('clock', 13)}When</dt><dd>Sun Sep 27, 2 to 5 pm</dd></div><div><dt>${gi('pin', 13)}Where</dt><dd>Eastside partner kitchen</dd></div>
            <div><dt>${gi('lock', 13)}Orders lock</dt><dd>Fri Sep 25, 2 pm</dd></div><div><dt>${gi('users', 13)}Spots</dt><dd>7 of 12 taken</dd></div></dl>
          <footer class="tk-stub"><div><span class="lab">Covered spots</span><b>2 open</b></div><div style="text-align:right"><span class="lab">Host</span><b>Rosa</b></div></footer>
        </article></div>
        <p class="lockline">${gi('lock', 16)}<span>The street address goes to confirmed people on Saturday evening.</span></p>
        <div class="shelf"><span class="kick"><span>On the menu</span><span>pick any, in batches</span></span><div class="list">${KITS.map((kit) => `<div class="item"><span class="dot">${gi('chef', 17)}</span><span>${kit.name}<small>one batch serves ${kit.serves} · about ${kit.mins} min</small></span></div>`).join('')}</div></div>
        <div class="shelf"><span class="kick"><span>Roles still open</span><span>anyone coming can claim</span></span><div class="list">${ROLES.map(([id, title, when, seeds, glyph]) => `<button class="item ${g().roles.includes(id) ? 'claimed' : ''}" data-act="grole:${id}"><span class="dot">${gi(g().roles.includes(id) ? 'check' : glyph, 17)}</span><span>${title}<small>${g().roles.includes(id) ? 'Yours. Tap to give it back.' : when}</small></span>${seedsTag(seeds)}</button>`).join('')}</div></div>
        <p class="sub">Seeds land only if you joined THE MISSION. Coming to cook never enrolls you.</p>`,
        `<button class="p-btn" data-act="gjoin">${g().rsvp ? 'Back to my order' : 'I’m in. Build my order'} ${gi('arrow')}</button>`),

      order: () => {
        const me = mine(); const lines = linesFor(me); const s = share(me); const due = g().cover ? 0 : s.total
        const mark = g().paid[ME]
        const potRow = g().cover ? [['Covered by the pot', `−${money(s.total)}`]] : []
        if (g().locked) return shell(`
          <div class="cele">${patch('Order in', 'bin at cutoff', 'chef', '#f5c451', 132, 'stamped')}<h2>Order in</h2>
            <p class="sub">You can change it until Friday 2 pm. Then it locks and you get a bin number.</p></div>
          ${slip([[`${buying(me).length} lines to buy, pantry, buffer`, money(s.total)], ...potRow], ['Your share', money(due)])}
          <div class="quiet-note"><b>${mark === 'paid' ? 'Marked paid by Rosa.' : mark === 'covered' || g().cover ? 'Covered. Nothing to pay.' : 'Not marked yet.'}</b> ${g().cover ? 'Only Rosa sees that you asked.' : 'Pay Rosa however you two agree: cash, Venmo, Cash App, Zelle. yuhm moves no money. She ticks you off by hand.'}</div>`,
          `<button class="p-btn" data-go="paid">See Rosa’s checklist ${gi('arrow')}</button><button class="p-link" data-act="gunlock">Change my order</button>`)
        const list = lines.length ? `
          <div class="shelf"><span class="kick"><span>Your list</span><span>a source for every line</span></span><div class="lines">${lines.map(lineRow).join('')}
            <div class="line"><div class="line-top"><b>Pantry: cumin, oil, salt</b><span>bought once</span><i>${money(s.pantry)}</i></div><small>Split evenly across everyone cooking. It stays at the kitchen.</small></div></div></div>
          <div class="shelf"><span class="kick">If something is out</span>${segs('gsubs', g().subs, [['ok', 'Swap it'], ['ask', 'Ask me'], ['skip', 'Skip it']])}</div>
          ${slip([[`Groceries to buy · ${buying(me).length} lines`, money(s.sub)], ['Pantry split', money(s.pantry)], ['Buffer, comes back at settle', money(s.total - s.sub - s.pantry)], ...potRow], ['Your share', money(due)])}
          <div class="group"><div class="switch-row"><span>Cover me this time<small>Only Rosa sees this. 2 covered spots open.</small></span><button class="switch" role="switch" aria-checked="${g().cover}" aria-label="Cover me this time" data-act="gcover"></button></div></div>`
          : '<div class="quiet-note"><b>Pick at least one dish.</b> Your itemized list builds itself from the recipe.</div>'
        return shell(`
          <span class="kick">Sunday batch cook · your order</span>
          <h2>What will you make?</h2>
          <div class="list">${KITS.map(dishRow).join('')}</div>
          ${list}`,
          `<button class="p-btn" data-act="glock" ${lines.length ? '' : 'disabled'}>Lock in my order</button>`)
      },

      paid: () => {
        const list = orders(); const marks = g().paid
        const inHand = list.filter((order) => marks[order.bin] === 'paid').reduce((sum, order) => sum + share(order).total, 0)
        const due = list.filter((order) => !['covered', 'drop'].includes(marks[order.bin])).reduce((sum, order) => sum + share(order).total, 0)
        const before = `
          ${tally([`${onList().length} of ${list.length}`, 'on the shop list'], [money(inHand), `in hand of ${money(due)}`])}
          <div class="list">${list.map(paidRow).join('')}</div>
          <p class="sub">${g().payBy ? 'Pay-by has passed. For anyone unticked, vouch for them or let the order drop. A shopper never fronts money for a stranger.' : 'Tap a box when someone pays you. Every tick is stamped with who and when, and can be undone.'}</p>`
        const after = g().receipt ? `
          ${tally([money(receiptTotal()), 'receipt total'], [`${g().settled.length} of ${onList().length}`, 'settled'])}
          <div class="list">${onList().map(settleRow).join('')}</div>
          <p class="sub">Real prices replaced the estimates. The shares add up to the receipt to the cent. Settle in person and tick the box.</p>`
          : '<div class="quiet-note"><b>Nothing to settle yet.</b> Balances show here once a shopper sends the receipt.</div>'
        const foot = g().paidTab === 'before'
          ? `<button class="p-btn" data-go="shop">Release the shop list · ${onList().length} orders</button><button class="p-link" data-act="gpayby">${g().payBy ? 'Back to before pay-by' : 'Skip ahead to pay-by (demo)'}</button>`
          : `<button class="p-btn quiet" data-go="pick">See it from bin ${ME} ${gi('arrow')}</button>`
        return shell(`
          ${persona('Viewing as <b>Rosa</b>, the money holder')}
          <h2>Who has paid</h2>
          ${segs('gpaidtab', g().paidTab, [['before', 'Before the shop'], ['after', 'After: settle']])}
          ${g().paidTab === 'before' ? before : after}`, foot)
      },

      shop: () => {
        ensureOnList()
        const rows = shopRows(); const allIn = rows.every((row) => g().bought.includes(row.key))
        const chilled = rows.filter((row) => ITEMS[row.key].cold).length
        const listTab = `
          ${chilled ? `<div class="banner">${gi('bag', 16)}<span><b>${chilled} chilled line${chilled > 1 ? 's' : ''}.</b> Bring the cooler bag. The shop window ends 12:30 pm so nothing sits warm.</span></div>` : ''}
          ${SECTIONS.map((sec) => shopSection(sec, rows)).join('')}
          <div class="quiet-note"><b>Pantry, bought once:</b> cumin, oil, salt. Split evenly, stays at the kitchen.</div>
          ${g().receipt ? `${slip([['Lines bought', String(rows.length)], ['Swaps', g().swapped ? '1' : '0']], ['Receipt', money(receiptTotal())])}<p class="sub">Receipt in. Shares are recalculated and Rosa has the balances. Attendees see totals, never the photo.</p>` : ''}`
        const sortTab = `<div class="list">${rows.map(sortRow).join('')}</div><p class="sub">Read it item by item at the sorting table. Numbers on the bins, no names.</p>`
        const foot = g().receipt ? `<button class="p-btn" data-go="pick">On to the kitchen ${gi('arrow')}</button>`
          : `<button class="p-btn" data-act="greceipt" ${allIn ? '' : 'disabled'}>${gi('receipt')}Send receipt photo and total</button><button class="p-link" data-act="gbuyall">Tick everything (demo shortcut)</button>`
        return shell(`
          ${persona('Viewing as <b>a shopper</b>. Bins only, never names')}
          <h2>Shop run · the grocery</h2>
          ${segs('gshoptab', g().shopTab, [['list', 'Shop list'], ['sort', 'Sort sheet']])}
          ${g().shopTab === 'sort' ? sortTab : listTab}`, foot)
      },

      pick: () => {
        ensureShopped()
        const me = mine(); const lines = linesFor(me); const s = share(me); const real = realShare(me)
        const covered = g().paid[ME] === 'covered'; const diff = s.total - real
        const by = (source) => lines.filter((line) => line.source === source)
        const checked = by('buy').filter((line) => g().picked.includes(line.key)).length
        const balance = covered ? slip([['Real cost of your lines', money(real)], ['Covered by the pot', `−${money(real)}`]], ['Your balance', money(0)])
          : slip([['You paid Rosa', money(s.total)], ['Real cost of your lines', money(real)]], [diff >= 0 ? 'Coming back to you' : 'Still owed', money(Math.abs(diff))])
        return shell(`
          <div class="bin-tag"><b>${ME}</b><span class="lab">Your bin</span><small>Sunday batch cook · the table by the door</small></div>
          ${by('buy').length ? `<div class="shelf"><span class="kick"><span>In your bin</span><span>${checked} of ${by('buy').length} checked</span></span><div class="cks">${by('buy').map(pickRow).join('')}</div></div>` : ''}
          ${by('network').length ? `<div class="shelf"><span class="kick">From the network</span>${plainList(by('network'), 'sprout', 'Saturday pool table, brought by a runner')}</div>` : ''}
          ${by('bring').length ? `<div class="shelf"><span class="kick">You are bringing</span>${plainList(by('bring'), 'bag', 'from your own kitchen')}</div>` : ''}
          ${balance}
          <p class="sub">${g().settled.includes(ME) ? 'Settled. Ticked by Rosa.' : covered ? 'Nothing to settle.' : 'Rosa settles in person and ticks it by hand.'}</p>
          <div class="loop">${patch('Full circle', 'nothing wasted', 'sprout', '#b9d99b', 58)}<div><h3>After the cook</h3><p>Extra portions go to the Chestnut fridge. Scraps go to compost.</p></div></div>`,
          `<button class="p-btn quiet" data-act="gsettleview">See the settle checklist</button>`)
      },
    }

    const notes = {
      gather: ['The gathering: a page, a menu, open roles', 'A food prep gathering is a plain page anyone can read. It shows when, the neighborhood, when orders lock, the menu of recipe kits, and the roles that still need someone. Classes and potlucks use the same page with a different kind.', ['Reuses', 'Migration 033 already has the spine: <code>food_events</code>, <code>food_venues</code>, <code>food_event_rsvps</code> with a waitlist, <code>food_event_assignments</code>. This adds a <code>kind</code>, the cutoff times, and a money holder.'], ['koord', 'RSVP rules, the share link, and the pick-a-date poll come from koord’s plan and poll modules, running as a library inside yuhm.'], ['Guardrail', 'Coming to cook never enrolls anyone in THE MISSION. Every attendee can claim a role; seeds land only for people who opted in. The street address waits for <code>address_release_at</code>.']],
      order: ['Build my order: dishes in, an itemized list out', 'Pick dishes in batches. Each recipe kit scales into lines, the same item from two dishes merges into one line, and every line gets its own source: bring it, take it from the network, or buy it through the shared grocery run. Most people will mix all three.', ['Writes', '<code>food_prep_orders</code>, <code>food_prep_order_dishes</code>, and <code>food_prep_order_lines</code> with a <code>source</code> per line. Kits point at <code>food_catalog_items</code>, which is what lets twelve lists add up into one.'], ['Money', 'Your share is the buy lines, plus an even pantry split, plus a 15 percent buffer rounded up to the dollar. The buffer comes back at settle.'], ['Guardrail', 'Network is greyed out unless something real is listed nearby this week. “Cover me this time” is visible to the organizer and the money holder only.'], ['Demo note', 'The build keeps a swap choice on every line. Here it is one control.']],
      paid: ['The paid checklist: ticked by hand', 'koH’s call on 20 Sep: money moves outside the app, and the money holder ticks who has paid. No payment handles are stored, nothing is processed, yuhm holds no money. A second tab holds the same kind of tick for settling up after the receipt.', ['Writes', '<code>food_prep_order_private.paid_state</code> and <code>settled</code>, each with who ticked and when, plus an append-only audit row per change. <code>mark_food_prep_paid()</code> and <code>mark_food_prep_settled()</code> answer only to the organizer and the money holder.'], ['Notifies', 'The attendee sees “marked paid” or “not marked yet” on their own order, so a missed tick gets caught before the shop run, not at the door.'], ['Guardrail', 'Only ticked, covered, and vouched orders reach the shop list, so a shopper never fronts money for a stranger. A cover request shows here and nowhere else.']],
      shop: ['The shop run: one list, bins instead of names', 'Everyone’s buy lines merge into one list in store order, with a ceiling on each line. One shopper or several can split it by store. The sort sheet is the same data turned around: item by item, which bins, how much each.', ['Writes', '<code>food_shop_runs</code>; line states and real prices through <code>record_food_shop_line()</code>; the receipt through <code>attach_food_shop_receipt()</code> into a private bucket.'], ['Mission', 'A shop run is a mission: <code>source_type = shop_run</code>, template <code>gathering-shop</code>. Anyone attending can claim it, and enrolled movers also see it on their board.'], ['Guardrail', 'The shopper sees bin numbers, never names, and never who paid. Chilled lines add the cooler step and shorten the window. Pantry items are bought once and split.']],
      pick: ['Pick up my bin: your items, then your balance', 'On arrival the screen says which bin is yours and lists what is in it to check off. A missing or swapped line says why. Lines from the network and lines you are bringing sit in their own groups. Below that, the real cost against what you paid.', ['Writes', '<code>record_food_pick()</code> per line. <code>settle_food_gathering()</code> replaces estimates with real prices and asserts that the shares equal the receipt to the cent.'], ['Notifies', '“Shopping done: bin 4, one change” when the run is delivered, then “your balance” at settle. Both pass through koord’s delivery policy, so quiet hours, caps, and consent hold.'], ['After', 'Extra portions go to a fridge or an inventory lot, scraps to compost. Real prices update the catalog, so the next estimate is closer.']],
    }

    const actions = {
      gjoin: () => { set({ rsvp: true }); state.screen = 'order' },
      grole: (id) => set({ roles: toggled(g().roles, id) }),
      gdish: (arg) => { const [id, by] = arg.split('|'); set({ dishes: { ...g().dishes, [id]: Math.max(0, Math.min(MAX_BATCHES, (g().dishes[id] ?? 0) + Number(by))) } }) },
      gsrc: (arg) => { const [key, source] = arg.split('|'); set({ src: { ...g().src, [key]: source } }) },
      gsubs: (choice) => set({ subs: choice }),
      gcover: () => set({ cover: !g().cover }),
      glock: () => set({ locked: true, rsvp: true }),
      gunlock: () => set({ locked: false }),
      gpaid: (arg) => { const n = Number(arg); const on = ['paid', 'covered'].includes(g().paid[n]); set({ paid: { ...g().paid, [n]: on ? null : n === ME && g().cover ? 'covered' : 'paid' } }) },
      gkeep: (arg) => set({ paid: { ...g().paid, [Number(arg)]: 'keep' } }),
      gdrop: (arg) => set({ paid: { ...g().paid, [Number(arg)]: 'drop' } }),
      gpayby: () => set({ payBy: !g().payBy }),
      gpaidtab: (tab) => set({ paidTab: tab }),
      gshoptab: (tab) => set({ shopTab: tab }),
      gbuy: (key) => { if (!g().receipt) set({ bought: toggled(g().bought, key) }) },
      gbuyall: () => set({ bought: shopRows().map((row) => row.key) }),
      gswap: () => set({ swapped: true, bought: g().bought.includes('chipotle') ? g().bought : [...g().bought, 'chipotle'] }),
      greceipt: () => set({ receipt: true }),
      gpick: (key) => set({ picked: toggled(g().picked, key) }),
      gsettle: (arg) => set({ settled: toggled(g().settled, Number(arg)) }),
      gsettleview: () => { set({ paidTab: 'after' }); state.screen = 'paid' },
    }

    return {
      group: 'Gatherings beta',
      screens: [['gather', 'The gathering'], ['order', 'Build my order'], ['paid', 'Paid checklist'], ['shop', 'Shop run'], ['pick', 'Pick up my bin']],
      views, notes, actions,
      state: { g: { rsvp: false, roles: [], dishes: { tinga: 1, rice: 1 }, src: { cilantro: 'network', rice: 'bring' }, subs: 'ok', cover: false, locked: false, paid: { 1: 'paid', 2: 'paid', 3: 'covered', 5: 'paid' }, payBy: false, paidTab: 'before', shopTab: 'list', bought: [], swapped: false, receipt: false, picked: [], settled: [] } },
    }
  }]
})()
