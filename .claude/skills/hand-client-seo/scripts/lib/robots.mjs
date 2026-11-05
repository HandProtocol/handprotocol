// robots.txt the way Google reads it (RFC 9309): groups by user-agent, the
// most specific group wins, the longest matching rule wins, Allow beats
// Disallow on a tie, `*` and `$` are the only wildcards. No dependencies.

// → { groups: [{ agents, rules: [{ allow, pattern, line }] }], sitemaps, problems: [{ line, message }] }
export function parseRobots(text) {
  const out = { groups: [], sitemaps: [], problems: [], hasContent: false };
  let group = null;
  let lastWasAgent = false;
  const lines = String(text ?? '').replace(/^﻿/, '').split(/\r\n|\r|\n/);
  lines.forEach((rawLine, index) => {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) return;
    const colon = line.indexOf(':');
    if (colon === -1) {
      out.problems.push({ line: index + 1, message: `not a "field: value" line: ${rawLine.trim().slice(0, 60)}` });
      return;
    }
    out.hasContent = true;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === 'user-agent') {
      if (!lastWasAgent) {
        group = { agents: [], rules: [] };
        out.groups.push(group);
      }
      group.agents.push(value.toLowerCase());
      lastWasAgent = true;
      return;
    }
    lastWasAgent = false;
    if (field === 'sitemap') {
      out.sitemaps.push(value);
      return;
    }
    if (field === 'allow' || field === 'disallow') {
      if (!group) {
        out.problems.push({ line: index + 1, message: `"${field}" before any User-agent line is ignored` });
        return;
      }
      // "Disallow:" with no value allows everything; it is not a rule.
      if (value) group.rules.push({ allow: field === 'allow', pattern: value, line: index + 1 });
      return;
    }
    if (!['crawl-delay', 'host', 'clean-param', 'request-rate', 'visit-time', 'noindex'].includes(field)) {
      out.problems.push({ line: index + 1, message: `unknown field "${field}"` });
    } else if (field === 'noindex') {
      out.problems.push({ line: index + 1, message: 'Google does not support "noindex" in robots.txt (use a robots meta tag or X-Robots-Tag)' });
    }
  });
  return out;
}

function patternToRegExp(pattern) {
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

// The crawler's product token, lowercased: "googlebot", "gptbot", "bingbot".
function rulesFor(robots, token) {
  const t = String(token || '').toLowerCase();
  let best = -1;
  let rules = [];
  let star = [];
  for (const g of robots.groups) {
    for (const agent of g.agents) {
      if (agent === '*') star = star.concat(g.rules);
      // "googlebot" also covers "googlebot-image"; "google" does not cover "googlebot".
      else if (t === agent || t.startsWith(`${agent}-`)) {
        if (agent.length > best) {
          best = agent.length;
          rules = [...g.rules];
        } else if (agent.length === best) rules = rules.concat(g.rules);
      }
    }
  }
  return best >= 0 ? { rules, matched: true } : { rules: star, matched: false };
}

// → { allowed, rule } where rule is the line that decided it (null = no rule).
export function isAllowed(robots, token, pathAndQuery) {
  const path = pathAndQuery && pathAndQuery[0] === '/' ? pathAndQuery : `/${pathAndQuery || ''}`;
  const { rules } = rulesFor(robots, token);
  let winner = null;
  for (const rule of rules) {
    if (!patternToRegExp(rule.pattern).test(path)) continue;
    if (!winner || rule.pattern.length > winner.pattern.length || (rule.pattern.length === winner.pattern.length && rule.allow && !winner.allow)) {
      winner = rule;
    }
  }
  return { allowed: winner ? winner.allow : true, rule: winner };
}

// True when the crawler has its own group (rather than falling back to *).
export function hasGroupFor(robots, token) {
  return rulesFor(robots, token).matched;
}

// Crawlers whose access matters to a small business, by what they feed.
export const CRAWLERS = [
  { token: 'googlebot', label: 'Google Search', kind: 'search' },
  { token: 'bingbot', label: 'Bing (and what it feeds: DuckDuckGo, Yahoo, Copilot)', kind: 'search' },
  { token: 'applebot', label: 'Apple (Siri, Spotlight)', kind: 'search' },
  { token: 'oai-searchbot', label: 'ChatGPT search', kind: 'ai-search' },
  { token: 'claude-searchbot', label: 'Claude search', kind: 'ai-search' },
  { token: 'perplexitybot', label: 'Perplexity', kind: 'ai-search' },
  { token: 'gptbot', label: 'OpenAI training', kind: 'ai-training' },
  { token: 'claudebot', label: 'Anthropic training', kind: 'ai-training' },
  { token: 'google-extended', label: 'Gemini training/grounding', kind: 'ai-training' },
  { token: 'ccbot', label: 'Common Crawl', kind: 'ai-training' },
];
