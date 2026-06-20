/**
 * San Marcos River paddling corridor — geographic data
 * City Park (San Marcos) downstream to Luling (Zedler Mill) and on to
 * Palmetto State Park (Ottine). Based on the TG Canoes & Kayaks shuttle map.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SOURCES (verified June 2026)
 * ──────────────────────────────────────────────────────────────────────────
 * - TG Canoes & Kayaks put-ins/take-outs (segment distances, access names):
 *     https://tgcanoe.com/san-marcos-river-put-ins-and-take-outs/
 *     https://tgcanoe.com/san-marcos-river-map/
 * - TPWD Luling Zedler Mill Paddling Trail (Hwy 90 & Zedler Mill coords, hazards):
 *     https://tpwd.texas.gov/boating/paddling-trails/prairies-and-lakes/luling-zedler-mill/
 * - TPWD San Marcos River fishing/paddling access maps & Scull Rd RACA site:
 *     https://tpwd.texas.gov/fishboat/fish/recreational/rivers/lease_access/sanmarcos_map_scull.phtml
 * - Tom Goynes / Texas Rivers Protection Assoc. "The Whole Dam Story" (dam sequence,
 *   Cummings rebar/12ft drop, Cape's/Thompson's Island, Martindale, Staples, portages):
 *     https://txrivers.org/discover-texas-rivers/san-marcos-river/the-whole-dam-story/
 * - Rio Vista Dam coords + runnable slot: https://en.wikipedia.org/wiki/Rio_Vista_Dam
 * - Cape's Dam (just E of I-35, start of Thompson's Island, damaged/hazard):
 *     https://www.sanmarcosrecord.com/article/29611,a-complete-history-of-cape-s-dam
 * - City Park (170 Charles Austin Dr) ~29.8859,-97.9345:
 *     https://www.visitsanmarcos.com/listing/san-marcos-city-park/63/
 * - Spencer Canoes / Shady Grove (9515 FM 1979, Martindale):
 *     https://www.visitsanmarcos.com/listing/spencer-canoes/252/
 * - Palmetto State Park (Ottine) 29.58722,-97.58222:
 *     https://en.wikipedia.org/wiki/Palmetto_State_Park
 * - USGS Water Services (site coords + live realtime check, param 00060/00065):
 *     https://waterservices.usgs.gov/nwis/site/   (siteOutput=expanded)
 *     https://waterservices.usgs.gov/nwis/iv/     (period=P1D, parameterCd=00060,00065)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * CONFIRMED vs ESTIMATED
 * ──────────────────────────────────────────────────────────────────────────
 * CONFIRMED coords: City Park, Rio Vista Dam, Spencer/Shady Grove (Martindale),
 *   Hwy 90 Luling put-in, Zedler Mill Park, Palmetto State Park, and all USGS gauges.
 * CONFIRMED live gauges (return realtime discharge 00060 + gage height 00065 as of
 *   2026-06-18): 08170500 (San Marcos), 08171400 (nr Martindale), 08172000 (Luling).
 *   NOT included (no realtime data / discontinued): 08171500 (FM 20 Fentress),
 *   08173500 (Ottine). Note: the often-cited "08170000" is San Marcos SPRINGS, not the
 *   river; "Ottine gauge for discharge" (08173500) is historical-only.
 * ESTIMATED (marked ~ in notes, refine later):
 *   - River miles are cumulative from TG segment distances; City Park=0. The
 *     Fentress→Hwy90 and Zedler→Palmetto deltas are NOT on the TG map and are
 *     estimated from river geography (~7 mi and ~6 mi respectively).
 *   - Coords for IH-35/Cape's Dam, Old Bastrop Rd, Scout Camp, Scull's Crossing,
 *     Staples bridge/dam, Fentress bridge, Cummings Dam are approximate (derived
 *     from town/landmark locations and the river's path; ~3-4 decimal confidence).
 *   - All `geometry` polylines are coarse hand-traced approximations of the river
 *     path, not surveyed centerlines.
 *   - flowLowCfs / flowHighCfs are paddling-judgment estimates for a spring-fed
 *     river with stable base flow (runnable base ~80-120 cfs at Luling; caution
 *     well above a few hundred cfs). Refine from gauge stats if better data found.
 */

import type { AccessPoint, Segment, Gauge } from '../types';

export const accessPoints: AccessPoint[] = [
  {
    id: 'city-park',
    name: 'City Park (San Marcos)',
    type: 'park',
    coords: [29.8859, -97.9345], // CONFIRMED: 170 Charles Austin Dr
    public: true,
    riverMile: 0,
    amenities: ['parking', 'restrooms', 'shade', 'put-in'],
    notes:
      'Standard top put-in for the corridor; popular tubing/paddling spot. Nonresident parking fees may apply seasonally.',
  },
  {
    id: 'rio-vista-park',
    name: 'Rio Vista Park / Falls',
    type: 'park',
    coords: [29.87869, -97.9326], // CONFIRMED Rio Vista Dam
    public: true,
    riverMile: 0.6,
    amenities: ['parking', 'restrooms', 'shade', 'put-in', 'take-out'],
    notes:
      'Rio Vista Falls is a set of engineered chutes over the old dam. The one drop on the river commonly run; a slot just right of center is the usual line.',
  },
  {
    id: 'capes-dam-ih35',
    name: "Cape's Dam / IH-35 (Thompson's Island)",
    type: 'dam-portage',
    coords: [29.866, -97.918], // ESTIMATE: just E of I-35, head of Thompson's Island
    public: false,
    riverMile: 2.2, // ESTIMATE
    amenities: ['portage'],
    notes:
      "Damaged 1867 weir at the head of Thompson's Island, just east of I-35; a hazard to river users and slated for removal. Portage; no developed public access.",
  },
  {
    id: 'cummings-dam',
    name: 'Cummings Dam',
    type: 'dam-portage',
    coords: [29.845, -97.905], // ESTIMATE
    public: false,
    riverMile: 3.8, // ESTIMATE
    amenities: ['portage'],
    notes:
      'The most dangerous dam on the river: a ~12 ft vertical drop with a deadly hydraulic and exposed rebar/debris. Portage river-left, starting close to the dam. Do NOT run.',
  },
  {
    id: 'old-bastrop-road',
    name: 'Old Bastrop Road Crossing',
    type: 'crossing',
    coords: [29.838, -97.892], // ESTIMATE
    public: true,
    riverMile: 5.4,
    amenities: ['parking', 'put-in', 'take-out'],
    notes:
      'Roadside crossing access (Old Bastrop Rd / FM 101 area) used as an intermediate put-in/take-out. Limited shoulder parking.',
  },
  {
    id: 'scout-camp',
    name: 'San Marcos Scout Camp',
    type: 'campground',
    coords: [29.836, -97.882], // ESTIMATE
    public: false,
    riverMile: 6.05,
    amenities: ['camping', 'shade'],
    notes:
      'Private scout camp riverfront sometimes used as a take-out; access by arrangement only, not a public ramp.',
  },
  {
    id: 'sculls-crossing',
    name: "Scull's Crossing (Scull Rd Bridge)",
    type: 'crossing',
    coords: [29.838, -97.857], // ESTIMATE; near Martindale
    public: true,
    riverMile: 9.05,
    amenities: ['parking', 'put-in', 'take-out'],
    notes:
      'TPWD River Access (RACA) site at the Scull Road bridge near Martindale; public from 30 min before sunrise to 30 min after sunset.',
  },
  {
    id: 'shady-grove',
    name: 'Shady Grove Campground / Spencer Canoes (Martindale)',
    type: 'outfitter',
    coords: [29.8447, -97.8392], // CONFIRMED Martindale / 9515 FM 1979
    public: false,
    riverMile: 10.85,
    amenities: ['parking', 'camping', 'restrooms', 'rentals', 'shuttle', 'put-in', 'take-out'],
    notes:
      'Spencer Canoes outfitter and Shady Grove Campground in Martindale, with rentals, shuttles, and camping. Customer/fee access (Westerfield Crossing area).',
  },
  {
    id: 'staples-bridge',
    name: 'Staples Bridge (FM 1979) / Staples Dam',
    type: 'dam-portage',
    coords: [29.785, -97.808], // ESTIMATE; Staples / FM 1979
    public: true,
    riverMile: 16.05,
    amenities: ['parking', 'portage', 'put-in', 'take-out'],
    notes:
      'FM 1979 bridge near Staples; the historic Staples Dam just below requires a portage. Common take-out for the popular upper 16.5-mile recreational reach.',
  },
  {
    id: 'fentress-bridge',
    name: 'Fentress Bridge (FM 20)',
    type: 'crossing',
    coords: [29.75278, -97.78094], // CONFIRMED via USGS 08171500 at FM 20 Fentress
    public: true,
    riverMile: 25.65,
    amenities: ['parking', 'put-in', 'take-out'],
    notes:
      'FM 20 / State Park Rd 20 bridge at Fentress; intermediate access on the quieter, more wooded lower river. Long shuttle from Staples (~9.6 mi of river).',
  },
  {
    id: 'hwy90-luling',
    name: 'Highway 90 Crossing (Luling put-in)',
    type: 'crossing',
    coords: [29.66791, -97.69991], // CONFIRMED (TPWD trail put-in)
    public: true,
    riverMile: 32.6, // ESTIMATE (Fentress->Hwy90 delta not on TG map)
    amenities: ['parking', 'put-in'],
    notes:
      'TPWD Luling–Zedler Mill Paddling Trail put-in, ~5 mi west of Luling just SE of where Hwy 90 crosses the river. Free shuttle parking.',
  },
  {
    id: 'zedler-mill',
    name: 'Zedler Mill Park (Luling)',
    type: 'park',
    coords: [29.6671, -97.6519], // CONFIRMED (TPWD trail take-out)
    public: true,
    riverMile: 38.7, // 32.6 + 6.1 TG trail distance
    amenities: ['parking', 'restrooms', 'shade', 'take-out'],
    notes:
      'Take-out across from the historic Zedler Mill. CRITICAL: do not miss it: the Zedler Mill Dam is just below and must not be run.',
  },
  {
    id: 'palmetto-state-park',
    name: 'Palmetto State Park (Ottine)',
    type: 'park',
    coords: [29.58722, -97.58222], // CONFIRMED
    public: true,
    riverMile: 44.7, // ESTIMATE (Zedler->Palmetto delta not on TG map, ~6 mi)
    amenities: ['parking', 'restrooms', 'camping', 'shade', 'take-out'],
    notes:
      'Lower take-out at Palmetto State Park near Ottine; a 6–7 hr float below Luling. Bring your own boat (no rentals). Low-water bridge crossing in the park.',
  },
];

export const segments: Segment[] = [
  {
    id: 'city-park__rio-vista-park',
    fromPointId: 'city-park',
    toPointId: 'rio-vista-park',
    distanceMiles: 0.6,
    estHours: 0.4,
    hazards: ['rapid', 'dam'],
    difficulty: 'easy',
    geometry: [
      [29.8859, -97.9345],
      [29.8843, -97.9339],
      [29.8825, -97.9333],
      [29.87869, -97.9326],
    ],
    description:
      'Short, clear spring-fed run through town ending at Rio Vista Falls: engineered chutes over the old dam, the one drop most paddlers run (or portage).',
  },
  {
    id: 'rio-vista-park__capes-dam-ih35',
    fromPointId: 'rio-vista-park',
    toPointId: 'capes-dam-ih35',
    distanceMiles: 1.6,
    estHours: 0.8,
    hazards: ['dam', 'rebar', 'strainer'],
    difficulty: 'moderate',
    geometry: [
      [29.87869, -97.9326],
      [29.8755, -97.929],
      [29.8718, -97.9255],
      [29.869, -97.9215],
      [29.866, -97.918],
    ],
    description:
      "Drifts toward I-35 and the head of Thompson's Island; Cape's Dam here is a damaged, hazardous weir. Portage required, with exposed structure and rebar.",
  },
  {
    id: 'capes-dam-ih35__cummings-dam',
    fromPointId: 'capes-dam-ih35',
    toPointId: 'cummings-dam',
    distanceMiles: 1.6,
    estHours: 0.9,
    hazards: ['dam', 'rebar', 'log-jam'],
    difficulty: 'moderate',
    geometry: [
      [29.866, -97.918],
      [29.8615, -97.9145],
      [29.8565, -97.911],
      [29.851, -97.908],
      [29.845, -97.905],
    ],
    description:
      "Below Thompson's Island the river slows into a long pool above Cummings Dam, the river's deadliest drop (~12 ft, rebar, killer hydraulic). Portage river-left.",
  },
  {
    id: 'cummings-dam__old-bastrop-road',
    fromPointId: 'cummings-dam',
    toPointId: 'old-bastrop-road',
    distanceMiles: 1.6,
    estHours: 0.8,
    hazards: ['rebar', 'strainer'],
    difficulty: 'easy',
    geometry: [
      [29.845, -97.905],
      [29.843, -97.901],
      [29.841, -97.897],
      [29.838, -97.892],
    ],
    description:
      'Eases below Cummings past old-dam remnants (Cottonseed / Old Mill rapids) to the Old Bastrop Road crossing; watch for leftover rebar at the old dam sites.',
  },
  {
    id: 'old-bastrop-road__scout-camp',
    fromPointId: 'old-bastrop-road',
    toPointId: 'scout-camp',
    distanceMiles: 0.65,
    estHours: 0.3,
    hazards: ['strainer'],
    difficulty: 'easy',
    geometry: [
      [29.838, -97.892],
      [29.837, -97.888],
      [29.836, -97.882],
    ],
    description:
      'Brief, easy reach to the San Marcos Scout Camp riverfront; clear water with occasional cypress strainers along the banks.',
  },
  {
    id: 'scout-camp__sculls-crossing',
    fromPointId: 'scout-camp',
    toPointId: 'sculls-crossing',
    distanceMiles: 3.0,
    estHours: 1.4,
    hazards: ['strainer', 'log-jam'],
    difficulty: 'easy',
    geometry: [
      [29.836, -97.882],
      [29.838, -97.876],
      [29.84, -97.869],
      [29.839, -97.863],
      [29.838, -97.857],
    ],
    description:
      'Pleasant wooded run to the Scull Road bridge (a TPWD river-access site near Martindale); generally easy with sweepers/log-jams to dodge.',
  },
  {
    id: 'sculls-crossing__shady-grove',
    fromPointId: 'sculls-crossing',
    toPointId: 'shady-grove',
    distanceMiles: 1.8,
    estHours: 0.9,
    hazards: ['strainer'],
    difficulty: 'easy',
    geometry: [
      [29.838, -97.857],
      [29.84, -97.851],
      [29.842, -97.845],
      [29.8447, -97.8392],
    ],
    description:
      'Short hop down to Spencer Canoes / Shady Grove Campground in Martindale (Westerfield Crossing area); popular outfitter put-in/take-out.',
  },
  {
    id: 'shady-grove__staples-bridge',
    fromPointId: 'shady-grove',
    toPointId: 'staples-bridge',
    distanceMiles: 5.2,
    estHours: 2.5,
    hazards: ['dam', 'strainer', 'log-jam'],
    difficulty: 'moderate',
    geometry: [
      [29.8447, -97.8392],
      [29.835, -97.835],
      [29.822, -97.828],
      [29.81, -97.82],
      [29.797, -97.814],
      [29.785, -97.808],
    ],
    description:
      'A longer, scenic reach to the FM 1979 bridge at Staples; the historic Staples Dam just below requires a portage. End of the popular upper 16.5-mile run.',
  },
  {
    id: 'staples-bridge__fentress-bridge',
    fromPointId: 'staples-bridge',
    toPointId: 'fentress-bridge',
    distanceMiles: 9.6,
    estHours: 4.6,
    hazards: ['strainer', 'log-jam', 'low-water-bridge'],
    difficulty: 'moderate',
    geometry: [
      [29.785, -97.808],
      [29.778, -97.802],
      [29.772, -97.797],
      [29.766, -97.79],
      [29.76, -97.785],
      [29.75278, -97.78094],
    ],
    description:
      'Long, quiet, increasingly wooded reach below Staples to the FM 20 bridge at Fentress; expect cypress strainers, log-jams, and low-water crossings, so plan a full day.',
  },
  {
    id: 'fentress-bridge__hwy90-luling',
    fromPointId: 'fentress-bridge',
    toPointId: 'hwy90-luling',
    distanceMiles: 7.0, // ESTIMATE (not on TG map)
    estHours: 3.4,
    hazards: ['strainer', 'log-jam'],
    difficulty: 'moderate',
    geometry: [
      [29.75278, -97.78094],
      [29.735, -97.768],
      [29.715, -97.752],
      [29.695, -97.735],
      [29.68, -97.718],
      [29.66791, -97.69991],
    ],
    description:
      'Remote, tree-lined float (distance estimated) connecting Fentress down to the Hwy 90 put-in west of Luling; abundant snags and log-jams, true wilderness feel.',
  },
  {
    id: 'hwy90-luling__zedler-mill',
    fromPointId: 'hwy90-luling',
    toPointId: 'zedler-mill',
    distanceMiles: 6.1,
    estHours: 3.0,
    hazards: ['rapid', 'dam', 'log-jam'],
    difficulty: 'easy',
    geometry: [
      [29.66791, -97.69991],
      [29.668, -97.69],
      [29.669, -97.68],
      [29.667, -97.671],
      [29.665, -97.662],
      [29.6671, -97.6519],
    ],
    description:
      'The TPWD Luling–Zedler Mill trail: a gentle, family-friendly 6-mile float with small Class I rapids, clear pools, and many snags/log-jams. Take out ABOVE Zedler Mill Dam.',
  },
  {
    id: 'zedler-mill__palmetto-state-park',
    fromPointId: 'zedler-mill',
    toPointId: 'palmetto-state-park',
    distanceMiles: 6.0, // ESTIMATE (not on TG map)
    estHours: 3.2,
    hazards: ['dam', 'strainer', 'log-jam', 'low-water-bridge'],
    difficulty: 'moderate',
    geometry: [
      [29.6671, -97.6519],
      [29.65, -97.64],
      [29.63, -97.625],
      [29.61, -97.608],
      [29.595, -97.594],
      [29.58722, -97.58222],
    ],
    description:
      'Below Luling (distance estimated) to Palmetto State Park near Ottine; portage Zedler Mill Dam at the start, then a wooded 6–7 hr float with snags and a low-water bridge.',
  },
];

export const gauges: Gauge[] = [
  {
    usgsId: '08170500',
    name: 'San Marcos Rv at San Marcos, TX',
    coords: [29.88911, -97.93417], // CONFIRMED; live 00060 + 00065
    nearestSegmentIds: [
      'city-park__rio-vista-park',
      'rio-vista-park__capes-dam-ih35',
      'capes-dam-ih35__cummings-dam',
      'cummings-dam__old-bastrop-road',
    ],
    // Spring-fed upper reach; very stable base flow. Thresholds are paddling estimates.
    flowLowCfs: 80,
    flowHighCfs: 350,
  },
  {
    usgsId: '08171400',
    name: 'San Marcos Rv nr Martindale, TX',
    coords: [29.83229, -97.84238], // CONFIRMED; live 00060 + 00065
    nearestSegmentIds: [
      'old-bastrop-road__scout-camp',
      'scout-camp__sculls-crossing',
      'sculls-crossing__shady-grove',
      'shady-grove__staples-bridge',
    ],
    // Estimated paddling thresholds for the Martindale reach.
    flowLowCfs: 90,
    flowHighCfs: 400,
  },
  {
    usgsId: '08172000',
    name: 'San Marcos Rv at Luling, TX',
    coords: [29.66634, -97.65086], // CONFIRMED; live 00060 + 00065
    nearestSegmentIds: [
      'staples-bridge__fentress-bridge',
      'fentress-bridge__hwy90-luling',
      'hwy90-luling__zedler-mill',
      'zedler-mill__palmetto-state-park',
    ],
    // Runnable base ~80-120 cfs at Luling; caution well above a few hundred cfs.
    flowLowCfs: 90,
    flowHighCfs: 500,
  },
];
