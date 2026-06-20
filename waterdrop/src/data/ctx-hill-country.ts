/**
 * Hill Country paddling drop-in database — region 'hill-country'
 * Covers public put-ins / take-outs NW of Austin across the Pedernales, Llano,
 * San Gabriel and Blanco rivers, plus the upper Highland Lakes reservoirs on the
 * Colorado (Lake Travis, Lake LBJ, Lake Marble Falls, Inks Lake, Lake Buchanan).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SOURCES (verified June 2026 via WebSearch/WebFetch)
 * ──────────────────────────────────────────────────────────────────────────
 * USGS Water Services — site coords (siteOutput=expanded) + live realtime check
 *   (parameterCd=00060 discharge & 00065 gage height, period=P1D):
 *     https://waterservices.usgs.gov/nwis/site/
 *     https://waterservices.usgs.gov/nwis/iv/
 *   All five gauges below CONFIRMED returning realtime 00060 + 00065 as of
 *   2026-06-19 01:00 CDT.
 *
 * PEDERNALES RIVER
 *   - Pedernales Falls State Park 30.30000,-98.24167 (river access at swimming
 *     area / Trammell's Crossing, NOT the falls):
 *       https://en.wikipedia.org/wiki/Pedernales_Falls_State_Park
 *       https://tpwd.texas.gov/state-parks/pedernales-falls/
 *   - Milton Reimers Ranch Park (23610 Hamilton Pool Rd; steep road to river):
 *       https://parks.traviscountytx.gov/parks/reimers-ranch
 *   - Hamilton Pool Rd bridge at Pedernales (Westcave area crossing):
 *       https://www2.traviscountytx.gov/tnr/publicworks/cip/project.asp?projectnumber=20
 *   - LBJ State Park & Historic Site, Stonewall 30.23750,-98.62611:
 *       https://en.wikipedia.org/wiki/Lyndon_B._Johnson_State_Park_and_Historic_Site
 *   - Lower Pedernales paddled run starts above US-281 N of Johnson City (TRPA):
 *       https://txrivers.org/discover-texas-rivers/colorado-river-basin/pedernales-river/
 *
 * LLANO RIVER
 *   - Leonard Grenwelge County Park, Llano 30.7518,-98.6744 (S bank below dam):
 *       https://www.cityofllano.com/facilities/facility/details/Leonard-Grenwelge-Park-11
 *       https://101highlandlakes.com/llano-river-access-from-llano-city-parks/
 *   - Robinson City Park, Llano (two river access points just outside town):
 *       https://www.cityofllano.com/140/Parks-Recreation
 *   - Castell Crossing, FM 2768 ~30.70111,-98.95639 (TPWD leased paddler launch);
 *     USGS site "Llano Rv at FM 2768 at Castell" at 30.70333,-98.95861:
 *       https://tpwd.texas.gov/fishboat/fish/recreational/rivers/lease_access/llano_castell.phtml
 *       https://waterdata.usgs.gov/monitoring-location/304212098573100/
 *   - Llano River Access (Maso-Llan Rd), Mason County (TPWD lease):
 *       https://tpwd.texas.gov/fishboat/fish/recreational/rivers/lease_access/maso_llan.phtml
 *   - Kingsland Slab, FM 3404 ~30.68206,-98.48170 (Llano nears Lake LBJ):
 *       https://tpwd.texas.gov/fishboat/fish/recreational/rivers/lease_access/kingsland_slab.phtml
 *
 * SAN GABRIEL RIVER
 *   - San Gabriel Park, Georgetown (N & S forks meet):
 *       https://georgetowntexas.gov/business_detail_T22_R105.php
 *   - Blue Hole Park, Georgetown 30.64306,-97.68000 (South Fork):
 *       https://en.wikipedia.org/wiki/Blue_Hole_Park
 *   - Chautauqua Park (trail-linked, between Blue Hole & San Gabriel Park):
 *       https://georgetowntexas.gov/parks
 *   - Granger Lake / San Gabriel WMA boat launch via FM 1331 near Circleville
 *     (jon boats / canoes only); lake 30.70167,-97.34056:
 *       https://tpwd.texas.gov/fishboat/fish/recreational/lakes/granger/access.phtml
 *       https://en.wikipedia.org/wiki/Granger_Lake
 *
 * BLANCO RIVER
 *   - Blanco State Park 30.08944,-98.42389 (1 mi of river, spring-fed):
 *       https://en.wikipedia.org/wiki/Blanco_State_Park
 *       https://tpwd.texas.gov/state-parks/blanco
 *   - Blue Hole Regional Park, Wimberley 30.00250,-98.09083 (Cypress Creek;
 *     seasonal public swim, paddling at Blanco access nearby):
 *       https://www.cityofwimberley.com/facilities/facility/details/Blue-Hole-Regional-Park-2
 *   - Five Mile Dam (Johnson & Vetter) Park, Blanco River 29.94333,-97.90139:
 *       https://www.visitsanmarcos.com/listing/five-mile-dam-johnson-&-vetter-river-park/67/
 *   - Halifax Ranch (NWS Blanco gauge "above at Halifax Ranch near Kyle"),
 *     private — used as a downstream geographic reference only:
 *       https://water.noaa.gov/gauges/hfxt2
 *
 * HIGHLAND LAKES (Colorado River reservoirs, LCRA dam-controlled)
 *   - Mansfield Dam Park, Lake Travis ~30.39222,-97.90722:
 *       https://parks.traviscountytx.gov/parks/mansfield-dam
 *   - Bob Wentz Park at Windy Point 30.41520,-97.89918 (non-motorized launch):
 *       https://parks.traviscountytx.gov/parks/bob-wentz
 *   - Pace Bend Park 30.4471,-98.0291 (Collier & Tatum cove ramps):
 *       https://parks.traviscountytx.gov/parks/pace-bend
 *   - Cypress Creek Park, Lake Travis 30.43687,-97.87362:
 *       https://parks.traviscountytx.gov/parks (Travis County Parks)
 *   - Hippie Hollow Park 30.41278,-97.88333 (clothing-optional; no formal ramp):
 *       https://en.wikipedia.org/wiki/Hippie_Hollow_Park
 *   - Kingsland Slab / Lake LBJ at Kingsland ~30.66300,-98.44020:
 *       https://en.wikipedia.org/wiki/Lake_Lyndon_B._Johnson
 *   - Lakeside Park, Lake Marble Falls (305 Buena Vista Dr; lake 30.55667,-98.25633):
 *       https://marblefallstx.gov/399/Lakeside-Park
 *       https://tpwd.texas.gov/fishboat/fish/recreational/lakes/marble_falls/access.phtml
 *   - Inks Lake State Park boat ramp 30.73111,-98.37056:
 *       https://en.wikipedia.org/wiki/Inks_Lake_State_Park
 *       https://tpwd.texas.gov/state-parks/inks-lake
 *   - Burnet County Park boat ramp, Lake Buchanan (FM 2341 E side; lake 30.75183,-98.41867):
 *       https://tpwd.texas.gov/fishboat/fish/recreational/lakes/buchanan/access.phtml
 *
 * ──────────────────────────────────────────────────────────────────────────
 * CONFIRMED vs ESTIMATED
 * ──────────────────────────────────────────────────────────────────────────
 * CONFIRMED coords (~5 dp, authoritative): all 5 USGS gauges; Castell USGS slab;
 *   Bob Wentz / Windy Point; Hippie Hollow; Cypress Creek Park; Inks Lake SP;
 *   Blue Hole Park Georgetown; Grenwelge Park; Kingsland Slab.
 * APPROX coords (~3-4 dp, derived from park/lake centroid, address, or town —
 *   marked "~approx" in notes): Pedernales Falls SP river put-in, Reimers Ranch
 *   river put-in, Hamilton Pool Rd bridge, LBJ State Park river bank, Robinson
 *   City Park, Mason (Maso-Llan) access, San Gabriel/Chautauqua parks, Granger
 *   launch, Blue Hole Regional (Wimberley), Five Mile Dam, Mansfield Dam ramp,
 *   Pace Bend ramp, Lake LBJ Kingsland, Lakeside Park MF ramp, Burnet County Park.
 *
 * RAIN-DEPENDENCE (critical): the four Hill Country RIVERS are flashy and largely
 *   RAIN-DEPENDENT — they run after rain and can drop to unrunnable scrape in dry
 *   spells. Pedernales is the flashiest (essentially needs recent rain). Llano is
 *   seasonal/rain-fed (good after storms, low in summer). Blanco has spring base
 *   flow but the Wimberley reach still needs rain to float through riffles. San
 *   Gabriel below Lake Georgetown depends on dam release + rain. The HIGHLAND LAKES
 *   are reservoir-level (dam-controlled) and paddleable year-round at flatwater —
 *   subject only to drought drawdown closing low ramps; riverMile for lakes is an
 *   approximate position along the reservoir, NOT a flowing-river distance.
 * FLOW THRESHOLDS (flowLowCfs/flowHighCfs) are paddling-judgment ESTIMATES from
 *   typical runnable floors for these reaches; refine from gauge stats later.
 */

import type { AccessPoint, Gauge } from '../types';

export const accessPoints: AccessPoint[] = [
  // ───────────────────────── Pedernales River ─────────────────────────
  {
    id: 'ped-lbj-state-park',
    name: 'LBJ State Park (Stonewall)',
    type: 'park',
    coords: [30.2375, -98.62611], // ~approx: park along Pedernales near Stonewall
    public: true,
    riverMile: 0,
    amenities: ['parking', 'restrooms', 'shade'],
    notes:
      'Upstream-most reference on the upper Pedernales near Stonewall; day-use park along the river. ~approx river bank coords. Rain-dependent reach.',
    region: 'hill-country',
    waterway: 'Pedernales River',
  },
  {
    id: 'ped-johnson-city-281',
    name: 'US-281 Bridge (Johnson City)',
    type: 'crossing',
    coords: [30.28, -98.41167], // ~approx: US-281 crossing N of Johnson City
    public: true,
    riverMile: 18,
    amenities: ['put-in'],
    notes:
      'Common top put-in for the most-paddled Lower Pedernales run, starting just above US-281 N of Johnson City. ~approx coords; informal access, flashy/rain-dependent flow.',
    region: 'hill-country',
    waterway: 'Pedernales River',
  },
  {
    id: 'ped-falls-sp',
    name: 'Pedernales Falls State Park',
    type: 'park',
    coords: [30.30083, -98.25083], // ~approx: river access at swimming area, NOT the falls
    public: false, // state-park entry fee
    riverMile: 30,
    amenities: ['parking', 'restrooms', 'camping', 'put-in', 'take-out'],
    notes:
      'Iconic Hill Country park. Put in/take out at the swimming area or Trammell\'s Crossing — NOT at the falls (off-limits). Entry fee. ~approx coords; flashy river, check flow before going.',
    region: 'hill-country',
    waterway: 'Pedernales River',
    featured: true,
  },
  {
    id: 'ped-reimers-ranch',
    name: 'Milton Reimers Ranch Park',
    type: 'park',
    coords: [30.32861, -98.13333], // ~approx: river bottom off Hamilton Pool Rd
    public: false, // Travis County day-use fee
    riverMile: 44,
    amenities: ['parking', 'restrooms', 'put-in'],
    notes:
      'Travis County park with Pedernales river access; ask the attendant for the launch — the road down to the river is very steep. Day-use fee. ~approx coords; rain-dependent.',
    region: 'hill-country',
    waterway: 'Pedernales River',
  },
  {
    id: 'ped-hamilton-pool-bridge',
    name: 'Hamilton Pool Rd Bridge (Westcave area)',
    type: 'crossing',
    coords: [30.33944, -98.11667], // ~approx: Bridge #315 Hamilton Pool Rd at Pedernales
    public: true,
    riverMile: 46,
    amenities: ['put-in', 'take-out'],
    notes:
      'Low bridge over the Pedernales near Westcave/Hamilton Pool; informal river access. ~approx coords. Westcave Preserve itself is a guided nature reserve, not a paddling launch.',
    region: 'hill-country',
    waterway: 'Pedernales River',
  },

  // ───────────────────────────── Llano River ─────────────────────────────
  {
    id: 'llano-mason-access',
    name: 'Llano River Access (Mason / Maso-Llan Rd)',
    type: 'crossing',
    coords: [30.69, -99.18], // ~approx: TPWD leased access, Mason County
    public: true,
    riverMile: 0,
    amenities: ['parking', 'put-in'],
    notes:
      'TPWD leased paddler/fishing access on the main-stem Llano in Mason County (Maso-Llan Rd). Upstream-most access here; ~approx coords. Seasonal/rain-fed flow.',
    region: 'hill-country',
    waterway: 'Llano River',
  },
  {
    id: 'llano-castell-crossing',
    name: 'Castell Crossing (FM 2768)',
    type: 'crossing',
    coords: [30.70333, -98.95861], // CONFIRMED: USGS slab "Llano Rv at FM 2768 at Castell"
    public: true,
    riverMile: 24,
    amenities: ['parking', 'put-in', 'take-out'],
    notes:
      'Favorite river ford in Castell with a TPWD paddler launch and ~950 ft of bank access; open dawn-to-dusk, no overnight camping. Popular start for the iconic Castell-to-Llano float.',
    region: 'hill-country',
    waterway: 'Llano River',
    featured: true,
  },
  {
    id: 'llano-grenwelge',
    name: 'Leonard Grenwelge Park (Llano)',
    type: 'park',
    coords: [30.7518, -98.6744], // CONFIRMED: 199 E Haynie St, S bank below dam
    public: true,
    riverMile: 42,
    amenities: ['parking', 'restrooms', 'shade', 'put-in', 'take-out'],
    notes:
      'City park on the south bank below the Llano dam; park beneath the dam to reach calm pool above shallow rapids. Swimming, tubing, fishing and paddling.',
    region: 'hill-country',
    waterway: 'Llano River',
    featured: true,
  },
  {
    id: 'llano-robinson-park',
    name: 'Robinson City Park (Llano)',
    type: 'park',
    coords: [30.755, -98.655], // ~approx: just downstream of Llano, two river access points
    public: true,
    riverMile: 44,
    amenities: ['parking', 'restrooms', 'put-in', 'take-out'],
    notes:
      'City park just outside Llano with two river access points — upper side good for fishing/kayaking, lower side another kayak launch. ~approx coords.',
    region: 'hill-country',
    waterway: 'Llano River',
  },
  {
    id: 'llano-kingsland-slab',
    name: 'Kingsland Slab (FM 3404)',
    type: 'crossing',
    coords: [30.68206, -98.4817], // CONFIRMED: Kingsland Slab on the Llano
    public: true,
    riverMile: 58,
    amenities: ['parking', 'put-in', 'take-out'],
    notes:
      'FM 3404 water crossing where the Llano forms beaches and swimming holes just above its confluence with the Colorado at Lake LBJ. Take-out for the lower Llano. Mild base flow near the lake.',
    region: 'hill-country',
    waterway: 'Llano River',
  },

  // ──────────────────────────── San Gabriel River ────────────────────────────
  {
    id: 'sgr-blue-hole-georgetown',
    name: 'Blue Hole Park (Georgetown)',
    type: 'park',
    coords: [30.64306, -97.68], // CONFIRMED 30.64306,-97.68000
    public: true,
    riverMile: 0,
    amenities: ['parking', 'restrooms', 'shade', 'put-in'],
    notes:
      'Scenic limestone-bluff lagoon on the South Fork San Gabriel, blocks north of the Georgetown square; calm paddling and a popular swim hole. Flow depends on Lake Georgetown release + rain.',
    region: 'hill-country',
    waterway: 'San Gabriel River',
  },
  {
    id: 'sgr-chautauqua-park',
    name: 'Chautauqua Park (Georgetown)',
    type: 'park',
    coords: [30.638, -97.673], // ~approx: trail-linked between Blue Hole & San Gabriel Park
    public: true,
    riverMile: 1.5,
    amenities: ['parking', 'shade'],
    notes:
      'Riverside park on the South Fork, trail-connected to Blue Hole and San Gabriel Park; informal launch. ~approx coords.',
    region: 'hill-country',
    waterway: 'San Gabriel River',
  },
  {
    id: 'sgr-san-gabriel-park',
    name: 'San Gabriel Park (Georgetown)',
    type: 'park',
    coords: [30.64472, -97.67389], // ~approx: confluence of N & S forks, Georgetown
    public: true,
    riverMile: 2.5,
    amenities: ['parking', 'restrooms', 'shade', 'put-in', 'take-out'],
    notes:
      'Large Georgetown park at the meeting of the North and South forks of the San Gabriel; main paddling hub with trail connections. ~approx coords.',
    region: 'hill-country',
    waterway: 'San Gabriel River',
    featured: true,
  },
  {
    id: 'sgr-granger-circleville',
    name: 'Granger Lake / San Gabriel WMA Launch (Circleville)',
    type: 'ramp',
    coords: [30.70167, -97.34056], // ~approx: lake centroid; launch via FM 1331
    public: true,
    riverMile: 20,
    amenities: ['parking', 'ramp'],
    notes:
      'One-lane launch (jon boats / canoes only) into the San Gabriel arm of Granger Lake via FM 1331 near Circleville; free parking. Reservoir-level (USACE dam-controlled). ~approx coords.',
    region: 'hill-country',
    waterway: 'San Gabriel River',
  },

  // ───────────────────────────── Blanco River ─────────────────────────────
  {
    id: 'blanco-state-park',
    name: 'Blanco State Park',
    type: 'park',
    coords: [30.08944, -98.42389], // CONFIRMED 30.08944,-98.42389
    public: false, // state-park entry fee
    riverMile: 0,
    amenities: ['parking', 'restrooms', 'camping', 'shade', 'put-in', 'take-out'],
    notes:
      'Compact state park along a spring-fed mile of the Blanco with small dams and pools — easy flatwater paddling and swimming. Entry fee. Reach still benefits from rain to float through.',
    region: 'hill-country',
    waterway: 'Blanco River',
    featured: true,
  },
  {
    id: 'blanco-wimberley-blue-hole',
    name: 'Blue Hole Regional Park (Wimberley)',
    type: 'park',
    coords: [30.0025, -98.09083], // ~approx 30°00′09″N 98°05′27″W
    public: false, // seasonal paid swim; day-use
    riverMile: 22,
    amenities: ['parking', 'restrooms', 'shade'],
    notes:
      'Famous cypress-lined swimming hole on Cypress Creek near the Blanco in Wimberley; seasonal paid swim access (Mem.-Labor Day). Paddling is on the Blanco nearby, not the swim hole itself. ~approx coords.',
    region: 'hill-country',
    waterway: 'Blanco River',
  },
  {
    id: 'blanco-five-mile-dam',
    name: 'Five Mile Dam Park (Johnson & Vetter)',
    type: 'park',
    coords: [29.94333, -97.90139], // ~approx 29.94333,-97.90139 (NAD83)
    public: true,
    riverMile: 34,
    amenities: ['parking', 'restrooms', 'shade', 'put-in', 'take-out'],
    notes:
      'Hays County river park with ~¼ mile of Blanco access at the old Five Mile Dam; good take-out for the lower Blanco. Halifax Ranch (private NWS gauge site) lies upstream near Kyle. ~approx coords.',
    region: 'hill-country',
    waterway: 'Blanco River',
  },

  // ───────────────── Highland Lakes — Lake Travis (Colorado) ─────────────────
  {
    id: 'travis-mansfield-dam',
    name: 'Mansfield Dam Park (Lake Travis)',
    type: 'ramp',
    coords: [30.39222, -97.90722], // ~approx: dam/park ramp
    public: false, // Travis County day-use fee
    riverMile: 0,
    amenities: ['parking', 'restrooms', 'ramp'],
    notes:
      'Four-lane ramp with ADA courtesy dock at the lower (dam) end of Lake Travis. Reservoir-level (LCRA dam-controlled), paddleable year-round; subject to drought drawdown. ~approx coords.',
    region: 'hill-country',
    waterway: 'Lake Travis',
  },
  {
    id: 'travis-bob-wentz',
    name: 'Bob Wentz Park at Windy Point',
    type: 'park',
    coords: [30.4152, -97.89918], // CONFIRMED 30.4152005,-97.8991779
    public: false, // Travis County day-use fee
    riverMile: 2,
    amenities: ['parking', 'restrooms', 'put-in'],
    notes:
      'Popular kayak/paddleboard and dive cove on Lake Travis; non-motorized hand-launch (no trailered boats). Reservoir-level, year-round flatwater. Day-use fee.',
    region: 'hill-country',
    waterway: 'Lake Travis',
    featured: true,
  },
  {
    id: 'travis-hippie-hollow',
    name: 'Hippie Hollow Park',
    type: 'park',
    coords: [30.41278, -97.88333], // CONFIRMED 30.41278,-97.88333
    public: false, // Travis County fee; adults-only, clothing-optional
    riverMile: 3,
    amenities: ['parking', 'restrooms'],
    notes:
      'Clothing-optional, adults-only (18+) Lake Travis shoreline park; rocky water entry, no formal ramp. Reservoir-level flatwater. Fee.',
    region: 'hill-country',
    waterway: 'Lake Travis',
  },
  {
    id: 'travis-cypress-creek',
    name: 'Cypress Creek Park (Lake Travis)',
    type: 'park',
    coords: [30.43687, -97.87362], // CONFIRMED 30.4368667,-97.8736222
    public: true,
    riverMile: 5,
    amenities: ['parking', 'restrooms', 'ramp'],
    notes:
      'Free LCRA day-use park on a Lake Travis cove with a boat ramp; good calm-water launch. Reservoir-level, year-round; low ramps can close in drought.',
    region: 'hill-country',
    waterway: 'Lake Travis',
  },
  {
    id: 'travis-pace-bend',
    name: 'Pace Bend Park',
    type: 'park',
    coords: [30.4471, -98.0291], // ~approx: park centroid (Collier & Tatum cove ramps)
    public: false, // Travis County day-use fee
    riverMile: 12,
    amenities: ['parking', 'restrooms', 'camping', 'ramp'],
    notes:
      'Large Lake Travis park on a Colorado-River bend with ramps at Collier Cove (west) and Tatum Cove (east), plus primitive shoreline camping. Reservoir-level. ~approx coords; day-use fee.',
    region: 'hill-country',
    waterway: 'Lake Travis',
  },

  // ───────────────── Highland Lakes — Lake LBJ (Colorado) ─────────────────
  {
    id: 'lbj-kingsland',
    name: 'Lake LBJ at Kingsland',
    type: 'ramp',
    coords: [30.663, -98.4402], // ~approx: Lake LBJ at Kingsland cove
    public: true,
    riverMile: 0,
    amenities: ['parking', 'ramp'],
    notes:
      'Lake LBJ access at Kingsland, just below the Llano-Colorado confluence (Kingsland Slab is the river arm). Reservoir-level (LCRA dam-controlled), year-round flatwater. ~approx coords.',
    region: 'hill-country',
    waterway: 'Lake LBJ',
  },

  // ───────────────── Highland Lakes — Lake Marble Falls (Colorado) ─────────────────
  {
    id: 'mf-lakeside-park',
    name: 'Lakeside Park (Lake Marble Falls)',
    type: 'ramp',
    coords: [30.5655, -98.272], // ~approx: 305 Buena Vista Dr, N shore W of US-281
    public: true,
    riverMile: 0,
    amenities: ['parking', 'restrooms', 'ramp', 'shade'],
    notes:
      'City of Marble Falls park and public boat ramp on the north shore of Lake Marble Falls, one block west of US-281. Reservoir-level, year-round flatwater. ~approx coords.',
    region: 'hill-country',
    waterway: 'Lake Marble Falls',
  },

  // ───────────────── Highland Lakes — Inks Lake (Colorado) ─────────────────
  {
    id: 'inks-lake-sp',
    name: 'Inks Lake State Park',
    type: 'park',
    coords: [30.73111, -98.37056], // CONFIRMED 30.73111,-98.37056
    public: false, // state-park entry fee
    riverMile: 0,
    amenities: ['parking', 'restrooms', 'camping', 'ramp', 'shade'],
    notes:
      'Constant-level small reservoir (Inks rarely fluctuates), making it one of the most reliable year-round flatwater paddles in the Highland Lakes. Boat ramp, camping and kayak rentals. Entry fee.',
    region: 'hill-country',
    waterway: 'Inks Lake',
    featured: true,
  },

  // ───────────────── Highland Lakes — Lake Buchanan (Colorado) ─────────────────
  {
    id: 'buchanan-burnet-county-park',
    name: 'Burnet County Park (Lake Buchanan)',
    type: 'ramp',
    coords: [30.79, -98.38], // ~approx: FM 2341, E side mid-lake
    public: true,
    riverMile: 0,
    amenities: ['parking', 'ramp'],
    notes:
      'Two-lane concrete ramp on the east side of Lake Buchanan off FM 2341, usually usable in low water. Largest Highland Lake; reservoir-level, big open water — watch wind. ~approx coords.',
    region: 'hill-country',
    waterway: 'Lake Buchanan',
  },
];

export const gauges: Gauge[] = [
  {
    usgsId: '08153500',
    name: 'Pedernales Rv nr Johnson City, TX',
    coords: [30.29187, -98.39949], // CONFIRMED via USGS site service
    nearestSegmentIds: [],
    region: 'hill-country',
    // Flashiest of the Hill Country rivers — essentially rain-dependent. Floor
    // estimate ~80 cfs to float the gravel reaches; >1500 cfs is pushy/high.
    flowLowCfs: 80,
    flowHighCfs: 1500,
  },
  {
    usgsId: '08151500',
    name: 'Llano Rv at Llano, TX',
    coords: [30.7513, -98.66978], // CONFIRMED
    nearestSegmentIds: [],
    region: 'hill-country',
    // Seasonal/rain-fed; good after storms, low/scrapey in dry summer. Floor
    // estimate ~100 cfs at Llano; >2500 cfs is high water.
    flowLowCfs: 100,
    flowHighCfs: 2500,
  },
  {
    usgsId: '08150700',
    name: 'Llano Rv nr Mason, TX',
    coords: [30.66074, -99.10922], // CONFIRMED
    nearestSegmentIds: [],
    region: 'hill-country',
    // Upper Llano (Mason reach), rain-dependent. Smaller drainage than at Llano;
    // floor estimate ~60 cfs; >1500 cfs is high.
    flowLowCfs: 60,
    flowHighCfs: 1500,
  },
  {
    usgsId: '08104900',
    name: 'S Fk San Gabriel Rv at Georgetown, TX',
    coords: [30.62575, -97.69112], // CONFIRMED
    nearestSegmentIds: [],
    region: 'hill-country',
    // South Fork below Lake Georgetown — depends on dam release + rain; often low.
    // Floor estimate ~40 cfs to paddle the Georgetown reach; >800 cfs is high.
    flowLowCfs: 40,
    flowHighCfs: 800,
  },
  {
    usgsId: '08171000',
    name: 'Blanco Rv at Wimberley, TX',
    coords: [29.99438, -98.08893], // CONFIRMED
    nearestSegmentIds: [],
    region: 'hill-country',
    // Spring base flow but the Wimberley reach still needs rain to float riffles.
    // Floor estimate ~50 cfs; the Blanco flashes hard — >2000 cfs is dangerous high.
    flowLowCfs: 50,
    flowHighCfs: 2000,
  },
];
