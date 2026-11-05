#!/usr/bin/env node
// Mechanical checks on the docs this program writes. A wrong closed doc is worse than none.
//
//   node docs/tools/check.mjs            check docs/closed, docs/certified, web/faq, web/start
//   node docs/tools/check.mjs --paths    also list every quoted repo path that does not exist
//
// Checks: brand punctuation (no em dash, no double hyphen as punctuation), secret patterns,
// known gate values (read from their source lines at run time and never printed), personal
// email addresses and phone numbers, dossiers that stop before their last section, and quoted
// repo paths that exist neither in the working tree nor on origin/main.
// Exit code 1 when anything is found that must not be in a doc.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SHOW_PATHS = process.argv.includes('--paths')
const MIN_SECRET_LENGTH = 6

const TARGETS = [
  { dir: 'docs/closed', ext: ['.md'], skip: ['site', '_workflow', 'wireframes/layout', 'wireframes/svg', 'wireframes/shots'] },
  { dir: 'docs/certified', ext: ['.md'] },
  { dir: 'web/faq', ext: ['.html', '.css', '.js'] },
  { dir: 'web/start', ext: ['.html', '.css', '.js'] },
]

const SECRET_PATTERNS = [
  ['Resend key', /\bre_[A-Za-z0-9_]{16,}/],
  ['Anthropic key', /sk-ant-[A-Za-z0-9_-]{8,}/],
  ['Stripe key', /\b(sk|rk)_(live|test)_[A-Za-z0-9]{8,}/],
  ['Webhook secret', /\bwhsec_[A-Za-z0-9]{8,}/],
  ['GitHub token', /\b(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['AWS key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}/],
  ['JWT', /\beyJhbGciOi[A-Za-z0-9_-]{10,}/],
  ['Telegram bot token', /\b[0-9]{8,10}:[A-Za-z0-9_-]{35}\b/],
  ['Private key block', /BEGIN [A-Z ]*PRIVATE KEY/],
]

// Where gate values are written down (the audits list these). The values are read here so a doc
// that repeats one can be caught. They are compared, never printed.
const KNOWN_VALUE_SOURCES = [
  ['netlify/edge-functions/demos-pitch-auth.js', [10]],
  ['netlify/edge-functions/demos-portfolio-auth.js', [9]],
  ['netlify/edge-functions/mystichearts-demo-auth.js', [2, 8]],
  ['netlify/edge-functions/airstreamstudio-auth.js', [4]],
  ['netlify/edge-functions/mystichearts-brief-auth.js', [4, 5]],
]

const ALLOWED_EMAIL = /@(handprotocol\.org|example\.(com|org)|users\.noreply\.github\.com|anthropic\.com)$/i
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE = /(?<![\d.])(\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?!\d)/g
const LAST_SECTION = [[/^\d\d-audit-/, '## Not checked'], [/^(0[1-9]|1\d|20)-/, '## Sources']]

function walkFiles(dir, exts, skip = []) {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return []
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name)
    if (skip.some((s) => rel === path.join(dir.split('/').slice(0, 2).join('/'), s) || rel.endsWith(`/${s}`))) return []
    if (entry.isDirectory()) return walkFiles(rel, exts, skip)
    return exts.includes(path.extname(entry.name)) ? [rel] : []
  })
}

function knownValues() {
  const words = new Set()
  for (const [file, lines] of KNOWN_VALUE_SOURCES) {
    const abs = path.join(ROOT, file)
    if (!fs.existsSync(abs)) continue
    const all = fs.readFileSync(abs, 'utf8').split('\n')
    for (const n of lines) {
      const line = all[n - 1] || ''
      for (const m of line.matchAll(/["'`]([^"'`\s]{6,})["'`]/g)) words.add(m[1])
      for (const m of line.matchAll(/(?:=|:|\bto\b|\bis\b)\s*["'`]?([A-Za-z0-9!@#$%^&*_+-]{6,})["'`]?\s*(?:[;,.)]|$)/g)) words.add(m[1])
    }
  }
  // Ordinary identifiers on those lines are not secrets, and neither is any word that the public
  // routing config already uses (route names such as a gated folder's own name).
  const routing = fs.existsSync(path.join(ROOT, 'netlify.toml')) ? fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8') : ''
  return [...words].filter((w) => w.length >= MIN_SECRET_LENGTH && !routing.includes(w) && !/^(const|return|process|Netlify|password|PASSWORD|function|export|default|string|import)$/.test(w) && !/^[A-Z_]+$/.test(w))
}

let topLevel = null
let mainTree = null
function pathExists(candidate) {
  if (!topLevel) topLevel = new Set(fs.readdirSync(ROOT))
  if (!topLevel.has(candidate.split('/')[0])) return null // not a repo path
  if (fs.existsSync(path.join(ROOT, candidate))) return true
  if (!mainTree) {
    try { mainTree = new Set(execFileSync('git', ['--no-optional-locks', 'ls-tree', '-r', '--name-only', 'origin/main'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString().split('\n')) } catch (error) { mainTree = new Set() }
  }
  const clean = candidate.replace(/\/$/, '')
  return mainTree.has(clean) || [...mainTree].some((f) => f.startsWith(`${clean}/`))
}

function checkFile(rel, known) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  const lines = text.split('\n')
  const blocking = []
  const warnings = []
  const isDoc = rel.endsWith('.md')

  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`
    if (line.includes('—')) blocking.push(`${at} em dash`)
    if (/\s–\s/.test(line)) blocking.push(`${at} en dash used as punctuation`)
    if (isDoc && /[A-Za-z0-9] -- [A-Za-z0-9]/.test(line) && !line.includes('`')) blocking.push(`${at} double hyphen used as punctuation`)
    for (const [name, pattern] of SECRET_PATTERNS) if (pattern.test(line)) blocking.push(`${at} looks like a secret (${name})`)
    for (const value of known) if (line.includes(value)) blocking.push(`${at} repeats a gate value that is written in source (value not shown)`)
    for (const email of line.match(EMAIL) || []) if (!ALLOWED_EMAIL.test(email)) blocking.push(`${at} personal or third-party email address`)
    if (isDoc && PHONE.test(line)) blocking.push(`${at} phone number`)
    PHONE.lastIndex = 0
  })

  const base = path.basename(rel)
  for (const [test, heading] of LAST_SECTION) if (isDoc && test.test(base) && !text.includes(`\n${heading}`)) blocking.push(`${rel} stops before "${heading}"`)

  if (isDoc) {
    const seen = new Set()
    for (const m of text.matchAll(/`([A-Za-z0-9_.-]+\/[^`\s*{}<>$]*)`/g)) {
      const candidate = m[1].replace(/[),.;:]+$/, '').replace(/:\d+(-\d+)?$/, '')
      if (seen.has(candidate) || /^(https?:|docs\/closed\/site)/.test(candidate)) continue
      seen.add(candidate)
      if (pathExists(candidate) === false) warnings.push(`${rel} quotes a path that does not exist: ${candidate}`)
    }
  }
  return { blocking, warnings }
}

const known = knownValues()
const files = TARGETS.flatMap((t) => walkFiles(t.dir, t.ext, t.skip))
const results = files.map((f) => checkFile(f, known))
const blocking = results.flatMap((r) => r.blocking)
const warnings = results.flatMap((r) => r.warnings)

console.log(`Checked ${files.length} files (${known.length} known gate values compared, none printed).`)
if (blocking.length) console.log(`\nMUST FIX (${blocking.length}):\n${blocking.map((b) => `  ${b}`).join('\n')}`)
console.log(`\nQuoted paths that do not exist: ${warnings.length}${SHOW_PATHS || !warnings.length ? '' : ' (run with --paths to list them)'}`)
if (SHOW_PATHS) console.log(warnings.map((w) => `  ${w}`).join('\n'))
if (!blocking.length) console.log('\nNo blocking problems.')
process.exit(blocking.length ? 1 : 0)
