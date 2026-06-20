/**
 * Guadalupe / South-Central Texas paddling corridor — geographic data
 * region: 'guadalupe'
 *
 * Covers four waterways across the Hill Country & Prairies-and-Lakes ecoregions:
 *   - Guadalupe River: Canyon Dam tailrace → Sattler/Horseshoe Loop → Gruene →
 *     New Braunfels → Lake Dunlap → Seguin → Gonzales → Cuero.
 *   - Comal River (New Braunfels; shortest river in Texas): Prince Solms / Tube
 *     Chute → Hinman Island → Landa Park → Last Tubo.
 *   - Lower San Marcos River (BELOW Luling only — the upper City Park→Luling
 *     corridor lives in riverData.ts): Zedler Mill → Palmetto State Park →
 *     San Marcos/Guadalupe confluence at Gonzales.
 *   - Lower Colorado River (below Bastrop): Bastrop Fisherman's Park →
 *     Smithville Riverbend → La Grange → Columbus (Beason's Park).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SOURCES (verified June 2026)
 * ──────────────────────────────────────────────────────────────────────────
 * USGS site coords + live realtime check (param 00060 discharge / 00065 gage ht):
 *   https://waterservices.usgs.gov/nwis/site/?sites=08167800,08167500,08168500,08173900,08169000,08161000,08159200&siteOutput=expanded&format=rdb
 *   https://waterservices.usgs.gov/nwis/iv/  (period=P1D, parameterCd=00060,00065)
 * TPWD lease-access river sites (CONFIRMED coords):
 *   Whitewater Sports: https://tpwd.texas.gov/fishboat/fish/recreational/rivers/lease_access/whitewater_sports.phtml
 *   Rio Guadalupe Resort (Rio Raft): https://tpwd.texas.gov/fishboat/fish/recreational/rivers/lease_access/rio_raft.phtml
 *   Camp Huaco Springs: https://tpwd.texas.gov/fishboat/fish/recreational/rivers/lease_access/camp_huaco.phtml
 * TPWD paddling trails (CONFIRMED access coords + distances):
 *   Luling Zedler Mill: https://tpwd.texas.gov/boating/paddling-trails/prairies-and-lakes/luling-zedler-mill/
 *   Come and Take It (Gonzales, Guad+SM confluence): https://tpwd.texas.gov/boating/paddling-trails/prairies-and-lakes/come-and-take-it
 *   Independence (Gonzales, US-183 access): https://tpwd.texas.gov/boating/paddling-trails/prairies-and-lakes/independence
 *   Seguin Lake Seguin (Max Starcke Park): https://tpwd.texas.gov/boating/paddling-trails/south-texas-plains/seguin-lake-seguin/
 * City of Seguin Max Starcke Park dock GPS: https://www.seguintexas.gov/facilities/facility/details/Max-Starcke-Park-7
 * City of New Braunfels parks (Prince Solms / Hinman Island / Comal River):
 *   https://newbraunfels.gov/3368/Comal-River  https://newbraunfels.gov/facilities/facility/details/18
 * Last Tubo (last public Comal exit reopened 2025-05):
 *   https://communityimpact.com/san-antonio/new-braunfels/government/2025/05/23/last-public-exit-from-comal-river-reopens-in-new-braunfels/
 * Lake Dunlap public ramp (TPWD, IH-35 / exit 188 Guadalupe turnaround):
 *   https://tpwd.texas.gov/fishboat/fish/recreational/lakes/dunlap/access.phtml
 * LCRA Paddle the Colorado (Bastrop→Columbus access list, river miles):
 *   https://lcraparks.com/paddle-the-colorado
 * Vernon L. Richards Riverbend Park (Smithville) GPS: https://naturalatlas.com/boat-launches/vernon-richards-riverbend-park-boat-access-2276982
 * Palmetto State Park (Ottine): https://en.wikipedia.org/wiki/Palmetto_State_Park
 * Canyon Dam / tailrace (USACE COE park, base of dam): https://en.wikipedia.org/wiki/Canyon_Dam_(Texas)
 * Gruene Historic District / river crossing: https://en.wikipedia.org/wiki/Gruene,_New_Braunfels,_Texas
 *
 * ──────────────────────────────────────────────────────────────────────────
 * CONFIRMED vs ESTIMATED
 * ──────────────────────────────────────────────────────────────────────────
 * CONFIRMED coords (authoritative source above): Whitewater Sports, Rio Raft,
 *   Camp Huaco Springs, Hwy-90 (San Marcos) & Zedler Mill, Max Starcke Park dock,
 *   Prince Solms Park, Hinman Island Park, Independence US-183 access, Lake Wood
 *   Park, Come-and-Take-It dock, Vernon L. Richards Riverbend, Palmetto State
 *   Park, Beason's Park (Columbus), Bastrop Fisherman's Park, all USGS gauges.
 * ESTIMATED coords (marked ~ in notes; derived from the river path, the named
 *   landmark, or a low-precision parks listing — refine later): Canyon tailrace
 *   put-in (base of dam, below outlet works), Horseshoe Loop, Gruene Crossing,
 *   Lazy L&L, Lake Dunlap IH-35 ramp, Landa Park Comal headwaters, Last Tubo
 *   exit, Seguin Max Starcke take-out, Gonzales Independence Park, Cuero, La
 *   Grange, Smithville (already confirmed). River miles are approximate
 *   downstream distances per waterway (mile-0 = each river's local reference)
 *   and, for the Colorado, follow LCRA "miles to start" deltas.
 *
 * ⚠ DAM-RELEASE DEPENDENCE: The headline Guadalupe Hill Country run (Canyon Dam
 *   tailrace → Gruene → New Braunfels) is a TAILWATER reach. Flow is driven by
 *   GBRA/USACE releases from Canyon Lake, NOT by rainfall. It is runnable only
 *   when releases are up; in low-release periods the upper reaches go scrapey.
 *   Lake Dunlap is a GBRA impounded flat-pool reach. flowLow/High thresholds on
 *   the Sattler/New Braunfels gauges are release-driven paddling estimates.
 */

import type { AccessPoint, Gauge } from '../types';

export const accessPoints: AccessPoint[] = [
  // ── Guadalupe River: Canyon Dam tailrace → Sattler → Gruene → New Braunfels ──
  {
    id: 'guad-canyon-tailrace',
    name: 'Guadalupe below Canyon Dam (Tailrace)',
    type: 'ramp',
    coords: [29.8706, -98.1934], // ESTIMATE: base of Canyon Dam, COE/Maricopa river access below the outlet works
    public: true,
    riverMile: 0,
    amenities: ['parking', 'put-in', 'trail', 'shade'],
    notes:
      'Top of the famous Hill Country tailwater run. Cold, clear release water from the bottom of Canyon Lake. RELEASE-DEPENDENT: runnable only when GBRA/USACE releases are up; check the Sattler gauge. ~Estimated put-in coords at the Corps park below the dam.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
    featured: true,
  },
  {
    id: 'guad-rio-raft',
    name: 'Rio Guadalupe Resort (Rio Raft)',
    type: 'outfitter',
    coords: [29.843805, -98.16917], // CONFIRMED (TPWD lease-access)
    public: false,
    riverMile: 2.0,
    amenities: ['parking', 'put-in', 'take-out', 'restrooms', 'outfitter', 'shuttle'],
    notes:
      'Fee outfitter at the fourth River Road bridge crossing in Sattler. 950 ft of bank access; launch canoes/kayaks. First-come 10-vehicle free limit then $8/person.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
  },
  {
    id: 'guad-whitewater-sports',
    name: 'Whitewater Sports (FM 306, Sattler)',
    type: 'outfitter',
    coords: [29.861426, -98.157397], // CONFIRMED (TPWD lease-access)
    public: false,
    riverMile: 3.5,
    amenities: ['parking', 'put-in', 'take-out', 'restrooms', 'outfitter', 'shuttle'],
    notes:
      'Long-running outfitter on FM 306 just east of the easternmost Guadalupe bridge. Cypress-lined rocky banks; boats portaged to the water. Popular shuttle base for the upper canyon runs.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
  },
  {
    id: 'guad-horseshoe-loop',
    name: 'Horseshoe Loop (River Road, Sattler)',
    type: 'crossing',
    coords: [29.8516, -98.1444], // ESTIMATE: horseshoe bend on River Road ~just NW of New Braunfels, off RR/FM 306
    public: true,
    riverMile: 6.5,
    amenities: ['put-in', 'take-out'],
    notes:
      '~1-mile horseshoe-shaped bend off River Road near Sattler; day-floaters put in and end up near where they started. Many outfitters cluster here. ~Estimated coords along the River Road loop.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
  },
  {
    id: 'guad-camp-huaco-springs',
    name: 'Camp Huaco Springs (First Crossing)',
    type: 'campground',
    coords: [29.759801, -98.14009], // CONFIRMED (TPWD lease-access; 4150 River Road)
    public: false,
    riverMile: 12.0,
    amenities: ['parking', 'put-in', 'take-out', 'camping', 'restrooms', 'shuttle'],
    notes:
      'Riverfront campground/access at First Crossing on River Road. Below here is the turbulent 3.5-mi stretch to Gruene with Hueco Springs and Slumber Falls rapids. Fee access.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
  },
  {
    id: 'guad-lazy-l-and-l',
    name: 'Lazy L&L Campground',
    type: 'campground',
    coords: [29.7466, -98.1303], // ESTIMATE: River Road campground between First Crossing and Gruene
    public: false,
    riverMile: 14.5,
    amenities: ['parking', 'put-in', 'take-out', 'camping', 'restrooms', 'shuttle'],
    notes:
      'River Road camp with cabins/RV/tent sites and Guadalupe river access between First Crossing and Gruene. Fee access. ~Estimated coords.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
  },
  {
    id: 'guad-gruene-crossing',
    name: 'Gruene Crossing (Hueco Springs reach)',
    type: 'crossing',
    coords: [29.7361, -98.1051], // ESTIMATE: river crossing at the foot of Gruene Rd, below the historic district
    public: true,
    riverMile: 16.0,
    amenities: ['put-in', 'take-out', 'outfitter', 'parking'],
    notes:
      'Iconic put-in/take-out at Gruene below the historic district; classic Gruene-to-New-Braunfels float. Outfitters (Gruene River Co.) cluster at the crossing. ~Estimated coords at the river bridge.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
    featured: true,
  },
  {
    id: 'guad-nb-above-comal',
    name: 'New Braunfels (Guadalupe above Comal)',
    type: 'ramp',
    coords: [29.71495, -98.11001], // CONFIRMED area (USGS 08168500 abv Comal at New Braunfels)
    public: true,
    riverMile: 19.0,
    amenities: ['put-in', 'take-out'],
    notes:
      'Guadalupe access in New Braunfels just above the Comal River confluence, near the USGS gauge. End of the classic Hill Country tailwater run; the Comal joins just downstream.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
    featured: true,
  },
  // ── Guadalupe River: Lake Dunlap → Seguin → Gonzales → Cuero ──
  {
    id: 'guad-lake-dunlap-ramp',
    name: 'Lake Dunlap Boat Ramp (IH-35)',
    type: 'ramp',
    coords: [29.6783, -98.0667], // ESTIMATE: TPWD ramp under IH-35 / Guadalupe turnaround (exit 188)
    public: true,
    riverMile: 24.0,
    amenities: ['parking', 'ramp', 'put-in', 'take-out'],
    notes:
      'Only public access on Lake Dunlap — a GBRA-impounded flat pool on the Guadalupe east of New Braunfels. Paved 2-lane ramp under IH-35, no fee. ~Estimated coords. Flatwater, not the tailwater run.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
  },
  {
    id: 'guad-max-starcke-park',
    name: 'Max Starcke Park (Seguin)',
    type: 'park',
    coords: [29.5513, -97.9718], // CONFIRMED: Max Starcke Park concrete dock (City of Seguin)
    public: true,
    riverMile: 40.0,
    amenities: ['parking', 'ramp', 'put-in', 'take-out', 'restrooms', 'shade'],
    notes:
      'City park on the Guadalupe in Seguin; concrete dock by Saffold Dam, start of the scenic ~4-mi Lake Seguin paddling loop (no shuttle). Court order requires life jackets on this trail.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
    featured: true,
  },
  {
    id: 'guad-gonzales-independence-park',
    name: 'Independence Park (Gonzales)',
    type: 'park',
    coords: [29.4841, -97.4482], // CONFIRMED: Independence Paddling Trail access at US-183 bridge
    public: true,
    riverMile: 75.0,
    amenities: ['parking', 'put-in', 'take-out', 'restrooms', 'playground', 'shade'],
    notes:
      'Gonzales river access at the US-183 bridge; the Independence Paddling Trail is a 2.6-mi beginner loop on the Guadalupe. The San Marcos River joins the Guadalupe just upstream of Gonzales.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
  },
  {
    id: 'guad-gonzales-lake-wood',
    name: 'Lake Wood Park (Gonzales / Come-and-Take-It)',
    type: 'park',
    coords: [29.4707, -97.4899], // CONFIRMED: Come-and-Take-It Paddling Trail put-in below H-5 Dam
    public: true,
    riverMile: 78.0,
    amenities: ['parking', 'put-in', 'camping', 'restrooms'],
    notes:
      'Put-in ~0.5 mi below the H-5 Dam for the ~11-mi Come-and-Take-It Paddling Trail, which passes the Guadalupe/San Marcos confluence. GBRA park; watch for the downstream hydro dam take-out.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
  },
  {
    id: 'guad-cuero',
    name: 'Cuero (Guadalupe River access)',
    type: 'ramp',
    coords: [29.0916, -97.2886], // ESTIMATE: Guadalupe near Cuero / US-87 bridge
    public: true,
    riverMile: 110.0,
    amenities: ['put-in', 'take-out'],
    notes:
      'Lower Guadalupe access near Cuero, well downstream of Gonzales. Quieter, lower-gradient coastal-plain river. ~Estimated coords near the US-87 crossing.',
    region: 'guadalupe',
    waterway: 'Guadalupe River',
  },

  // ── Comal River (New Braunfels) — shortest river in Texas, ~2.5 mi ──
  {
    id: 'comal-prince-solms',
    name: 'Prince Solms Park / Tube Chute',
    type: 'park',
    coords: [29.708558, -98.122509], // CONFIRMED: 100 Liebscher Dr (City of New Braunfels)
    public: true,
    riverMile: 0.4,
    amenities: ['parking', 'put-in', 'take-out', 'restrooms', 'tube-chute', 'shade', 'playground'],
    notes:
      'Gateway to the Comal: spring-fed pool and the famous city Tube Chute bypassing the old dam. The marquee New Braunfels put-in; very busy in summer. Spring-fed so flow is stable year-round.',
    region: 'guadalupe',
    waterway: 'Comal River',
    featured: true,
  },
  {
    id: 'comal-hinman-island',
    name: 'Hinman Island Park',
    type: 'park',
    coords: [29.708386, -98.124223], // CONFIRMED (City of New Braunfels)
    public: true,
    riverMile: 0.2,
    amenities: ['parking', 'put-in', 'take-out', 'restrooms', 'tube-chute', 'shade', 'playground'],
    notes:
      'Island park between Landa Park and Prince Solms, with river entry and access to the city Tube Chute. Popular swim/snorkel/tube spot on the Comal.',
    region: 'guadalupe',
    waterway: 'Comal River',
  },
  {
    id: 'comal-landa-park',
    name: 'Landa Park (Comal headwaters)',
    type: 'park',
    coords: [29.7128, -98.1318], // ESTIMATE: Comal Springs / Landa Park, river head near Landa Lake
    public: true,
    riverMile: 0.0,
    amenities: ['parking', 'put-in', 'restrooms', 'shade', 'playground'],
    notes:
      'Comal Springs / Landa Park at the very head of the Comal River. Spring-fed crystal water; uppermost access. ~Estimated coords near Landa Lake. Some reaches restricted; check seasonal rules.',
    region: 'guadalupe',
    waterway: 'Comal River',
  },
  {
    id: 'comal-last-tubo',
    name: 'Last Tubo (last public Comal exit)',
    type: 'park',
    coords: [29.7019, -98.1153], // ESTIMATE: Union St / W Lincoln St take-out near the Comal mouth
    public: true,
    riverMile: 2.3,
    amenities: ['take-out', 'restrooms'],
    notes:
      'The last public take-out on the Comal before it meets the Guadalupe (corner of Union & W Lincoln). Reopened May 2025 with ADA landing — miss it and there is no public exit. ~Estimated coords.',
    region: 'guadalupe',
    waterway: 'Comal River',
  },

  // ── Lower San Marcos River (BELOW Luling only; uses lsm- ids to avoid clash) ──
  {
    id: 'lsm-hwy90-luling',
    name: 'Highway 90 Crossing (Luling put-in)',
    type: 'crossing',
    coords: [29.6679, -97.6999], // CONFIRMED (TPWD Luling Zedler Mill Paddling Trail put-in)
    public: true,
    riverMile: 0,
    amenities: ['parking', 'put-in', 'shuttle'],
    notes:
      'SH-90 river crossing ~5 mi west of Luling; standard put-in for the 6-mi Zedler Mill Paddling Trail on the lower San Marcos. Free shuttle-vehicle storage.',
    region: 'guadalupe',
    waterway: 'San Marcos River',
  },
  {
    id: 'lsm-zedler-mill',
    name: 'Zedler Mill Park (Luling)',
    type: 'park',
    coords: [29.6671, -97.6519], // CONFIRMED (TPWD)
    public: true,
    riverMile: 6.0,
    amenities: ['parking', 'put-in', 'take-out', 'restrooms', 'shade'],
    notes:
      'Take-out across from the historic Zedler Mill in Luling. WARNING: a dam sits just beyond the mill — do not float past this take-out. Also the put-in for the run down toward Palmetto.',
    region: 'guadalupe',
    waterway: 'San Marcos River',
  },
  {
    id: 'lsm-palmetto-state-park',
    name: 'Palmetto State Park (Ottine)',
    type: 'park',
    coords: [29.58722, -97.58222], // CONFIRMED
    public: true,
    riverMile: 12.0,
    amenities: ['parking', 'put-in', 'take-out', 'restrooms', 'camping', 'shade'],
    notes:
      'Lush dwarf-palmetto bottomland state park on the lower San Marcos below Luling. ~Estimated river-mile downstream of Zedler. Day-use/entrance fee.',
    region: 'guadalupe',
    waterway: 'San Marcos River',
    featured: true,
  },
  {
    id: 'lsm-gonzales-confluence',
    name: 'Come-and-Take-It Dock (SM/Guadalupe confluence area)',
    type: 'ramp',
    coords: [29.4978, -97.4558], // CONFIRMED (TPWD Come-and-Take-It take-out)
    public: true,
    riverMile: 30.0,
    amenities: ['take-out', 'parking'],
    notes:
      'Lower take-out dock near Gonzales on the river just below where the San Marcos meets the Guadalupe. On the left bank ~750 ft past a hydro-dam caution sign — do not pass it. ~Estimated river-mile from Palmetto.',
    region: 'guadalupe',
    waterway: 'San Marcos River',
  },

  // ── Lower Colorado River (below Bastrop) ──
  {
    id: 'colo-bastrop-fishermans',
    name: "Bastrop Fisherman's Park",
    type: 'park',
    coords: [30.1047, -97.3194], // CONFIRMED area (USGS 08159200 Colorado at Bastrop; LCRA 30.11,-97.33)
    public: true,
    riverMile: 0,
    amenities: ['parking', 'ramp', 'put-in', 'take-out', 'restrooms', 'shade'],
    notes:
      'Downtown Bastrop river park at the end of Farm Street; both the El Camino Real (6 mi downstream) and Wilbarger paddling trails start/end here. Boat ramp open 8 a.m.–10 p.m.',
    region: 'guadalupe',
    waterway: 'Colorado River',
    featured: true,
  },
  {
    id: 'colo-smithville-riverbend',
    name: 'Vernon L. Richards Riverbend Park (Smithville)',
    type: 'park',
    coords: [30.01793, -97.14542], // CONFIRMED
    public: true,
    riverMile: 26.0,
    amenities: ['parking', 'ramp', 'put-in', 'take-out', 'camping', 'restrooms', 'playground', 'shade'],
    notes:
      'Smithville riverside park with camping, RV pads, pavilion and Colorado River access (off SH-95 / American Legion Rd). ~26 river mi below Bastrop per LCRA mileage. Open 24 hours.',
    region: 'guadalupe',
    waterway: 'Colorado River',
  },
  {
    id: 'colo-lagrange-white-rock',
    name: 'White Rock Park (La Grange)',
    type: 'park',
    coords: [29.9, -96.86], // ESTIMATE: LCRA listing 29.90,-96.86 (low precision)
    public: true,
    riverMile: 63.0,
    amenities: ['parking', 'ramp', 'put-in', 'take-out'],
    notes:
      'La Grange Colorado River access (off Hwy 71 Business via E. Elbin & Mode Lane). ~63 river mi below Bastrop per LCRA mileage. ~Estimated low-precision coords from LCRA listing.',
    region: 'guadalupe',
    waterway: 'Colorado River',
  },
  {
    id: 'colo-columbus-beasons',
    name: "Beason's Park (Columbus)",
    type: 'park',
    coords: [29.7063, -96.5369], // CONFIRMED area (USGS 08161000 Colorado at Columbus; LCRA 29.71,-96.54)
    public: true,
    riverMile: 103.0,
    amenities: ['parking', 'ramp', 'put-in', 'take-out', 'restrooms', 'shade'],
    notes:
      'Columbus day-use river park off US-90; take-out for the ~6.5-mi Columbus loop float (Hwy 71 bridge → Beason\'s). Colorado County managed. ~River-mile per LCRA mileage below Bastrop.',
    region: 'guadalupe',
    waterway: 'Colorado River',
  },
];

export const gauges: Gauge[] = [
  {
    usgsId: '08167800',
    name: 'Guadalupe Rv at Sattler, TX',
    coords: [29.85910758, -98.1800106], // CONFIRMED, live 00060/00065
    nearestSegmentIds: [],
    region: 'guadalupe',
    flowLowCfs: 100, // RELEASE-DRIVEN: upper tailwater run scrapey below this
    flowHighCfs: 1500, // high/caution; big releases push the canyon run up fast
  },
  {
    usgsId: '08167500',
    name: 'Guadalupe Rv nr Spring Branch, TX',
    coords: [29.8604957, -98.3836275], // CONFIRMED, live; inflow above Canyon Lake
    nearestSegmentIds: [],
    region: 'guadalupe',
    flowLowCfs: 80,
    flowHighCfs: 2000,
  },
  {
    usgsId: '08168500',
    name: 'Guadalupe Rv abv Comal Rv at New Braunfels, TX',
    coords: [29.7149465, -98.1100083], // CONFIRMED, live
    nearestSegmentIds: [],
    region: 'guadalupe',
    flowLowCfs: 120, // release-driven at the bottom of the canyon run
    flowHighCfs: 2000,
  },
  {
    usgsId: '08173900',
    name: 'Guadalupe Rv at Gonzales, TX',
    coords: [29.48440414, -97.4502702], // CONFIRMED, live
    nearestSegmentIds: [],
    region: 'guadalupe',
    flowLowCfs: 150, // larger lower-basin river, drains more area
    flowHighCfs: 6000,
  },
  {
    usgsId: '08169000',
    name: 'Comal Rv at New Braunfels, TX',
    coords: [29.70640833, -98.1222083], // CONFIRMED, live
    nearestSegmentIds: [],
    region: 'guadalupe',
    flowLowCfs: 150, // spring-fed, very stable base flow
    flowHighCfs: 500, // floods only on big rain into the springs/Blieders Creek
  },
  {
    usgsId: '08161000',
    name: 'Colorado Rv at Columbus, TX',
    coords: [29.7063454, -96.5369155], // CONFIRMED, live
    nearestSegmentIds: [],
    region: 'guadalupe',
    flowLowCfs: 400, // large managed river; runnable across a wide band
    flowHighCfs: 12000,
  },
  {
    usgsId: '08159200',
    name: 'Colorado Rv at Bastrop, TX',
    coords: [30.10466154, -97.3194368], // CONFIRMED, live
    nearestSegmentIds: [],
    region: 'guadalupe',
    flowLowCfs: 300,
    flowHighCfs: 10000,
  },
];
