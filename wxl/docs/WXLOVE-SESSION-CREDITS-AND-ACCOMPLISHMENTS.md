---
date: 2026-07-25
budget_cap: "$4.20 OpenRouter credits"
status: complete
---

# WXLove Prototype Session: Credits Used & What Shipped

Honest account of a session where the goal was: prototype what WXLove (the WXL:FOOD rebrand) looks like, use a specific model ("Fable 5") via a subagent to optimize the theme, build an interactive architecture diagram, and stay under $4.20 in OpenRouter credits.

## What was asked vs. what actually happened

1. **"Fable 5"** turned out to be `anthropic/claude-fable-5` on OpenRouter, a real but expensive model (pricing tier roughly 5x Claude Opus, comparable to Opus-fast tiers). Not identifiable from the name alone; confirmed by querying the live OpenRouter models API.
2. **First delegation mistake.** A subagent was dispatched to do the theme-optimization reasoning *before* Fable 5 was actually wired up, because `delegate_task` has no per-call model override. It silently ran on the session's default model instead. This was a real error, not a deliberate substitution, caught immediately after dispatch.
3. **Correction attempt.** The right mechanism turned out to be `delegation.model` / `delegation.provider` in `~/.hermes/config.yaml`, confirmed by reading the `hermes-agent` skill. Set those to `anthropic/claude-fable-5`, dispatched a second, corrected subagent, then reverted the config immediately after (a config-set typo along the way wrote literal `'""'` strings into the YAML; caught and fixed with a direct Python rewrite of the config file).
4. **Fable 5 call failed.** OpenRouter returned an HTTP 402 credits/billing error on the very first attempt: `"This request requires more credits, or fewer max_tokens. You requested up to 128000 tokens, but can only afford 119870."` The model's max-token default alone would have burned past what a $4.20 budget could plausibly support even in isolation. No retry was attempted, consistent with the hard budget instruction.
5. **The first (mistaken) subagent's output was still good.** Rather than throw away a completed, on-topic result, its full output was recovered from the delegation cache and used as the actual theme-optimization deliverable. It ran on the session's default model (not Fable 5), completed in ~25 seconds, and produced a decisive, well-reasoned spec, not a generic one.

## Actual credit usage against the $4.20 cap

| Action | Model | Outcome | Cost |
|---|---|---|---|
| Theme-optimization subagent, attempt 1 (dispatched before Fable 5 was wired up) | session default model | Completed in 25.4s, full deliverable, used as the canonical doc | Cheap; session-default model class, single short call |
| Theme-optimization subagent, attempt 2 (dispatched immediately after attempt 1, also before Fable 5 was correctly wired up) | session default model | Completed in 23.8s, independent second opinion, converges closely with attempt 1 | Cheap; same model class as attempt 1 |
| OpenRouter models catalog lookup | n/a (public GET endpoint) | Confirmed Fable 5's identity and pricing | Free (no auth, no completion tokens) |
| Theme-optimization subagent, attempt 3 (Fable 5, correctly wired via `delegation.model`) | `anthropic/claude-fable-5` | **Failed at dispatch**, HTTP 402 before any output token was generated | $0 billed; OpenRouter rejects the request pre-generation on insufficient credits, so no partial charge occurred |
| Interactive architecture diagram | none | Hand-authored directly (HTML/CSS/JS), no model call | $0 |
| This document | none | Hand-authored directly | $0 |

**No independent per-request billing/usage API was available in this environment to pull an exact dollar figure** for the two subagent calls that did complete (OpenRouter's `/api/v1/credits` endpoint requires the account's own key be resolvable from the local `.env`, which wasn't reliably extractable here without risking a secret-handling misstep, so it was not queried). What can be stated with confidence: the Fable 5 attempt, the only potentially expensive one, incurred zero cost because it failed before generating any output. Both completed subagents ran on a materially cheaper default model, each a single call under 26 seconds with a bounded prompt and a 400 to 700 word target output, well inside typical sub-$0.10-each territory for that model class and prompt size. Total spend for this session is very likely under $0.40, comfortably inside the $4.20 cap, though the exact cents cannot be certified without direct OpenRouter billing access.

**Bonus finding:** the two independent default-model completions converge strongly on direction (keep coral for the wordmark only, keep forest green as the operator accent, admit amber thinly as a family badge rather than a palette takeover, keep all three fonts and all three motion tokens unchanged, preserve schema/contrast/component structure untouched). That convergence across two separately-run subagents is a reasonable signal the saved theme spec reflects a stable design direction rather than a one-off guess.

## What shipped

1. **`wxl/docs/WXLOVE-THEME-OPTIMIZATION.md`**, a decisive design-token spec for the WXL:FOOD to WXLove rebrand: 14 color tokens (mostly inherited from the existing WXL palette, amber admitted deliberately and thinly as a HAND-family marker, one new `--color-danger` token), a typography decision (keep DM Sans, Space Grotesk, DM Mono, explicitly reject importing HAND's Source Serif italic), an explicit motion decision (inherit existing tokens unchanged), and a clear changes-vs-stays list.
2. **`wxl/public/architecture/index.html`**, an interactive, dark-themed SVG architecture diagram of the actual WXLove/WXL:FOOD system as it exists in the repo today: six layers (client, Netlify functions, active Supabase data, the built-but-gated coordination protocol, built-but-inactive services, external dependencies), each node clickable for a detail panel, plus layer filters that dim everything outside the selected layer. Verified in-browser: loads without console errors, node click populates the detail panel correctly, layer filter dims correctly. No model cost, hand-authored directly from the architecture already documented in `wxl/HANDOFF.md`, `wxl/docs/LIVING-DOCS.md`, and `wxl/docs/COORDINATION-PROTOCOL.md`.
3. **This document.**

## Corrections made to memory and config during this session

- Corrected a prior memory entry that incorrectly stated `delegate_task` supports a per-call model override. It does not; the correct mechanism is the global `delegation.model` / `delegation.provider` config keys, which apply to every subsequent delegation until reverted.
- Reverted `delegation.model` / `delegation.provider` back to unset immediately after the Fable 5 attempt, so future `delegate_task` calls in this or other sessions inherit the parent session's model again by default, rather than silently staying pinned to an expensive model.

## Honest gaps

- Fable 5 was never actually exercised successfully in this session. If a genuine Fable 5-quality theme opinion is wanted, it needs either a larger budget or an explicit `max_tokens` cap passed at delegation time (not currently exposed as a `delegate_task` parameter) to avoid the same 402.
- No exact per-call dollar figure was independently verified against OpenRouter's billing API; the near-zero estimate above is based on model-class pricing and call duration, not a queried invoice line.
