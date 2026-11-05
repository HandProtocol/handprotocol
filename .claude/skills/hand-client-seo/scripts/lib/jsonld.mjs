// Structured data: flatten every JSON-LD block into typed nodes and judge
// them against what Google documents for local businesses. There is no
// public API for the Rich Results Test, so these rules stand in for it.
// The type list is schema.org's own LocalBusiness subtree (v29, 2026-09).

export const LOCAL_BUSINESS_TYPES = new Set(`LocalBusiness AccountingService AdultEntertainment AmusementPark AnimalShelter ArchiveOrganization ArtGallery Attorney AutoBodyShop AutoDealer AutoPartsStore AutoRental AutoRepair AutoWash AutomatedTeller AutomotiveBusiness Bakery BankOrCreditUnion BarOrPub BeautySalon BedAndBreakfast BikeStore BookStore BowlingAlley Brewery CafeOrCoffeeShop Campground Casino ChildCare ClothingStore ComedyClub ComputerStore ConvenienceStore CovidTestingFacility DaySpa Dentist DepartmentStore Distillery DryCleaningOrLaundry Electrician ElectronicsStore EmergencyService EmploymentAgency EntertainmentBusiness ExerciseGym FastFoodRestaurant FinancialService FireStation Florist FoodEstablishment FurnitureStore GardenStore GasStation GeneralContractor GolfCourse GovernmentOffice GroceryStore HVACBusiness HairSalon HardwareStore HealthAndBeautyBusiness HealthClub HobbyShop HomeAndConstructionBusiness HomeGoodsStore Hospital Hostel Hotel HousePainter IceCreamShop IndividualPhysician InsuranceAgency InternetCafe JewelryStore LegalService Library LiquorStore Locksmith LodgingBusiness MedicalBusiness MedicalClinic MensClothingStore MobilePhoneStore Motel MotorcycleDealer MotorcycleRepair MovieRentalStore MovieTheater MovingCompany MusicStore NailSalon NightClub Notary OfficeEquipmentStore Optician OutletStore PawnShop PetStore Pharmacy Physician PhysiciansOffice Plumber PoliceStation PostOffice ProfessionalService PublicSwimmingPool RadioStation RealEstateAgent RecyclingCenter Resort Restaurant RoofingContractor SelfStorage ShoeStore ShoppingCenter SkiResort SportingGoodsStore SportsActivityLocation SportsClub StadiumOrArena Store TattooParlor TelevisionStation TennisComplex TireShop TouristInformationCenter ToyStore TravelAgency VacationRental WholesaleStore Winery CommunityHealth Dermatology DietNutrition Emergency Geriatric Gynecologic Midwifery Nursing Obstetric Oncologic Optometric Otolaryngologic Pediatric Physiotherapy PlasticSurgery Podiatric PrimaryCare Psychiatric PublicHealth`.split(/\s+/));

const ORGANIZATION_TYPES = new Set(['Organization', 'Corporation', 'NGO', 'OnlineBusiness', 'OnlineStore', 'EducationalOrganization', 'PerformingGroup', 'SportsOrganization', 'GovernmentOrganization', 'MedicalOrganization', 'NewsMediaOrganization', 'Cooperative', 'Project']);

// Types that make medical claims; wrong for a wellness practitioner without a
// medical licence, and held to a higher bar by Google's quality guidelines.
export const MEDICAL_TYPES = new Set(['MedicalBusiness', 'MedicalClinic', 'Physician', 'IndividualPhysician', 'PhysiciansOffice', 'Hospital', 'Dentist', 'Pharmacy', 'MedicalOrganization', 'Physiotherapy', 'Psychiatric', 'PrimaryCare', 'CommunityHealth', 'Nursing']);

const PLACEHOLDER = /\b(lorem ipsum|todo|tbd|placeholder|your (business|company|name|phone|address)|example\.(com|org)|studio name|coming soon)\b|\[[^\]]{2,40}\]|x{3,}-?x{3,}|555-01\d\d/i;

export function typesOf(node) {
  const raw = node && node['@type'];
  return (Array.isArray(raw) ? raw : raw ? [raw] : []).map((t) => String(t).replace(/^https?:\/\/schema\.org\//, '').replace(/^schema:/, ''));
}

export const isLocalBusiness = (node) => typesOf(node).some((t) => LOCAL_BUSINESS_TYPES.has(t));
export const isOrganization = (node) => typesOf(node).some((t) => ORGANIZATION_TYPES.has(t)) || isLocalBusiness(node);
export const isType = (node, type) => typesOf(node).includes(type);

// Every object carrying an @type, at any depth, with where it sits.
// → [{ node, path, block (index), top (bool: a top-level or @graph entity) }]
export function collectNodes(blocks) {
  const out = [];
  blocks.forEach((block, index) => {
    if (!block || block.data == null) return;
    const walk = (value, path, top) => {
      if (Array.isArray(value)) {
        value.forEach((v, i) => walk(v, `${path}[${i}]`, top));
        return;
      }
      if (!value || typeof value !== 'object') return;
      if (value['@type']) out.push({ node: value, path: path || '$', block: index, top });
      for (const [key, child] of Object.entries(value)) {
        if (key === '@context') continue;
        walk(child, path ? `${path}.${key}` : key, key === '@graph' ? true : false);
      }
    };
    walk(block.data, '', true);
  });
  return out;
}

const present = (v) => !(v == null || v === '' || (Array.isArray(v) && v.length === 0));
const asList = (v) => (Array.isArray(v) ? v : present(v) ? [v] : []);
const isAbsoluteUrl = (v) => typeof v === 'string' && /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(v);
const urlOf = (v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? v.url || v.contentUrl || v['@id'] : null);

function contextProblems(block) {
  const data = block.data;
  const ctx = data && !Array.isArray(data) ? data['@context'] : Array.isArray(data) && data[0] ? data[0]['@context'] : null;
  const flat = JSON.stringify(ctx || '');
  if (!ctx) return 'no @context (it should be "https://schema.org")';
  if (!/schema\.org/i.test(flat)) return `@context is ${flat.slice(0, 60)}, not schema.org`;
  return null;
}

// → [{ level: 'fail'|'warn'|'info', code, message, path }]
// facts: what HAND knows to be true about the business (may be empty);
// a fact that is known but missing from the markup is worth more than a
// generic "recommended property" note.
export function validateBlocks(blocks, { pageUrl = '', facts = {} } = {}) {
  const issues = [];
  const add = (level, code, message, path = '') => issues.push({ level, code, message, path });

  blocks.forEach((block, i) => {
    if (block.error) {
      add('fail', 'jsonld-parse', `JSON-LD block ${i + 1} does not parse: ${block.error}`);
      return;
    }
    const ctx = contextProblems(block);
    if (ctx) add('warn', 'jsonld-context', `JSON-LD block ${i + 1}: ${ctx}`);
  });

  const nodes = collectNodes(blocks.filter((b) => !b.error));
  const scanStrings = (value, path) => {
    if (typeof value === 'string') {
      if (value.trim() === '') add('warn', 'jsonld-empty', `empty string at ${path}: leave the property out instead`, path);
      else if (PLACEHOLDER.test(value) && !/^https?:/i.test(value)) add('fail', 'jsonld-placeholder', `placeholder text in structured data at ${path}: "${value.slice(0, 60)}"`, path);
    } else if (Array.isArray(value)) value.forEach((v, k) => scanStrings(v, `${path}[${k}]`));
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (k !== '@context') scanStrings(v, path ? `${path}.${k}` : k);
  };
  blocks.filter((b) => !b.error).forEach((b) => scanStrings(b.data, ''));

  const businesses = nodes.filter((n) => isLocalBusiness(n.node));
  for (const { node, path } of businesses) {
    const where = path === '$' ? typesOf(node).join('+') : `${typesOf(node).join('+')} at ${path}`;
    if (!present(node.name)) add('fail', 'lb-name', `${where}: "name" is required`, path);
    if (!present(node['@id'])) add('info', 'lb-id', `${where}: add a stable "@id" (for example ${pageUrl ? new URL('/#business', pageUrl).href : '<site>/#business'}) so other nodes can point at the business`, path);
    if (!present(node.url)) add('warn', 'lb-url', `${where}: "url" is missing`, path);
    else if (!isAbsoluteUrl(urlOf(node.url))) add('fail', 'lb-url', `${where}: "url" must be an absolute URL`, path);

    const address = node.address;
    const area = asList(node.areaServed);
    if (!present(address) && area.length === 0) {
      add('warn', 'lb-address', `${where}: neither "address" nor "areaServed". Google lists address as required for local business results; a service-area business should state at least its city/region and areaServed`, path);
    } else if (!present(address)) {
      add('info', 'lb-address', `${where}: no "address". Fine for a service-area business that hides its address; add at least addressLocality + addressRegion + addressCountry once the owner confirms the city`, path);
    } else if (typeof address === 'object' && !Array.isArray(address)) {
      for (const key of ['addressLocality', 'addressRegion', 'addressCountry']) {
        if (!present(address[key])) add('warn', 'lb-address', `${where}: address has no "${key}"`, `${path}.address`);
      }
    }

    if (!present(node.telephone)) add(facts.phone ? 'fail' : 'warn', 'lb-telephone', `${where}: "telephone" is missing${facts.phone ? ' although the site shows a phone number' : ''}`, path);
    else if (!/^\+\d/.test(String(node.telephone).trim())) add('info', 'lb-telephone', `${where}: write "telephone" with the country code ("+1 512 555 0100"); "${String(node.telephone).slice(0, 24)}" has none`, path);

    const imgs = asList(node.image).map(urlOf);
    if (imgs.length === 0) add('warn', 'lb-image', `${where}: "image" is missing`, path);
    else if (imgs.some((u) => !isAbsoluteUrl(u))) add('fail', 'lb-image', `${where}: "image" must be an absolute URL`, path);

    if (!present(node.openingHoursSpecification) && !present(node.openingHours)) add('info', 'lb-hours', `${where}: no opening hours (openingHoursSpecification). Add them once the owner confirms hours; by-appointment businesses can skip this`, path);
    if (!present(node.priceRange)) add('info', 'lb-price', `${where}: no "priceRange"`, path);
    if (present(node.priceRange) && String(node.priceRange).length > 100) add('warn', 'lb-price', `${where}: "priceRange" must be under 100 characters`, path);
    const same = asList(node.sameAs);
    if (same.length === 0) add('info', 'lb-sameas', `${where}: no "sameAs" links (Business Profile, Instagram, Facebook). Add them once the profiles exist`, path);
    else if (same.some((u) => !isAbsoluteUrl(u))) add('fail', 'lb-sameas', `${where}: every "sameAs" must be an absolute URL`, path);
    if (present(node.geo) && typeof node.geo === 'object' && !(Number.isFinite(Number(node.geo.latitude)) && Number.isFinite(Number(node.geo.longitude)))) {
      add('fail', 'lb-geo', `${where}: "geo" needs numeric latitude and longitude`, path);
    }
    if (present(node.aggregateRating) || present(node.review)) {
      add('warn', 'lb-self-review', `${where}: review markup about the business on its own site is "self-serving"; Google shows no stars for it. Remove it or keep it only as plain text`, path);
    }
    if (typesOf(node).some((t) => MEDICAL_TYPES.has(t)) && facts.medical !== true) {
      add('warn', 'lb-medical-type', `${where}: a medical type claims a licensed medical practice. Use it only when the owner holds that licence`, path);
    }
    if (typesOf(node).length === 1 && typesOf(node)[0] === 'LocalBusiness') {
      add('info', 'lb-generic-type', `${where}: plain "LocalBusiness". Google asks for the most specific subtype that fits (AutoRepair, HealthAndBeautyBusiness, Restaurant…)`, path);
    }
  }
  if (businesses.filter((b) => b.top).length > 1) {
    add('warn', 'lb-multiple', `${businesses.filter((b) => b.top).length} top-level LocalBusiness nodes on one page; describe one business per page`);
  }

  for (const { node, path } of nodes.filter((n) => isType(n.node, 'WebSite'))) {
    if (!present(node.name)) add('warn', 'website-name', `WebSite at ${path}: "name" is what Google can use as the site name; it is missing`, path);
    if (!isAbsoluteUrl(urlOf(node.url))) add('warn', 'website-url', `WebSite at ${path}: "url" should be the home page's absolute URL`, path);
  }
  for (const { node, path } of nodes.filter((n) => isType(n.node, 'BreadcrumbList'))) {
    const items = asList(node.itemListElement);
    if (items.length === 0) add('fail', 'breadcrumb-items', `BreadcrumbList at ${path}: no itemListElement`, path);
    items.forEach((it, k) => {
      if (!it || typeof it !== 'object') return;
      if (!present(it.position)) add('fail', 'breadcrumb-position', `BreadcrumbList item ${k + 1}: "position" is required`, path);
      if (!present(it.name) && !(it.item && it.item.name)) add('fail', 'breadcrumb-name', `BreadcrumbList item ${k + 1}: "name" is required`, path);
      if (k < items.length - 1 && !present(urlOf(it.item))) add('fail', 'breadcrumb-item', `BreadcrumbList item ${k + 1}: "item" (the URL) is required for every crumb but the last`, path);
    });
  }
  for (const { node, path } of nodes.filter((n) => isType(n.node, 'FAQPage'))) {
    const qs = asList(node.mainEntity);
    if (qs.length === 0) add('fail', 'faq-items', `FAQPage at ${path}: no questions in mainEntity`, path);
    for (const q of qs) {
      if (!q || !present(q.name) || !q.acceptedAnswer || !present(q.acceptedAnswer.text)) {
        add('fail', 'faq-items', `FAQPage at ${path}: each question needs "name" and acceptedAnswer.text`, path);
        break;
      }
    }
    add('info', 'faq-eligibility', 'FAQPage: Google shows FAQ rich results only for well-known government and health sites; the markup is harmless and still helps other engines read the answers', path);
  }
  for (const { node, path } of nodes.filter((n) => isType(n.node, 'Organization') && !isLocalBusiness(n.node))) {
    if (!present(node.name)) add('warn', 'org-name', `Organization at ${path}: "name" is missing`, path);
    if (!present(node.url)) add('info', 'org-url', `Organization at ${path}: "url" is missing`, path);
    if (present(node.logo) && !isAbsoluteUrl(urlOf(node.logo))) add('fail', 'org-logo', `Organization at ${path}: "logo" must be an absolute URL`, path);
  }

  return { issues, nodes, businesses: businesses.map((b) => b.node) };
}

// One-line description of what a page declares, for reports.
export function describeNodes(nodes) {
  const counts = new Map();
  for (const n of nodes.filter((x) => x.top)) for (const t of typesOf(n.node)) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts].map(([t, c]) => (c > 1 ? `${t}×${c}` : t)).join(', ');
}
