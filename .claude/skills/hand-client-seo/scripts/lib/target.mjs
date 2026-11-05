// Turns what the operator typed (a client slug, a URL, or a folder) into an
// audit target: the public URL to audit, and for a folder a local server
// plus the rewrite that maps the public URL onto it.
import { existsSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { serveDir } from './serve.mjs';
import { REPO, clientDirs, hostOf, isHttpUrl, loadClientConfig, normalizeUrl, publishDir, sameSite } from './util.mjs';

const PUBLIC_SITE = 'https://handprotocol.org';

async function clientInfo(entry) {
  let config = null;
  if (entry.onTemplate) {
    try {
      config = await loadClientConfig(entry.dir);
    } catch {
      config = null; // engine not synced yet; fall back to the raw folder
    }
  }
  return { slug: entry.slug, clientDir: entry.dir, config, productionUrl: config ? normalizeUrl(config.productionUrl) : null };
}

// → { kind: 'client'|'url'|'folder', slug?, clientDir?, config?, url, host, serve?: { dir, mount } }
export async function resolveTarget(input, { local = false } = {}) {
  if (!input) throw new Error('name a client slug, a URL, or a folder');
  const clients = clientDirs();

  if (isHttpUrl(input)) {
    const url = normalizeUrl(input);
    for (const entry of clients) {
      const info = await clientInfo(entry);
      if (info.productionUrl && sameSite(info.productionUrl, url)) return { kind: 'client', ...info, url, host: hostOf(url) };
    }
    return { kind: 'url', url, host: hostOf(url) };
  }

  const bySlug = clients.find((c) => c.slug === input);
  if (bySlug) {
    const info = await clientInfo(bySlug);
    if (!info.productionUrl) throw new Error(`${input} has no productionUrl in site.config.mjs; pass the URL instead`);
    const t = { kind: 'client', ...info, url: info.productionUrl, host: hostOf(info.productionUrl) };
    if (local) {
      const dir = join(bySlug.dir, 'dist-preview');
      if (!existsSync(dir)) throw new Error(`no local build at ${dir}: run "npm run preview" in ${bySlug.dir} first`);
      t.serve = { dir, mount: '/' };
    }
    return t;
  }

  const dir = resolve(input);
  if (existsSync(dir) && statSync(dir).isDirectory()) {
    const rel = relative(REPO, dir);
    // web/<folder> is published at handprotocol.org/<folder>/.
    if (rel.startsWith('web/')) {
      const mount = `/${rel.slice(4)}`.replace(/\/$/, '');
      const url = `${PUBLIC_SITE}${mount}/`;
      return { kind: 'folder', url, host: hostOf(url), serve: { dir, mount }, label: rel };
    }
    const owner = clients.find((c) => dir === c.dir || dir.startsWith(`${c.dir}/`));
    if (owner) {
      const info = await clientInfo(owner);
      const build = dir === owner.dir ? join(owner.dir, existsSync(join(owner.dir, 'dist-preview')) ? 'dist-preview' : publishDir(owner.dir)) : dir;
      const url = info.productionUrl || `https://${owner.slug}.netlify.app/`;
      return { kind: 'client', ...info, url, host: hostOf(url), serve: { dir: build, mount: '/' } };
    }
    const url = `https://${basename(dir)}.local/`;
    return { kind: 'folder', url, host: hostOf(url), serve: { dir, mount: '/' }, label: rel || dir };
  }
  throw new Error(`"${input}" is not a client slug, a URL, or a folder`);
}

// Starts the local server when the target needs one. → { audit target, stop() }
export async function openTarget(t, { otherUrls = [] } = {}) {
  const base = { url: t.url, label: t.label || t.slug || t.host, otherUrls };
  if (!t.serve) return { auditTarget: base, stop: async () => {} };
  const server = await serveDir(t.serve.dir, { mount: t.serve.mount });
  const from = new URL(t.url).origin;
  return { auditTarget: { ...base, otherUrls: [], rewrite: { from, to: server.origin } }, stop: server.close };
}
