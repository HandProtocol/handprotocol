/* Try the star guestbook locally, no database or mail needed.

     cd kc-collective/stars && npm run dev        → http://localhost:8787/kc-collective/styles/nightbloom/

   Serves web/ as static files and runs the real handlers on /api/stars and
   /stars/act with a memory store (lost on restart). Emails are printed here
   instead of sent, one-tap links included. With ANTHROPIC_API_KEY set, opted-in
   stars are designed by Claude for real; without it, by a stand-in so the page
   can be walked end to end. */

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { claudeClient } from '../lib/claude-client.mjs';
import { handleStarAction, handleStars } from '../lib/star-handler.mjs';
import { memoryStore } from '../lib/star-store.mjs';

const PORT = Number(process.env.PORT || 8787);
const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../web');
const ORIGIN = `http://localhost:${PORT}`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

// Stand-in for Claude when there is no key: same reply shape, picked from the words.
const standIn = {
  beta: {
    messages: {
      async create(params) {
        const note = params.messages[0].content.toLowerCase();
        const near = /thank|grateful/.test(note) ? 'Light' : /scared|alone|hard/.test(note) ? 'Courage' : /fun|laugh|dance/.test(note) ? 'Joy' : 'Home';
        const reply = { name: 'The Stand-in Star', line: 'A placeholder line until a real key is set.', near, color: 'lavender', points: 6, brightness: 2, flag: /buy now|crypto/.test(note) ? 'spam' : 'none', flag_note: '' };
        return { model: 'stand-in', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(reply) }] };
      },
    },
  },
};

const deps = {
  store: memoryStore(),
  claude: process.env.ANTHROPIC_API_KEY ? claudeClient({ apiKey: process.env.ANTHROPIC_API_KEY }) : standIn,
  secret: 'dev-secret-dev-secret-dev-secret-0000',
  siteUrl: ORIGIN,
  skyPath: '/kc-collective/styles/nightbloom/#sky',
  mail: { apiKey: 'dev', from: 'KC Collective <stars@dev.local>', admin: ['admin@dev.local'] },
  send: async (m) => {
    const links = [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1].replace(/&amp;/g, '&')).filter((h) => h.includes('/stars/act'));
    console.log(`\n✉  to ${m.to}: ${m.subject}\n${links.map((l) => `   ${l}`).join('\n')}`);
    return { ok: true, id: 'dev' };
  },
};

async function toRequest(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(`${ORIGIN}${req.url}`, { method: req.method, headers: { ...req.headers, 'x-nf-client-connection-ip': req.socket.remoteAddress }, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
}

async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, ORIGIN);
    if (pathname === '/api/stars') return send(res, await handleStars(await toRequest(req), deps));
    if (pathname === '/stars/act') return send(res, await handleStarAction(await toRequest(req), deps));
    let file = path.join(WEB, decodeURIComponent(pathname));
    if (!file.startsWith(WEB)) { res.writeHead(403); return res.end(); }
    if (pathname.endsWith('/')) file = path.join(file, 'index.html');
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
    res.end(err.code === 'ENOENT' ? 'Not found' : String(err.message));
  }
}).listen(PORT, () => {
  console.log(`Star guestbook: ${ORIGIN}/kc-collective/styles/nightbloom/`);
  console.log(process.env.ANTHROPIC_API_KEY ? 'Claude: live (ANTHROPIC_API_KEY set)' : 'Claude: stand-in (set ANTHROPIC_API_KEY to use the real model)');
});
