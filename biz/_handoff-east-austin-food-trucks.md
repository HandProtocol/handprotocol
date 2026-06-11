# Handoff — East Austin food-truck batch (2026-06-10)

Batch run of the `/hand-biz-pitch` pipeline across East Austin (east of I-35:
78702/21/22/23/24/25/41/42). The skill now lives IN this repo at
`.claude/skills/hand-biz-pitch/` so any Claude session on this checkout can run it.

## What is already done (this session)

- **Discovery**: 5 parallel Maps search scrapes (new script
  `command/scripts/discover-leads.mts`) → 234 unique places after dedup.
- **Website check**: per-place authoritative check (new script
  `command/scripts/check-websites.mts`, 8 parallel browsers) → 140 have real
  sites, 94 do not (73 none + 21 social-only).
- **Qualification**: no real website + east-of-I-35 + rating ≥ 4.2 + ≥ 15
  reviews + phone on the Maps card → 36; dropped Kenny Dorham's Backyard (a
  venue, not a truck) and the duplicate Santo Patio trailer (kept 78702) → **34 built**.
- **Pipeline**: `build-lead.mts` ran per truck (7-way parallel): `biz/<slug>/lead.md`
  written, registered in Supabase (`command.biz_leads` + `biz_reviews`, status
  `built`), quick-template demo + gated pitch generated. All 34 demos carry the
  visit beacon; all 34 pitches exist. Pitch scripts used the deterministic
  fallback (no ANTHROPIC_API_KEY locally).

## Tasks handed off — work these

1. **Confirm phones before pitching hard.** Every phone below came off the Maps
   card (most trustworthy source) but is human-unconfirmed. Spot-check digits
   before a caller works a lead; fix `biz/<slug>/lead.md` first, then re-run
   `npx tsx command/scripts/register-lead.mts <slug>`.
2. **Premium upgrades for the top leads.** The quick template is the baseline.
   Re-build the biggest fish with `/impeccable` (Phase 3 of the skill): Las
   Trancas (2,712 reviews), Tony's Jamaican (672), Saigon On 7th (666),
   Honduras Food Trailer (537), Taqueria Mi Trailita (446). Redeploy each
   surgically after.
3. **Hand-tune pitch category-isms.** The fallback script is restaurant-shaped;
   skim each pitch page for the truck's actual cuisine voice.
4. **Work the kanban.** All 34 sit at `built` on `/develop`. Assign callers,
   move `contacted → interested → closed` as calls happen.
5. **Watch Telegram.** The 💼 Develop topic self-announces each lead + demo on
   the develop-leads poll; demo-view posts follow as visits land.

## The 34 leads (by review count)

| Business | Rating | Reviews | Zip | Web status | Phone (unconfirmed) | Demo |
|---|---|---|---|---|---|---|
| Las Trancas Taco Stand | 4.7 | 2712 | 78702 | poor | (512) 701-8287 | [las-trancas-taco-stand-austin](https://handprotocol.org/demos/las-trancas-taco-stand-austin/) |
| Tony's Jamaican Food Austin | 4.5 | 672 | 78702 | none | (512) 945-5090 | [tonys-jamaican-food-austin-austin](https://handprotocol.org/demos/tonys-jamaican-food-austin-austin/) |
| Saigon On 7th | 4.7 | 666 | 78702 | poor | (512) 351-6916 | [saigon-on-7th-austin](https://handprotocol.org/demos/saigon-on-7th-austin/) |
| Honduras Food Trailer | 4.2 | 537 | 78741 | none | (512) 902-7490 | [honduras-food-trailer-austin](https://handprotocol.org/demos/honduras-food-trailer-austin/) |
| Taqueria Mi Trailita | 4.6 | 446 | 78723 | none | (512) 433-6044 | [taqueria-mi-trailita-austin](https://handprotocol.org/demos/taqueria-mi-trailita-austin/) |
| Oye Taquito 956 | 4.5 | 428 | 78702 | none | (512) 497-4823 | [oye-taquito-956-austin](https://handprotocol.org/demos/oye-taquito-956-austin/) |
| La Santa Barbacha | 4.5 | 408 | 78722 | poor | (737) 209-0455 | [la-santa-barbacha-austin](https://handprotocol.org/demos/la-santa-barbacha-austin/) |
| Tacos Guerrero | 4.8 | 382 | 78702 | none | (512) 939-2308 | [tacos-guerrero-austin](https://handprotocol.org/demos/tacos-guerrero-austin/) |
| POLLOS ASADOS EL NORTEÑO #1 | 4.3 | 288 | 78723 | none | (512) 939-6753 | [pollos-asados-el-norte-o-1-austin](https://handprotocol.org/demos/pollos-asados-el-norte-o-1-austin/) |
| BIRRIERIA LOPEZ CABRERA #2 | 4.5 | 282 | 78741 | none | (737) 292-7435 | [birrieria-lopez-cabrera-2-austin](https://handprotocol.org/demos/birrieria-lopez-cabrera-2-austin/) |
| Taqueria Fenix | 4.8 | 271 | 78702 | none | (737) 351-0518 | [taqueria-fenix-austin](https://handprotocol.org/demos/taqueria-fenix-austin/) |
| Antojitos mexicanos los Jarochos | 4.5 | 261 | 78741 | none | (512) 902-3939 | [antojitos-mexicanos-los-jarochos-austin](https://handprotocol.org/demos/antojitos-mexicanos-los-jarochos-austin/) |
| Vecinos | 4.8 | 261 | 78702 | none | (512) 706-5489 | [vecinos-austin](https://handprotocol.org/demos/vecinos-austin/) |
| Taqueria La Esperanza | 4.6 | 233 | 78702 | none | (512) 680-2943 | [taqueria-la-esperanza-austin](https://handprotocol.org/demos/taqueria-la-esperanza-austin/) |
| CHEF TRUCK | 4.9 | 230 | 78702 | none | (737) 786-5544 | [chef-truck-austin](https://handprotocol.org/demos/chef-truck-austin/) |
| Taqueria La Libertad | 4.7 | 206 | 78702 | none | (512) 383-6904 | [taqueria-la-libertad-austin](https://handprotocol.org/demos/taqueria-la-libertad-austin/) |
| Nom Burgers | 4.4 | 197 | 78702 | poor | (512) 217-7257 | [nom-burgers-austin](https://handprotocol.org/demos/nom-burgers-austin/) |
| Thai Thani | 4.6 | 182 | 78722 | none | (512) 423-6530 | [thai-thani-austin](https://handprotocol.org/demos/thai-thani-austin/) |
| Mama’z Soul Kitchen | 4.7 | 176 | 78723 | poor | (512) 436-4363 | [mama-z-soul-kitchen-austin](https://handprotocol.org/demos/mama-z-soul-kitchen-austin/) |
| Streamway Coffee | 4.7 | 169 | 78722 | none | (956) 289-3996 | [streamway-coffee-austin](https://handprotocol.org/demos/streamway-coffee-austin/) |
| Iwayne's Caribbean Kitchen | 4.6 | 163 | 78702 | none | (512) 317-7321 | [iwaynes-caribbean-kitchen-austin](https://handprotocol.org/demos/iwaynes-caribbean-kitchen-austin/) |
| Rice on the Hill | 4.2 | 153 | 78741 | none | (737) 299-1382 | [rice-on-the-hill-austin](https://handprotocol.org/demos/rice-on-the-hill-austin/) |
| Tacos Juanita | 4.4 | 132 | 78702 | none | (512) 290-8348 | [tacos-juanita-austin](https://handprotocol.org/demos/tacos-juanita-austin/) |
| Tacos y Pupusas Los Ramos | 4.2 | 117 | 78741 | none | (512) 712-3573 | [tacos-y-pupusas-los-ramos-austin](https://handprotocol.org/demos/tacos-y-pupusas-los-ramos-austin/) |
| Taqueria el Picante | 4.6 | 116 | 78722 | none | (512) 967-7902 | [taqueria-el-picante-austin](https://handprotocol.org/demos/taqueria-el-picante-austin/) |
| Sipps On Wheels | 4.4 | 105 | 78741 | poor | (512) 758-9315 | [sipps-on-wheels-austin](https://handprotocol.org/demos/sipps-on-wheels-austin/) |
| Ethiopian and Eritrean Food Trailer | 4.9 | 95 | 78702 | none | (737) 202-8238 | [ethiopian-and-eritrean-food-trailer-austin](https://handprotocol.org/demos/ethiopian-and-eritrean-food-trailer-austin/) |
| Taqueria El Vallecito | 4.7 | 89 | 78741 | poor | (512) 658-3951 | [taqueria-el-vallecito-austin](https://handprotocol.org/demos/taqueria-el-vallecito-austin/) |
| Santo Patio Taco Trailer | 4.8 | 84 | 78702 | none | (737) 419-7841 | [santo-patio-taco-trailer-austin](https://handprotocol.org/demos/santo-patio-taco-trailer-austin/) |
| Veracruz Antojitos Mexicanos #2 | 4.2 | 69 | 78702 | none | (512) 947-6988 | [veracruz-antojitos-mexicanos-2-austin](https://handprotocol.org/demos/veracruz-antojitos-mexicanos-2-austin/) |
| Juli’s tacos | 4.8 | 65 | 78724 | none | (512) 373-9220 | [juli-s-tacos-austin](https://handprotocol.org/demos/juli-s-tacos-austin/) |
| Taqueria El Venado | 4.3 | 37 | 78723 | none | (512) 977-8150 | [taqueria-el-venado-austin](https://handprotocol.org/demos/taqueria-el-venado-austin/) |
| Mama'S Tacos | 4.3 | 18 | 78741 | none | (512) 627-0748 | [mamas-tacos-austin](https://handprotocol.org/demos/mamas-tacos-austin/) |
| Taquera Yolita | 4.5 | 15 | 78741 | none | (512) 787-3732 | [taquera-yolita-austin](https://handprotocol.org/demos/taquera-yolita-austin/) |
## Rejected but close (no site, failed one bar) — second-pass candidates

Sarahs on the road (3.9), Taqueria Piedra Grande #2 (4.1), The Stonehouse Wood
Fire Grill (4.1), Taco Master Austin Tx (4.1, no phone), Golden Tiger (no
phone), El SUPER TACO (no phone), Camp East (10 reviews). Full lists with
reasons: re-run discovery or ask koH for the session data.

## Run-it-again recipe (any neighborhood)

```
cd command
npx tsx scripts/discover-leads.mts "https://www.google.com/maps/search/food+trucks/@<lat>,<lng>,14z" > /tmp/found.ndjson
npx tsx scripts/check-websites.mts /tmp/found.ndjson --out=/tmp/checked.ndjson
# filter, then per qualifying place:
npx tsx scripts/build-lead.mts "<place-href>" --keep-going
```
