# Batch state (updated 2026-06-11, post imagery-policy rollout)

Resolved since the 06-10 pause: wave2+ring deploy (done), photo pipeline
(rebuilt under the settled image policy: scraped Maps photos are pitch-gated
only, public demos use the licensed sample library + new art-directed
template), field mode deployed.

Still open:
1. **Migration 021** (pitch response channel) not applied to Supabase; the
   function tolerates absence.
2. **HandAI features** on nerve branch feat/develop-digest-field-mode, not
   pushed/deployed (deploy steps in the agent session log in that branch).
3. **Census recheck pool**: 908 errored checks (~476 promising) — re-shard
   website_status=error rows through check-websites.mts.
4. **Premium /impeccable upgrades** for top leads (now with pitch photos +
   the new baseline, less urgent).
5. **Spanish pitch variants** exist (--lang=es) but no pitches generated in
   Spanish yet; obvious for the taqueria-heavy campaigns.
