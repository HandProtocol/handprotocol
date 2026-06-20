/**
 * Austin Core paddling corridor — geographic data
 * Covers Lady Bird Lake (Town Lake) downtown, Lake Austin (above Tom Miller Dam),
 * the Colorado River below Longhorn Dam (Austin → Bastrop), Barton Creek, and
 * Onion Creek / McKinney Falls.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SOURCES (verified June 2026)
 * ──────────────────────────────────────────────────────────────────────────
 * - TPWD Lady Bird Lake Paddling Trail (official access GPS: Redbud Trail,
 *   UT Women's/Texas Rowing Center, Cesar Chavez, Barton Creek, Holiday Inn,
 *   IH-35, Festival Beach):
 *     https://tpwd.texas.gov/boating/paddling-trails/hill-country/lady-bird-lake/
 * - TPWD Lady Bird Lake fishing/access list:
 *     https://tpwd.texas.gov/fishboat/fish/recreational/lakes/lady_bird/access.phtml
 * - TPWD Lake Austin access:
 *     https://tpwd.texas.gov/fishboat/fish/recreational/lakes/austin/access.phtml
 * - TPWD Bastrop–Wilbarger Paddling Trail (Utley/FM 969 put-in 30.1683,-97.4023;
 *   Fisherman's Park take-out 30.1119,-97.3250; 14.3 mi):
 *     https://tpwd.texas.gov/boating/paddling-trails/prairies-and-lakes/bastrop-wilbarger
 * - City of Austin Parks — Walsh Boat Landing, Auditorium Shores, Commons Ford,
 *   Emma Long, Roy G. Guerrero Colorado River Metro Park (400 Grove Blvd):
 *     https://www.austintexas.gov/department/walsh-boat-landing
 *     https://www.austintexas.gov/parks/emma-long-metropolitan-park
 *     https://www.austintexas.gov/parks/locations/commons-ford-ranch
 * - Travis County Parks — Mary Quinlan (30.32742,-97.92719), Little Webberville
 *   (30.22949,-97.51896), Webberville (30.20904,-97.49952):
 *     https://parks.traviscountytx.gov/parks/mary-quinlan
 *     https://parks.traviscountytx.gov/parks/little-webberville
 *     https://parks.traviscountytx.gov/parks/webberville
 * - Natural Atlas boat-launch coords — Festival Beach, Walsh Landing
 *   (30.29750,-97.78422), Emma Long ramp (30.32525,-97.84054),
 *   Commons Ford ramp (30.33858,-97.89157):
 *     https://naturalatlas.com/boat-launches/
 * - Outfitters — The Rowing Dock (2418 Stratford Dr), Texas Rowing Center
 *   (1541 W Cesar Chavez), Congress Avenue Kayaks (Waller Creek Boathouse,
 *   74 Trinity St), EpicSUP (2200 S Lakeshore Blvd), Expedition School (Festival
 *   Beach), Zilker Park Boat Rentals (Barton Creek):
 *     https://www.rowingdock.com/  https://www.congresskayaks.com/  https://epicsup.com/
 * - McKinney Falls State Park (5808 McKinney Falls Pkwy) & Onion Creek:
 *     https://tpwd.texas.gov/state-parks/mckinney-falls
 * - Bastrop Fisherman's Park (TPWD/VisitBastrop):
 *     https://www.visitbastrop.com/listing/fishermans-park/965/
 * - USGS Water Services (site coords + realtime check, params 00060/00065):
 *     https://waterservices.usgs.gov/nwis/site/  (siteOutput=expanded)
 *     https://waterservices.usgs.gov/nwis/iv/    (period=P1D)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * CONFIRMED vs ESTIMATED
 * ──────────────────────────────────────────────────────────────────────────
 * CONFIRMED coords (from TPWD/City/County/USGS/Natural Atlas above): all eight
 *   TPWD Lady Bird Lake access points, Walsh Boat Landing, Auditorium Shores,
 *   Mary Quinlan, Emma Long ramp, Commons Ford ramp, Little Webberville,
 *   Webberville, Utley/FM 969, Fisherman's Park (Bastrop), McKinney Falls,
 *   Roy G. Guerrero (400 Grove Blvd), and every USGS gauge.
 * CONFIRMED live gauges (return realtime 00060 discharge + 00065 gage height as
 *   of 2026-06-19): 08158000 (Colorado Rv at Austin), 08155240 (Barton Ck at
 *   Lost Ck Blvd nr Austin — the Loop 360/Lost Creek station), 08159000 (Onion
 *   Ck at US-183), 08158700 (Onion Ck nr Driftwood), 08159200 (Colorado Rv at
 *   Bastrop). NOTE: the official name of 08155240 is "Barton Ck at Lost Ck Blvd",
 *   commonly referred to as the Loop 360 Barton Creek gauge.
 * ESTIMATED (marked ~ in notes, refine later):
 *   - Colorado River miles are downstream from Longhorn Dam (=0), derived from
 *     TPWD/paddling distances ("~24 mi Longhorn→Little Webberville", "~5 mi
 *     Little Webberville→Webberville", Bastrop–Wilbarger Utley→Fisherman's 14.3
 *     mi). Roy Guerrero, Longhorn portage put-in, FM 973/Hornsby Bend miles are
 *     interpolated (~3-4 decimal / ~1-mi confidence).
 *   - Lady Bird Lake & Lake Austin are dam-controlled, constant-level
 *     impoundments: riverMile is an approximate along-lake position (downtown
 *     ref) and "flow" through their gauges is informational, not a runnability
 *     gate. flowLowCfs/flowHighCfs on those gauges are paddling-judgment values.
 *   - A few outfitter/launch points (EpicSUP, Congress Avenue Kayaks/Waller
 *     Beach, Lou Neff/Lou Neff Point, Red Bud Isle ramp, Pennybacker/Loop 360
 *     bank access, Hornsby Bend/FM 973, Barton Creek Loop 360 greenbelt put-in)
 *     use coordinates derived from their published address/landmark (~3-4 decimal
 *     confidence); refine against survey data if found.
 */

import type { AccessPoint, Gauge } from '../types';

export const accessPoints: AccessPoint[] = [
  // ── Lady Bird Lake (Town Lake) — downtown Colorado River impoundment ──────
  {
    id: 'atx-redbud-isle',
    name: 'Red Bud Isle',
    type: 'park',
    coords: [30.2911, -97.7879], // CONFIRMED TPWD "Redbud Trail" access
    public: true,
    riverMile: 0, // upstream end of Lady Bird Lake, just below Tom Miller Dam (lake)
    amenities: ['parking', 'shade', 'put-in', 'dog-park'],
    notes:
      'Island park just below Tom Miller Dam at the upstream (western) end of Lady Bird Lake. Small gravel/bank launch off Redbud Trail; popular quiet put-in away from downtown crowds. Lake — no current.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
    featured: true,
  },
  {
    id: 'atx-walsh-boat-landing',
    name: 'Walsh Boat Landing',
    type: 'ramp',
    coords: [30.2975, -97.78422], // CONFIRMED Natural Atlas / 1600 Scenic Dr
    public: true,
    riverMile: 0.2, // upper Lady Bird Lake (lake)
    amenities: ['parking', 'ramp', 'dock'],
    notes:
      'Concrete boat ramp at 1600 Scenic Dr on the upper end of Lady Bird Lake. City-operated; a launch fee (~$10, card at kiosk) applies. Main hand/trailer launch for the Tom Miller Dam reach. Lake.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
  },
  {
    id: 'atx-rowing-dock',
    name: 'The Rowing Dock',
    type: 'outfitter',
    coords: [30.2658, -97.7720], // ~2418 Stratford Dr (published address)
    public: false,
    riverMile: 0.5, // Lady Bird Lake near Lou Neff / Stratford (lake)
    amenities: ['parking', 'rentals', 'restrooms', 'dock'],
    notes:
      'Kayak / SUP / canoe / paddleboat rental and launch at 2418 Stratford Dr near Lou Neff Point. Fee/rental dock; easy access to the western basin and Barton Creek inlet. Lake.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
  },
  {
    id: 'atx-lou-neff-point',
    name: 'Lou Neff Point',
    type: 'park',
    coords: [30.2648, -97.7716], // derived from Lou Neff Rd / Stratford peninsula
    public: true,
    riverMile: 0.6, // Lady Bird Lake (lake)
    amenities: ['parking', 'shade'],
    notes:
      'Grassy point on the south shore where Barton Creek meets the lake, by the Zilker hike-and-bike trail. Bank/grass launch; scenic skyline views. ~Coords from landmark. Lake.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
  },
  {
    id: 'atx-zilker-boat-rentals',
    name: 'Zilker Park Boat Rentals (Barton Creek)',
    type: 'outfitter',
    coords: [30.2642, -97.7681], // CONFIRMED TPWD "Barton Creek" access
    public: false,
    riverMile: 0.7, // Barton Creek mouth at Lady Bird Lake (lake)
    amenities: ['parking', 'rentals', 'restrooms'],
    notes:
      'Long-running canoe/kayak rental at the Barton Creek inlet by Zilker Park. Sits at the TPWD "Barton Creek" trail access; gentle launch into the lake. Lake.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
  },
  {
    id: 'atx-texas-rowing-center',
    name: 'Texas Rowing Center',
    type: 'outfitter',
    coords: [30.2719, -97.769], // CONFIRMED TPWD / 1541 W Cesar Chavez
    public: false,
    riverMile: 0.9, // Lady Bird Lake north shore (lake)
    amenities: ['parking', 'rentals', 'restrooms', 'dock'],
    notes:
      'Rowing/SUP/kayak outfitter at 1541 W Cesar Chavez on the north shore. Floating-dock launch; rentals and lessons. Lake.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
  },
  {
    id: 'atx-ut-rowing-center',
    name: "UT Women's Rowing Center",
    type: 'ramp',
    coords: [30.2748, -97.7745], // CONFIRMED TPWD access
    public: true,
    riverMile: 1.0, // Lady Bird Lake (lake)
    amenities: ['parking', 'dock'],
    notes:
      'TPWD-listed access near the UT rowing facility on the north shore. Dock/bank launch. Lake.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
  },
  {
    id: 'atx-auditorium-shores',
    name: 'Auditorium Shores',
    type: 'ramp',
    coords: [30.2616, -97.754], // CONFIRMED 800 W Riverside Dr
    public: true,
    riverMile: 1.6, // Lady Bird Lake, central basin (lake)
    amenities: ['parking', 'ramp', 'shade'],
    notes:
      'Big grassy south-shore park (800 W Riverside) with a concrete launch into the central basin. Skyline and bat-bridge views; free parking, can be busy. Lake.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
    featured: true,
  },
  {
    id: 'atx-congress-ave-kayaks',
    name: 'Congress Avenue Kayaks (Waller Beach)',
    type: 'outfitter',
    coords: [30.2549, -97.7398], // Waller Creek Boathouse, 74 Trinity St (address)
    public: false,
    riverMile: 2.4, // Lady Bird Lake, downtown by Congress bridge (lake)
    amenities: ['parking', 'rentals', 'restrooms', 'dock'],
    notes:
      "Downtown's main rental dock at the Waller Creek Boathouse, 74 Trinity St (Waller Beach), steps from Rainey St. Best launch for the Congress Ave bat bridge. Fee/rental. ~Coords from address. Lake.",
    region: 'austin',
    waterway: 'Lady Bird Lake',
    featured: true,
  },
  {
    id: 'atx-festival-beach',
    name: 'Festival Beach Canoe Launch',
    type: 'ramp',
    coords: [30.2483, -97.7278], // CONFIRMED TPWD "Festival Beach" access
    public: true,
    riverMile: 3.2, // Lady Bird Lake, east end (lake)
    amenities: ['parking', 'ramp', 'rentals', 'restrooms'],
    notes:
      'Larger, less-crowded ramp on the NE shore at the end of Nash Hernandez Sr Rd (Holly Shores / Edward Rendon Sr Park). Free parking; Expedition School rents here. Lake.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
    featured: true,
  },
  {
    id: 'atx-holly-shores',
    name: 'Holly Shores / Edward Rendon Sr Park',
    type: 'park',
    coords: [30.2503, -97.7295], // east-end shoreline park (derived)
    public: true,
    riverMile: 3.4, // Lady Bird Lake, east end near Holly (lake)
    amenities: ['parking', 'shade', 'restrooms'],
    notes:
      'East-end metro park (a.k.a. Fiesta Gardens/Holly Shores) wrapping the NE shore; bank access and the Festival Beach ramp sit within it. ~Coords from park footprint. Lake.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
  },
  {
    id: 'atx-epicsup',
    name: 'EpicSUP (South Lakeshore)',
    type: 'outfitter',
    coords: [30.2456, -97.7236], // 2200 S Lakeshore Blvd (address)
    public: false,
    riverMile: 3.6, // Lady Bird Lake, SE shore near Longhorn Dam (lake)
    amenities: ['parking', 'rentals', 'dock'],
    notes:
      'SUP/kayak rental on the SE shore at 2200 S Lakeshore Blvd (South Shore District), near the lower lake and Longhorn Dam. Fee/rental dock. ~Coords from address. Lake.',
    region: 'austin',
    waterway: 'Lady Bird Lake',
  },

  // ── Lake Austin — above Tom Miller Dam ───────────────────────────────────
  {
    id: 'atx-emma-long',
    name: 'Emma Long Metro Park',
    type: 'park',
    coords: [30.32525, -97.84054], // CONFIRMED Natural Atlas ramp / 1600 City Park Rd
    public: true,
    riverMile: 0, // Lake Austin, lower-mid (lake; downstream ref)
    amenities: ['parking', 'ramp', 'restrooms', 'shade', 'campground', 'swimming'],
    notes:
      "Austin's oldest metro park (1600 City Park Rd) with a paved ramp, campsites and a swim area on Lake Austin. Entry/launch fee. Lake — dam-controlled, no current.",
    region: 'austin',
    waterway: 'Lake Austin',
    featured: true,
  },
  {
    id: 'atx-commons-ford',
    name: 'Commons Ford Ranch Metro Park',
    type: 'park',
    coords: [30.33858, -97.89157], // CONFIRMED Natural Atlas ramp / 614 N Commons Ford Rd
    public: true,
    riverMile: 2, // Lake Austin, mid (lake)
    amenities: ['parking', 'ramp', 'restrooms', 'shade', 'dock'],
    notes:
      'Quiet 215-acre ranch park (614 N Commons Ford Rd) with a boat ramp, fishing dock and restored prairie. Less busy launch on the mid lake. Lake.',
    region: 'austin',
    waterway: 'Lake Austin',
  },
  {
    id: 'atx-pennybacker-360',
    name: 'Loop 360 / Pennybacker Bridge Access',
    type: 'crossing',
    coords: [30.3582, -97.8038], // Pennybacker (Loop 360) bridge over Lake Austin
    public: true,
    riverMile: 4, // Lake Austin, upper-mid (lake)
    amenities: ['parking', 'shade'],
    notes:
      'Bank/shoulder access near the iconic Pennybacker (Loop 360) bridge; informal hand-launch and overlook. Limited parking, no ramp. ~Coords from bridge. Lake.',
    region: 'austin',
    waterway: 'Lake Austin',
  },
  {
    id: 'atx-mary-quinlan',
    name: 'Mary Quinlan Park',
    type: 'ramp',
    coords: [30.32742, -97.92719], // CONFIRMED Travis County / 1601 Quinlan Park Rd S
    public: true,
    riverMile: 6, // Lake Austin, upper reaches (lake)
    amenities: ['parking', 'ramp', 'shade'],
    notes:
      'Free single-lane concrete ramp (1601 Quinlan Park Rd S), the only public ramp for several miles on the upper lake. Travis County; sunrise–10pm. Lake.',
    region: 'austin',
    waterway: 'Lake Austin',
    featured: true,
  },

  // ── Colorado River — below Longhorn Dam (Austin → Bastrop) ───────────────
  {
    id: 'atx-longhorn-dam',
    name: 'Longhorn Dam / Pleasant Valley Put-in',
    type: 'dam-portage',
    coords: [30.2429, -97.7158], // Longhorn Dam at Pleasant Valley Rd (derived)
    public: true,
    riverMile: 0, // Colorado River below Longhorn Dam = mile 0
    amenities: ['parking', 'put-in'],
    notes:
      'Below Longhorn Dam (Pleasant Valley Rd) — top put-in for the placid 20+ mi Colorado run to Webberville. Park at Roy Guerrero and trail in; releases vary, low flow means dragging. ~Coords from dam.',
    region: 'austin',
    waterway: 'Colorado River',
    featured: true,
  },
  {
    id: 'atx-roy-guerrero',
    name: 'Roy G. Guerrero Colorado River Park',
    type: 'park',
    coords: [30.2411, -97.7077], // CONFIRMED 400 Grove Blvd (park access)
    public: true,
    riverMile: 0.5, // just downstream of Longhorn Dam, south bank
    amenities: ['parking', 'restrooms', 'shade', 'trails'],
    notes:
      "363-acre metro park (400 Grove Blvd) on the south bank just below Longhorn Dam. Preferred parking + trail access to the river put-in; disc golf, trails, no formal ramp.",
    region: 'austin',
    waterway: 'Colorado River',
  },
  {
    id: 'atx-hornsby-fm973',
    name: 'FM 973 Bridge (Hornsby Bend)',
    type: 'crossing',
    coords: [30.2185, -97.6388], // FM 973 bridge over Colorado near Hornsby Bend (derived)
    public: true,
    riverMile: 4.8, // ~portage/access ~4.75 mi below Longhorn (TPWD note)
    amenities: ['parking'],
    notes:
      'Limited roadside hand-launch at the FM 973 bridge below the Hornsby Bend facility. Rough access over uneven ground; a low-head dam portage (river-left) sits in this reach. ~Coords from bridge.',
    region: 'austin',
    waterway: 'Colorado River',
  },
  {
    id: 'atx-little-webberville',
    name: 'Little Webberville Park',
    type: 'park',
    coords: [30.22949, -97.51896], // CONFIRMED Travis County
    public: true,
    riverMile: 24, // ~24 mi below Longhorn Dam (TPWD/paddling distance)
    amenities: ['parking', 'ramp', 'restrooms', 'shade', 'playground'],
    notes:
      'Travis County riverside park on Park Lane off Webberville Dr with a boat ramp, playscape and picnic tables. Common take-out for the long Longhorn→Webberville float.',
    region: 'austin',
    waterway: 'Colorado River',
    featured: true,
  },
  {
    id: 'atx-webberville-park',
    name: 'Webberville Park',
    type: 'park',
    coords: [30.20904, -97.49952], // CONFIRMED Travis County
    public: true,
    riverMile: 29, // ~5 mi below Little Webberville
    amenities: ['parking', 'ramp', 'restrooms', 'shade', 'camping'],
    notes:
      'Popular paved ramp in far-east Travis County (Webberville), used by motorboaters and canoeists alike. Restrooms, picnic, primitive camping nearby.',
    region: 'austin',
    waterway: 'Colorado River',
  },
  {
    id: 'atx-utley-fm969',
    name: 'Utley / FM 969 Bridge',
    type: 'ramp',
    coords: [30.1683, -97.4023], // CONFIRMED TPWD Bastrop–Wilbarger put-in
    public: true,
    riverMile: 35, // upstream end of Bastrop–Wilbarger trail (14.3 mi above Fisherman's)
    amenities: ['parking', 'ramp'],
    notes:
      'TPWD boat ramp at the FM 969 bridge NW of Bastrop — put-in for the 14.3-mi Bastrop–Wilbarger Paddling Trail down to Fisherman’s Park.',
    region: 'austin',
    waterway: 'Colorado River',
  },
  {
    id: 'atx-fishermans-park-bastrop',
    name: "Fisherman's Park (Bastrop)",
    type: 'park',
    coords: [30.1119, -97.325], // CONFIRMED TPWD / downtown Bastrop
    public: true,
    riverMile: 49.3, // Bastrop, take-out of Bastrop–Wilbarger (35 + 14.3)
    amenities: ['parking', 'ramp', 'restrooms', 'shade', 'dock', 'playground'],
    notes:
      'Downtown Bastrop river park (Farm & Willow St) with boat landing, dock and fishing pier. Take-out for Bastrop–Wilbarger and put-in for the El Camino Real trail downstream.',
    region: 'austin',
    waterway: 'Colorado River',
    featured: true,
  },

  // ── Barton Creek ─────────────────────────────────────────────────────────
  {
    id: 'atx-barton-creek-360',
    name: 'Barton Creek Greenbelt (Loop 360 Put-in)',
    type: 'park',
    coords: [30.24389, -97.80972], // Loop 360 greenbelt trailhead (derived)
    public: true,
    riverMile: 0, // Barton Creek, Loop 360 reach (creek)
    amenities: ['parking', 'shade', 'trails'],
    notes:
      'Greenbelt trailhead by the Loop 360 bridge — seasonal whitewater put-in (up to Class III when Barton Creek runs after rain). Flow-dependent; dry most of the year. ~Coords from trailhead.',
    region: 'austin',
    waterway: 'Barton Creek',
  },
  {
    id: 'atx-barton-springs',
    name: 'Barton Springs / Barton Creek Mouth',
    type: 'park',
    coords: [30.2642, -97.7713], // lower Barton Creek into Lady Bird Lake (derived)
    public: true,
    riverMile: 3, // lower Barton Creek near Zilker (creek)
    amenities: ['parking', 'restrooms', 'shade', 'swimming'],
    notes:
      'Lower Barton Creek below Barton Springs Pool, flowing into Lady Bird Lake at Zilker. Flatwater paddling on the always-wet lower reach; the spring pool itself is swim-only. ~Coords from area.',
    region: 'austin',
    waterway: 'Barton Creek',
  },

  // ── Onion Creek / McKinney Falls ─────────────────────────────────────────
  {
    id: 'atx-mckinney-falls',
    name: 'McKinney Falls State Park (Onion Creek)',
    type: 'park',
    coords: [30.18461, -97.72533], // CONFIRMED 5808 McKinney Falls Pkwy
    public: true,
    riverMile: 0, // Onion Creek within the park (creek)
    amenities: ['parking', 'restrooms', 'shade', 'camping', 'trails', 'swimming'],
    notes:
      'State park on Onion Creek (5808 McKinney Falls Pkwy). Flatwater kayaking/SUP on the creek pools below the falls when flow allows; SUP not permitted in the falls/swim area. Entry fee.',
    region: 'austin',
    waterway: 'Onion Creek',
    featured: true,
  },
];

export const gauges: Gauge[] = [
  {
    usgsId: '08158000',
    name: 'Colorado Rv at Austin, TX',
    coords: [30.24614, -97.68006], // CONFIRMED USGS expanded site
    nearestSegmentIds: [],
    region: 'austin',
    flowLowCfs: 150, // below Longhorn Dam reach can get scrapey/draggy
    flowHighCfs: 8000, // high/fast water; flood caution above this
  },
  {
    usgsId: '08155240',
    name: 'Barton Ck at Lost Ck Blvd nr Austin, TX (Loop 360)',
    coords: [30.2741, -97.84475], // CONFIRMED USGS expanded site
    nearestSegmentIds: [],
    region: 'austin',
    flowLowCfs: 50, // flashy hill-country creek; runnable only after rain
    flowHighCfs: 1500, // high/dangerous flash-flow above this
  },
  {
    usgsId: '08159000',
    name: 'Onion Ck at US Hwy 183, Austin, TX',
    coords: [30.17799, -97.68861], // CONFIRMED USGS expanded site
    nearestSegmentIds: [],
    region: 'austin',
    flowLowCfs: 40, // flashy; low/dry most of the year
    flowHighCfs: 1200, // flash-flood caution above this
  },
  {
    usgsId: '08158700',
    name: 'Onion Ck nr Driftwood, TX',
    coords: [30.08299, -98.00779], // CONFIRMED USGS expanded site (upper Onion Ck)
    nearestSegmentIds: [],
    region: 'austin',
    flowLowCfs: 20, // upper headwater gauge; very flashy
    flowHighCfs: 800,
  },
  {
    usgsId: '08159200',
    name: 'Colorado Rv at Bastrop, TX',
    coords: [30.10466, -97.31944], // CONFIRMED USGS expanded site
    nearestSegmentIds: [],
    region: 'austin',
    flowLowCfs: 150, // Austin→Bastrop float; low = dragging
    flowHighCfs: 9000, // high/fast water caution above this
  },
];
