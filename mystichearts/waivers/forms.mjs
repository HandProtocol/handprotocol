// The Mystic Hearts waiver suite, version 1 (2026-11-09). These are the exact texts people sign;
// scripts/publish-waivers.mjs publishes them to Kohsi, which stores each version unchanged and
// records which version (and its hash) every person signed. To change a text, copy the form,
// raise its version, and publish: a published version is never edited.
//
// Written to Texas rules (see waivers/README.md): the express negligence doctrine (a release must
// say in plain words that it covers the released parties' own negligence) and the conspicuousness
// requirement (the release must stand out), with gross negligence and intentional harm carved out.
// Drafted without a lawyer; waivers/README.md lists what to ask one. No em dashes (HAND style).
//
// Blocks: h heading, p paragraph, strong conspicuous paragraph, li list item, initial a
// conspicuous paragraph the signer must initial.

const RELEASED_PARTIES =
  'In this agreement, "Mystic Hearts" and "we" mean Mystic Hearts Healing Collective. The "Released Parties" are Mystic Hearts; its founders, members, organizers and resident healers; the owners and occupants of the land where Mystic Hearts gathers in East Austin, Texas; HAND Protocol, which accompanies the collective and runs its website and booking tools; every host, co-host, community partner, practitioner, facilitator, performer, vendor, sponsor and volunteer of a gathering on the land; and each of their officers, directors, employees, agents, insurers, heirs and assigns.';

const LEGAL_DETAILS = [
  { t: 'h', text: 'The legal details' },
  { t: 'li', text: 'Texas law governs this agreement. Any dispute about it belongs in the state or federal courts in Travis County, Texas.' },
  { t: 'li', text: 'If any part of this agreement is found unenforceable, that part is enforced to the fullest extent the law allows and the rest of the agreement stays in full force.' },
  { t: 'li', text: 'This agreement binds me, my heirs, my estate, my executors and anyone who would bring a claim through me.' },
  { t: 'li', text: 'I agree to sign electronically. My typed name (and any signature I draw) is my signature, with the same effect as signing on paper, under the Texas Uniform Electronic Transactions Act and the federal E-SIGN Act. I will receive a complete copy by email and can print or save it. I can ask for a paper copy or withdraw consent to electronic records for future agreements by writing to mysticheartshealing@gmail.com; withdrawing does not undo a signature already given.' },
];

export const FORMS = [
  {
    key: 'land-release',
    version: 1,
    sort: 1,
    kind: 'release',
    validDays: 365,
    title: 'Release and assumption of risk: the land and its gatherings',
    summary: 'The main agreement for anyone 18 or older coming onto the land: the risks of a natural place, what we ask of you, and the release. Good for twelve months.',
    blocks: [
      { t: 'p', text: 'Please read this whole agreement before you sign it. It is a legal document. By signing it you give up rights you would otherwise have, including the right to sue. If anything is unclear, ask us before you sign: mysticheartshealing@gmail.com.' },
      { t: 'p', text: RELEASED_PARTIES },
      { t: 'p', text: 'This agreement covers every time I come onto the land in the twelve months after I sign it: visits, open days, gatherings, workshops, ceremonies, meals, work days, stays and sessions, and the time I spend arriving, parking and leaving ("the Activities").' },

      { t: 'h', text: 'The land is a living, natural place' },
      { t: 'p', text: 'Mystic Hearts gathers on about ten acres of open land, gardens, yurts, houses, a pool and hot tub, a bathhouse, a fire circle and an event lawn. Being here carries real risks, including these:' },
      { t: 'li', text: 'Uneven and changing ground: holes, roots, rocks, slopes, mud, wet grass, steps, decks and paths that are dark at night.' },
      { t: 'li', text: 'Weather: heat and sun, cold, rain, wind, storms and lightning, sometimes without warning.' },
      { t: 'li', text: 'Insects, plants and animals: fire ants, mosquitoes, bees, wasps, scorpions, spiders, snakes, the animals that live on the land, thorns, poison ivy and pollen, any of which can bite, sting or cause an allergic reaction.' },
      { t: 'li', text: 'Water: the pool and hot tub can cause drowning, slips, overheating and infection. Hot water is not safe for everyone, including people who are pregnant or have heart or blood pressure conditions.' },
      { t: 'li', text: 'Fire and heat: the fire circle, candles, lanterns, smoke and hot surfaces can burn people and things.' },
      { t: 'li', text: 'Buildings and structures: yurts, houses, the bathhouse, stairs, platforms, string lights and cords.' },
      { t: 'li', text: 'Food and drink: shared meals and refreshments may be prepared by others and may contain or touch common allergens.' },
      { t: 'li', text: 'Movement and healing practices: dance, yoga, breathwork, sound, meditation, ceremony, bodywork and similar practices can cause strain, dizziness, fainting or strong emotions. Breathwork in particular is not suitable for everyone.' },
      { t: 'li', text: 'Vehicles: cars, carts and parking on grass and gravel.' },
      { t: 'li', text: 'Distance: the land may be farther from emergency help than a city building, and phone signal can be weak.' },
      { t: 'li', text: 'Other people: the actions of other guests, hosts and volunteers.' },
      { t: 'p', text: 'This list is not complete. Other risks, known and unknown, exist.' },

      { t: 'h', text: 'Not medical care' },
      { t: 'p', text: 'The healing arts offered on the land are complementary practices for wellbeing. They are not medical, psychological or psychiatric care and do not diagnose, treat or cure any condition. A practitioner is not acting as a licensed health professional unless they tell me so in writing. I will keep following the advice of my own doctor or therapist, and I will tell a host before I take part if I am pregnant or have a condition that a practice could affect.' },

      { t: 'h', text: 'What I agree to do' },
      { t: 'li', text: 'I take part by my own choice, and I am physically and emotionally able to. I may step out of anything at any time, and I will when I need to.' },
      { t: 'li', text: 'I will follow the hosts\' safety instructions, and the posted rules for the pool, hot tub and fire circle. I will use the pool and hot tub only when a host has opened them, never alone, and never after drinking or using any substance.' },
      { t: 'li', text: 'Mystic Hearts is a sober sanctuary. I will not bring or use alcohol, cannabis or any intoxicating drug on the land, and I will not arrive under their influence. Medicine prescribed to me is fine.' },
      { t: 'li', text: 'I will keep the Community Agreements, ask before touching anyone, and respect a no.' },
      { t: 'li', text: 'I am responsible for my own belongings, and for anyone I bring with me.' },

      { t: 'initial', text: 'ASSUMPTION OF RISK. I HAVE READ THE RISKS ABOVE AND I UNDERSTAND THAT OTHERS EXIST. I KNOWINGLY AND VOLUNTARILY ASSUME ALL RISKS OF THE ACTIVITIES, KNOWN AND UNKNOWN, EVEN IF THEY ARISE FROM THE NEGLIGENCE OF THE RELEASED PARTIES.' },
      { t: 'initial', text: 'RELEASE AND PROMISE NOT TO SUE. TO THE FULLEST EXTENT THE LAW ALLOWS, I RELEASE, WAIVE AND DISCHARGE THE RELEASED PARTIES FROM, AND PROMISE NOT TO SUE THEM FOR, ANY CLAIM, DEMAND OR LIABILITY FOR INJURY, ILLNESS, DEATH, OR LOSS OF OR DAMAGE TO PROPERTY THAT ARISES OUT OF OR RELATES TO THE ACTIVITIES OR MY PRESENCE ON THE LAND, INCLUDING CLAIMS CAUSED IN WHOLE OR IN PART BY THE SOLE, JOINT, CONCURRENT OR COMPARATIVE NEGLIGENCE OF ANY RELEASED PARTY.' },
      { t: 'initial', text: 'INDEMNITY. I WILL DEFEND, INDEMNIFY AND HOLD HARMLESS THE RELEASED PARTIES FROM ANY CLAIM BROUGHT BY ME, MY HEIRS OR ANYONE CLAIMING THROUGH ME, AND FROM ANY CLAIM CAUSED BY MY CONDUCT, ARISING OUT OF THE ACTIVITIES, INCLUDING CLAIMS CAUSED IN WHOLE OR IN PART BY THE NEGLIGENCE OF ANY RELEASED PARTY.' },
      { t: 'p', text: 'Nothing in this agreement releases anyone from liability for gross negligence, or for reckless or intentional harm, or for anything else the law does not allow to be released.' },

      { t: 'h', text: 'Emergencies' },
      { t: 'p', text: 'If I am hurt or ill and cannot decide for myself, I authorize the hosts to call 911, give first aid, and arrange emergency transport and treatment for me. I am responsible for the cost of any treatment and transport. The Released Parties are not required to provide medical care, and nobody on the land is promised to be a medical professional. The emergency contact I give with this agreement may be called.' },

      { t: 'h', text: 'Asking someone to leave' },
      { t: 'p', text: 'Hosts may ask anyone to leave the land for safety or for not keeping these agreements. Any ticket or payment terms are separate from this agreement.' },

      ...LEGAL_DETAILS,

      { t: 'strong', text: 'I HAVE READ THIS AGREEMENT AND I UNDERSTAND IT. I AM 18 OR OLDER. I KNOW I AM GIVING UP SUBSTANTIAL RIGHTS, INCLUDING MY RIGHT TO SUE, AND I SIGN IT FREELY AND VOLUNTARILY.' },
    ],
  },

  {
    key: 'fairy-ball-2026',
    version: 1,
    sort: 2,
    kind: 'event',
    validDays: null,
    title: 'The 1111 Immaculate Fairy Ball, November 11, 2026: event addendum',
    summary: 'The particular risks of a costumed night of bass music, flow arts, sound healing and cacao on the land. Signed together with the land release.',
    blocks: [
      { t: 'p', text: 'This addendum adds to the Release and Assumption of Risk for the land and its gatherings, which I sign at the same time. Every word of that release applies to The 1111 Immaculate Fairy Ball on November 11, 2026 ("the Fairy Ball"), including setting up, arriving, parking and leaving. The Released Parties include the Fairy Ball\'s hosts, co-hosts, community partners, performers, vendors and food donors.' },

      { t: 'h', text: 'What is particular about the Fairy Ball' },
      { t: 'li', text: 'It is a night event. Lighting is low and the ground is harder to see. I will bring a small light or stay on lit paths.' },
      { t: 'li', text: 'Costumes: wings, long hems, capes, masks, headpieces and tall shoes can catch, trip, block vision or catch fire. I will wear what I can move and see in, and keep fabric away from flames.' },
      { t: 'li', text: 'Face paint, glitter, makeup and body art can irritate skin and eyes. I will use my own if I have sensitive skin.' },
      { t: 'li', text: 'Bass music, dancing and crowds: the music is loud and felt in the body, and dancing close together can lead to collisions, falls, overheating and hearing strain. I will bring earplugs if I want them, drink water, and rest when I need to.' },
      { t: 'li', text: 'Flow arts: performers spin hoops, poi, staffs, fans and similar props, some lit and some possibly on fire, which can strike or burn people nearby. I will keep clear of a performer\'s space and only join in with a performer\'s invitation.' },
      { t: 'li', text: 'Sound healing: deep sound and vibration can bring dizziness or strong emotions, and may not suit people with some conditions, including epilepsy or a pacemaker. I may step away at any time.' },
      { t: 'li', text: 'Cacao: ceremonial cacao is served. It contains caffeine and theobromine, can raise heart rate, and can interact with some medicines, including antidepressants (MAOIs and SSRIs). It may not suit people who are pregnant or have heart conditions. I will skip it, or ask my doctor first, if any of this applies to me.' },
      { t: 'li', text: 'Fire and light: candles, lanterns, the fire circle and any fire performance. I will not bring my own open flame, sparklers or fireworks, and I will keep the distance the hosts ask.' },
      { t: 'li', text: 'Food and refreshments may be donated or prepared off site by others and may contain or touch common allergens, including nuts, gluten, dairy, eggs, soy and shellfish. I am responsible for asking what is in something before I eat it, and for bringing what I need if I have an allergy, including any medicine I carry for it.' },
      { t: 'li', text: 'The pool and hot tub are not part of the Fairy Ball. I will stay out of them unless a host has opened them and is present.' },
      { t: 'li', text: 'November nights can be cold and wet. I will dress for it.' },
      { t: 'li', text: 'The Fairy Ball is sober, like every gathering on the land: no alcohol, cannabis or intoxicating drugs.' },
      { t: 'li', text: 'Photographs and video are likely. My photo and video choice in this sitting applies to the Fairy Ball.' },

      { t: 'initial', text: 'I HAVE READ THESE FAIRY BALL RISKS. THEY ARE INCLUDED IN MY ASSUMPTION OF RISK, RELEASE, PROMISE NOT TO SUE AND INDEMNITY IN THE LAND RELEASE, INCLUDING CLAIMS CAUSED IN WHOLE OR IN PART BY THE NEGLIGENCE OF ANY RELEASED PARTY.' },
      { t: 'p', text: 'Ticket, refund and transfer terms are set when the ticket is sold and are separate from this addendum.' },
    ],
  },

  {
    key: 'minor-consent',
    version: 1,
    sort: 3,
    kind: 'minor',
    validDays: 365,
    title: 'Parent or guardian consent and release for a child under 18',
    summary: 'For a parent or legal guardian bringing anyone under 18. One signature covers each child named.',
    blocks: [
      { t: 'p', text: 'I sign this as the parent or legal guardian of each child named with my signature ("my child"). I also sign the Release and Assumption of Risk for the land and its gatherings for myself, and its definitions, risks and legal details apply here. Read the land release with your child in mind: every risk in it applies to children too, and some (water, fire, insects, crowds, the dark) more so.' },

      { t: 'h', text: 'Consent and supervision' },
      { t: 'li', text: 'I give permission for my child to come onto the land and take part in the Activities.' },
      { t: 'li', text: 'I, or another adult I have named to a host, will supervise my child at all times. Mystic Hearts does not provide childcare.' },
      { t: 'li', text: 'My child will not use the pool or hot tub, or go near the fire circle or any flame, unless I am beside them.' },
      { t: 'li', text: 'I have talked with my child about the Community Agreements, including sobriety, consent and respect for the land and its animals, and I am responsible for my child keeping them.' },
      { t: 'li', text: 'I have the legal authority to sign for my child, and I am not aware of anyone with custody who objects.' },

      { t: 'h', text: 'Emergencies' },
      { t: 'p', text: 'If my child is hurt or ill and I cannot be reached right away, I authorize the hosts to call 911, give first aid, and consent to emergency transport and treatment for my child. I am responsible for the cost. I will tell a host before the Activities about any allergy, condition or medicine a responder would need to know.' },

      { t: 'initial', text: 'MY OWN RELEASE. I RELEASE THE RELEASED PARTIES FROM, AND PROMISE NOT TO SUE THEM FOR, ANY CLAIM THAT BELONGS TO ME, INCLUDING CLAIMS FOR MY CHILD\'S MEDICAL EXPENSES AND MY LOSS OF SERVICES, ARISING OUT OF MY CHILD\'S PRESENCE ON THE LAND OR PARTICIPATION IN THE ACTIVITIES, INCLUDING CLAIMS CAUSED IN WHOLE OR IN PART BY THE NEGLIGENCE OF ANY RELEASED PARTY.' },
      { t: 'initial', text: 'ON MY CHILD\'S BEHALF AND INDEMNITY. TO THE FULLEST EXTENT THE LAW ALLOWS, ON MY CHILD\'S BEHALF I ASSUME THE RISKS AND GIVE THE RELEASE IN THE LAND RELEASE. I UNDERSTAND TEXAS LAW MAY NOT LET A PARENT GIVE UP A CHILD\'S OWN CLAIMS IN ADVANCE. I WILL DEFEND, INDEMNIFY AND HOLD HARMLESS THE RELEASED PARTIES FROM ANY CLAIM MADE BY OR FOR MY CHILD ARISING OUT OF THE ACTIVITIES, INCLUDING CLAIMS CAUSED IN WHOLE OR IN PART BY THE NEGLIGENCE OF ANY RELEASED PARTY, TO THE FULLEST EXTENT THE LAW ALLOWS.' },
      { t: 'p', text: 'Nothing here releases anyone from gross negligence or from reckless or intentional harm.' },
      { t: 'strong', text: 'I HAVE READ THIS CONSENT AND RELEASE, I UNDERSTAND IT, AND I SIGN IT FREELY AS THE PARENT OR LEGAL GUARDIAN OF EACH CHILD NAMED.' },
    ],
  },

  {
    key: 'volunteer',
    version: 1,
    sort: 4,
    kind: 'volunteer',
    validDays: 365,
    title: 'Volunteer and work day agreement',
    summary: 'For anyone giving time on the land: work days, building, gardening, setting up and taking down gatherings, and skill exchange.',
    blocks: [
      { t: 'p', text: 'This agreement adds to the Release and Assumption of Risk for the land and its gatherings, which I sign at the same time. Volunteering is one of the Activities it covers.' },

      { t: 'h', text: 'Volunteering, not employment' },
      { t: 'li', text: 'I give my time freely. I am not an employee or contractor of Mystic Hearts or any Released Party, and I expect no wages or pay.' },
      { t: 'li', text: 'Any hours or time credits recorded for my work are a community way of honoring what I give. They are not wages, payment or a promise of anything in return.' },
      { t: 'li', text: 'I am not covered by workers\' compensation insurance through Mystic Hearts. I rely on my own health insurance.' },

      { t: 'h', text: 'The risks of the work' },
      { t: 'li', text: 'Hand and power tools, ladders, lifting and carrying, digging, building, clearing brush, moving furniture and equipment, and working in heat and sun.' },
      { t: 'li', text: 'These can cause cuts, strains, falls, eye injuries, heat illness and worse.' },

      { t: 'h', text: 'What I agree to do' },
      { t: 'li', text: 'I will only do work I am able to do safely, and only use a power tool or ladder I have been shown how to use. I may say no to any task.' },
      { t: 'li', text: 'I will wear closed shoes and the protective gear a task needs (gloves, eye protection, sun protection), drink water, and take breaks.' },
      { t: 'li', text: 'I will tell a host right away about any injury, near miss or hazard I see.' },

      { t: 'initial', text: 'I ASSUME THE RISKS OF VOLUNTEERING AND THE WORK, AND THEY ARE INCLUDED IN MY RELEASE, PROMISE NOT TO SUE AND INDEMNITY IN THE LAND RELEASE, INCLUDING CLAIMS CAUSED IN WHOLE OR IN PART BY THE NEGLIGENCE OF ANY RELEASED PARTY.' },
    ],
  },

  {
    key: 'media',
    version: 1,
    sort: 5,
    kind: 'media',
    validDays: 365,
    title: 'Photo and video choice',
    summary: 'Yes or no to appearing in photos and video the collective shares. Your choice either way; it does not change your welcome.',
    blocks: [
      { t: 'p', text: 'Mystic Hearts sometimes takes photos, video and audio at gatherings to share the work of the collective. You choose whether you are in what we share. Your answer never changes your welcome on the land.' },
      { t: 'h', text: 'If you choose yes' },
      { t: 'li', text: 'You allow Mystic Hearts and HAND Protocol to use photos, video and audio in which you (and any child you sign for) appear, on the collective\'s website, social media, newsletters, printed material and reports to funders, without payment.' },
      { t: 'li', text: 'We will not sell your image or use it to advertise someone else\'s product.' },
      { t: 'li', text: 'You can change your mind at any time by writing to mysticheartshealing@gmail.com. We will stop new uses within a reasonable time and take down what we control where we can; we cannot recall printed material or copies others have already shared.' },
      { t: 'h', text: 'If you choose no' },
      { t: 'li', text: 'We will do our best to keep you out of what we share, and remove you if you find yourself in something. Tell a host at a gathering so photographers know.' },
      { t: 'h', text: 'Always' },
      { t: 'li', text: 'No photos, video or recording during private sessions or ceremony, by anyone. What is shared in the circle stays in the circle.' },
      { t: 'li', text: 'Please ask before you photograph another guest, and do not post anyone else\'s face without their yes.' },
    ],
  },

  {
    key: 'community-agreements',
    version: 1,
    sort: 6,
    kind: 'agreement',
    validDays: 365,
    title: 'Community agreements',
    summary: 'How we live together on the land. Everyone who comes agrees to them.',
    blocks: [
      { t: 'p', text: 'These agreements come from the collective\'s principles: acceptance and inclusivity, sobriety and presence, dedication to healing, non-violent communication, reverence for land and community, self-responsibility, stewardship, reciprocity and confidentiality. They keep the land safe and welcoming for everyone.' },
      { t: 'li', text: 'Sobriety. No alcohol, cannabis or intoxicating drugs on the land, and I will not arrive under their influence.' },
      { t: 'li', text: 'Consent. I ask before I touch anyone, hug included, and I take no for an answer, the first time. A no needs no reason.' },
      { t: 'li', text: 'Respect. I meet every background, body, gender, sexuality and spiritual tradition with an open heart. Harassment, discrimination and threats are never welcome.' },
      { t: 'li', text: 'Confidentiality. What others share in a session or circle stays there.' },
      { t: 'li', text: 'Care with words. I speak for myself, listen, and work through conflict calmly. If I need help, I go to a host.' },
      { t: 'li', text: 'Safety. No weapons on the land. I follow the hosts\' instructions for fire, water and work areas.' },
      { t: 'li', text: 'The land and its animals. I stay on paths at night, leave plants and animals be, pack out what I bring, and put things back where I found them.' },
      { t: 'li', text: 'Neighbors. I keep noise down at arrival and departure, park only where the hosts show me, and drive slowly on the land.' },
      { t: 'li', text: 'Pets. Only with a host\'s permission beforehand.' },
      { t: 'li', text: 'Hosts may ask anyone who does not keep these agreements to leave the land.' },
    ],
  },
];
