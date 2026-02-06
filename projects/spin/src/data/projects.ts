import { wheelCategories } from './categories';

export interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  link: string;
}

// This is a placeholder array. You can replace it with your 117 projects.
export const projects: Project[] = [
  {
    id: '1',
    name: 'nisria',
    description: 'Supporting humanitarian efforts and community development.',
    category: 'ALL',
    link: 'https://giveth.io/project/nisria'
  },
  {
    id: '2',
    name: 'PCRF - Palestine Children\'s Relief Fund',
    description: 'Providing medical care and humanitarian support for children.',
    category: 'ALL',
    link: 'https://giveth.io/project/pcrf-palestine-childrens-relief-fund'
  },
  {
    id: '3',
    name: 'Green Digital Guardians',
    description: 'Protecting and promoting digital environmental initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/green-digital-guardians'
  },
  {
    id: '4',
    name: 'Whispers Magical Childrens Hospital and Maternity',
    description: 'Providing healthcare services for children and mothers.',
    category: 'ALL',
    link: 'https://giveth.io/project/whispers-magical-childrens-hospital-and-maternity'
  },
  {
    id: '5',
    name: 'ReFi DAO | Unlocking a Global Regen CoordiNATION',
    description: 'Coordinating global regenerative finance initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/refi-dao-unlocking-a-global-regen-coordination'
  },
  {
    id: '6',
    name: 'Funding the Commons',
    description: 'Supporting public goods and commons-based projects.',
    category: 'ALL',
    link: 'https://giveth.io/project/funding-the-commons'
  },
  {
    id: '7',
    name: 'Follow The Black Hare',
    description: 'Creative and artistic initiatives in the web3 space.',
    category: 'ALL',
    link: 'https://giveth.io/project/follow-the-black-hare'
  },
  {
    id: '8',
    name: 'Nexth starter kit - quickly ship Web3 Apps',
    description: 'Development toolkit for rapid Web3 application deployment.',
    category: 'ALL',
    link: 'https://giveth.io/project/nexth-starter-kit-quickly-ship-web3-apps'
  },
  {
    id: '9',
    name: 'Defend Roman Storm',
    description: 'Supporting legal defense in the cryptocurrency space.',
    category: 'ALL',
    link: 'https://giveth.io/project/defend-roman-storm'
  },
  {
    id: '10',
    name: 'Anticlub House - Empowering Mexico\'s Artistic Community',
    description: 'Supporting artists and creative initiatives in Mexico.',
    category: 'ALL',
    link: 'https://giveth.io/project/anticlub-house-empowering-mexicos-artistic-community'
  },
  {
    id: '11',
    name: 'AgroforestDAO',
    description: 'Promoting sustainable agroforestry practices through DAO governance.',
    category: 'ALL',
    link: 'https://giveth.io/project/agroforestdao'
  },
  {
    id: '12',
    name: 'Flow State',
    description: 'Exploring and promoting optimal performance states.',
    category: 'ALL',
    link: 'https://giveth.io/project/flow-state'
  },
  {
    id: '13',
    name: '1Hive Gardens',
    description: 'Building sustainable crypto-economic communities.',
    category: 'ALL',
    link: 'https://giveth.io/project/1hive-gardens-0'
  },
  {
    id: '14',
    name: 'BrightID Proof of Uniqueness',
    description: 'Developing decentralized identity verification solutions.',
    category: 'ALL',
    link: 'https://giveth.io/project/brightid-proof-of-uniqueness'
  },
  {
    id: '15',
    name: 'Greenpill Dev Guild',
    description: 'Supporting developers working on environmental solutions.',
    category: 'ALL',
    link: 'https://giveth.io/project/greenpill-dev-guild'
  },
  {
    id: '16',
    name: 'The GreenPill Network',
    description: 'Connecting and empowering environmental initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/the-greenpill-network'
  },
  {
    id: '17',
    name: 'MesoReefDAO - Regenerating Reef Conservation with DeSci',
    description: 'Scientific approach to coral reef conservation.',
    category: 'ALL',
    link: 'https://giveth.io/project/mesoreefdao-regenerating-reef-conservation-with-desci'
  },
  {
    id: '18',
    name: 'Greenpill Brasil',
    description: 'Environmental initiatives in Brazil.',
    category: 'ALL',
    link: 'https://giveth.io/project/greenpill-brasil'
  },
  {
    id: '19',
    name: 'GreenSofa | GreenPill Taiwan',
    description: 'Environmental initiatives in Taiwan.',
    category: 'ALL',
    link: 'https://giveth.io/project/greensofa-greenpill-taiwan'
  },
  {
    id: '20',
    name: 'Blocktrend',
    description: 'Analyzing and reporting on blockchain trends.',
    category: 'ALL',
    link: 'https://giveth.io/project/blocktrend'
  },
  {
    id: '21',
    name: 'Web3Wire',
    description: 'News and information about Web3 developments.',
    category: 'ALL',
    link: 'https://giveth.io/project/web3wire'
  },
  {
    id: '22',
    name: 'growthepie - Analytics for Ethereum Scaling Solutions',
    description: 'Data analytics for Ethereum scaling solutions.',
    category: 'ALL',
    link: 'https://giveth.io/project/growthepie-analytics-for-ethereum-scaling-solutions'
  },
  {
    id: '23',
    name: 'Emprende DAO',
    description: 'Supporting entrepreneurship through DAO structures.',
    category: 'ALL',
    link: 'https://giveth.io/project/emprende-dao'
  },
  {
    id: '24',
    name: 'PinSave - decentalized image sharing platform',
    description: 'Decentralized platform for image sharing and storage.',
    category: 'ALL',
    link: 'https://giveth.io/project/pinsave-decentalized-image-sharing-platform'
  },
  {
    id: '25',
    name: '$Earth',
    description: 'Environmental conservation through tokenization.',
    category: 'ALL',
    link: 'https://giveth.io/project/earth'
  },
  {
    id: '26',
    name: 'Decentralized Cleanup Network',
    description: 'Coordinating environmental cleanup efforts.',
    category: 'ALL',
    link: 'https://giveth.io/project/decentralized-cleanup'
  },
  {
    id: '27',
    name: 'Skatehive Skateboarding Community',
    description: 'Supporting skateboarding culture and community.',
    category: 'ALL',
    link: 'https://giveth.io/project/skatehive-skateboarding-community'
  },
  {
    id: '28',
    name: 'GnarsDAO',
    description: 'Action sports and community governance.',
    category: 'ALL',
    link: 'https://giveth.io/project/gnars-dao'
  },
  {
    id: '29',
    name: 'EcoSynthesisX Real World Impact tokenization',
    description: 'Tokenizing real-world environmental impact.',
    category: 'ALL',
    link: 'https://giveth.io/project/ecosynthesisx-real-world-impact-tokenization'
  },
  {
    id: '30',
    name: 'ReFi Phangan Empowering Regenerative Future',
    description: 'Regenerative finance initiatives in Koh Phangan.',
    category: 'ALL',
    link: 'https://giveth.io/project/refi-phangan-empowering-regenerative-future'
  },
  {
    id: '31',
    name: 'Bankless Academy',
    description: 'Education platform for decentralized finance.',
    category: 'ALL',
    link: 'https://giveth.io/project/bankless-academy'
  },
  {
    id: '32',
    name: 'Green Planet Ecosystem Conservation Network',
    description: 'Network for ecosystem conservation efforts.',
    category: 'ALL',
    link: 'https://giveth.io/project/green-planet-ecosystem-conservation-network'
  },
  {
    id: '33',
    name: 'Regens Unite',
    description: 'Uniting regenerative projects and initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/regens-unite'
  },
  {
    id: '34',
    name: 'MASQ Network',
    description: 'Privacy-focused networking solution.',
    category: 'ALL',
    link: 'https://giveth.io/project/masq-network'
  },
  {
    id: '35',
    name: 'Hand Protocol',
    description: 'Decentralized protocol development.',
    category: 'ALL',
    link: 'https://giveth.io/project/handprotocol'
  },
  {
    id: '36',
    name: 'DexAppBuilder - The no-code/low-code toolkit of DexKit',
    description: 'Tools for building decentralized applications.',
    category: 'ALL',
    link: 'https://giveth.io/project/dexappbuilder-the-nocodelow-code-toolkit-of-dexkit'
  },
  {
    id: '37',
    name: 'CARBON Copy',
    description: 'Carbon offset and environmental initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/carbon-copy'
  },
  {
    id: '38',
    name: 'Ethereum Mexico',
    description: 'Supporting Ethereum ecosystem in Mexico.',
    category: 'ALL',
    link: 'https://giveth.io/project/ethereum-mexico'
  },
  {
    id: '39',
    name: 'MonkeyBee Festival for a Diverse & Inclusive Community',
    description: 'Promoting diversity and inclusion through festivals.',
    category: 'ALL',
    link: 'https://giveth.io/project/monkeybee-festival-for-a-diverse-inclusive-community'
  },
  {
    id: '40',
    name: 'Atlantis',
    description: 'Ocean conservation and marine ecosystem protection.',
    category: 'ALL',
    link: 'https://giveth.io/project/atlantis'
  },
  {
    id: '41',
    name: 'The Solar Foundation',
    description: 'Promoting solar energy adoption.',
    category: 'ALL',
    link: 'https://giveth.io/project/the-solar-foundation'
  },
  {
    id: '42',
    name: 'Climate Education & Regenerative Ag practices in Uganda',
    description: 'Educational initiatives for sustainable agriculture.',
    category: 'ALL',
    link: 'https://giveth.io/project/climate-education-regenerative-ag-practices-in-uganda'
  },
  {
    id: '43',
    name: 'Web3Brand',
    description: 'Building brands in the Web3 space.',
    category: 'ALL',
    link: 'https://giveth.io/project/web3brand'
  },
  {
    id: '44',
    name: 'DeSci Asia',
    description: 'Decentralized science initiatives in Asia.',
    category: 'ALL',
    link: 'https://giveth.io/project/desci-asia'
  },
  {
    id: '45',
    name: 'ArchiveHK - Safeguard Hong Kong\'s history',
    description: 'Preserving historical records and cultural heritage.',
    category: 'ALL',
    link: 'https://giveth.io/project/archivehk-safeguard-hong-kongs-history'
  },
  {
    id: '46',
    name: 'Gravity DAO',
    description: 'Decentralized autonomous organization initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/gravity-dao'
  },
  {
    id: '47',
    name: 'Giveth House',
    description: 'Supporting charitable giving in the crypto space.',
    category: 'ALL',
    link: 'https://giveth.io/project/giveth-house'
  },
  {
    id: '48',
    name: 'ETH CALI',
    description: 'Ethereum community building in California.',
    category: 'ALL',
    link: 'https://giveth.io/project/eth-cali'
  },
  {
    id: '49',
    name: 'Change Code',
    description: 'Programming for social impact.',
    category: 'ALL',
    link: 'https://giveth.io/project/change-code'
  },
  {
    id: '50',
    name: 'The Traditional Dream Factory',
    description: 'Preserving traditional knowledge and practices.',
    category: 'ALL',
    link: 'https://giveth.io/project/the-traditional-dream-factory'
  },
  {
    id: '51',
    name: 'Meetwith',
    description: 'Decentralized meeting and event platform.',
    category: 'ALL',
    link: 'https://giveth.io/project/meetwithwallet'
  },
  {
    id: '52',
    name: 'RnDAO',
    description: 'Research and development DAO initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/rndao'
  },
  {
    id: '53',
    name: 'ReFi Medellin',
    description: 'Regenerative finance initiatives in Medellin.',
    category: 'ALL',
    link: 'https://giveth.io/project/refi-medellin'
  },
  {
    id: '54',
    name: 'Rifai Sicilia',
    description: 'Community development in Sicily.',
    category: 'ALL',
    link: 'https://giveth.io/project/rifai-sicilia'
  },
  {
    id: '55',
    name: 'Edu Chain',
    description: 'Blockchain education initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/edu-chain'
  },
  {
    id: '56',
    name: 'Carbon Counting Club',
    description: 'Tracking and reducing carbon emissions.',
    category: 'ALL',
    link: 'https://giveth.io/project/carbon-counting-club'
  },
  {
    id: '57',
    name: 'DIGITAL Street Musician Doing Free Live Concerts',
    description: 'Supporting digital music performances.',
    category: 'ALL',
    link: 'https://giveth.io/project/digital-street-musician-doing-free-live-concerts'
  },
  {
    id: '58',
    name: 'Documentary About Nigerian Human Trafficking',
    description: 'Raising awareness about human trafficking.',
    category: 'ALL',
    link: 'https://giveth.io/project/documentary-about-nigerian-human-trafficking'
  },
  {
    id: '59',
    name: 'GainForest',
    description: 'Forest conservation through technology.',
    category: 'ALL',
    link: 'https://giveth.io/project/gainforest'
  },
  {
    id: '60',
    name: 'Collabberry',
    description: 'Collaborative platform for creators.',
    category: 'ALL',
    link: 'https://giveth.io/project/collabberry'
  },
  {
    id: '61',
    name: 'Blockscout Open-Source Block Explorer',
    description: 'Open-source blockchain exploration tools.',
    category: 'ALL',
    link: 'https://giveth.io/project/blockscout-open-source-block-explorer'
  },
  {
    id: '62',
    name: 'LunCo - Everyone Can Do Space',
    description: 'Making space exploration accessible.',
    category: 'ALL',
    link: 'https://giveth.io/project/lunco-everyone-can-do-space'
  },
  {
    id: '63',
    name: 'Breadchain Cooperative',
    description: 'Cooperative blockchain initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/breadchain-cooperative'
  },
  {
    id: '64',
    name: 'DHK dao',
    description: 'Decentralized community governance.',
    category: 'ALL',
    link: 'https://giveth.io/project/dhk-dao'
  },
  {
    id: '65',
    name: 'Grassroots Economics',
    description: 'Community-driven economic initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/grassroots-economics'
  },
  {
    id: '66',
    name: 'Basic school supplies and crypto education initiative',
    description: 'Supporting education and crypto literacy.',
    category: 'ALL',
    link: 'https://giveth.io/project/basic-school-supplies-and-crypto-education-initiative'
  },
  {
    id: '67',
    name: 'Urbanika',
    description: 'Urban development and community projects.',
    category: 'ALL',
    link: 'https://giveth.io/project/urbanika'
  },
  {
    id: '68',
    name: 'Bahar Library A Beacon of Hope in Ramin Village',
    description: 'Supporting education through library services.',
    category: 'ALL',
    link: 'https://giveth.io/project/bahar-library-a-beacon-of-hope-in-ramin-village'
  },
  {
    id: '69',
    name: 'Community-based resiliency hub on the Osa Peninsula',
    description: 'Building community resilience.',
    category: 'ALL',
    link: 'https://giveth.io/project/community-based-resiliency-hub-on-the-osa-peninsula'
  },
  {
    id: '70',
    name: 'Public Nouns Operations',
    description: 'Supporting public goods through NFTs.',
    category: 'ALL',
    link: 'https://giveth.io/project/public-nouns-operations'
  },
  {
    id: '71',
    name: 'Bloom Network',
    description: 'Network for regenerative culture initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/bloom-network-0'
  },
  {
    id: '72',
    name: 'Kokonut Foundation - Public Goods Powered by Trees',
    description: 'Sustainable development through tree cultivation.',
    category: 'ALL',
    link: 'https://giveth.io/project/kokonut-foundation-public-goods-powered-by-trees'
  },
  {
    id: '73',
    name: 'The Financial Success Club - Priorly The 5AM Society',
    description: 'Financial education and community building.',
    category: 'ALL',
    link: 'https://giveth.io/project/the-financial-success-club-priorly-the-5am-society'
  },
  {
    id: '74',
    name: 'Tribes and Natures Defenders Philippine Projects',
    description: 'Environmental conservation in the Philippines.',
    category: 'ALL',
    link: 'https://giveth.io/project/tribes-and-natures-defenders-philippine-projects'
  },
  {
    id: '75',
    name: 'Give Praise',
    description: 'Recognition and reward system for contributions.',
    category: 'ALL',
    link: 'https://giveth.io/project/give-praise'
  },
  {
    id: '76',
    name: 'Arch Grants',
    description: 'Supporting entrepreneurship and innovation.',
    category: 'ALL',
    link: 'https://giveth.io/project/Arch-Grants'
  },
  {
    id: '77',
    name: 'Shielded Voting. Private and fair governance',
    description: 'Privacy-preserving voting systems.',
    category: 'ALL',
    link: 'https://giveth.io/project/shielded-voting-private-and-fair-governance'
  },
  {
    id: '78',
    name: 'Unitap',
    description: 'Universal basic income initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/unitap'
  },
  {
    id: '79',
    name: 'Huottoja University Of Ancestral Knowledge',
    description: 'Preserving and sharing traditional wisdom.',
    category: 'ALL',
    link: 'https://giveth.io/project/huottoja-university-of-ancestral-knowledge'
  },
  {
    id: '80',
    name: 'Every Court Can Dream',
    description: 'Supporting sports and community development.',
    category: 'ALL',
    link: 'https://giveth.io/project/every-court-can-dream'
  },
  {
    id: '81',
    name: 'Diamante Luz Center for Regenerative Living',
    description: 'Promoting sustainable living practices.',
    category: 'ALL',
    link: 'https://giveth.io/project/diamante-luz-center-for-regenerative-living-0'
  },
  {
    id: '82',
    name: 'ReVillaging Mutual Mentorships Program',
    description: 'Community mentorship and skill sharing.',
    category: 'ALL',
    link: 'https://giveth.io/project/revillaging-mutual-mentorships-program-0'
  },
  {
    id: '83',
    name: 'Coliazul Cultural Commons',
    description: 'Supporting cultural initiatives and arts.',
    category: 'ALL',
    link: 'https://giveth.io/project/coliazul-cultural-commons'
  },
  {
    id: '84',
    name: 'ReGenerOsa Collective',
    description: 'Collective for regenerative practices.',
    category: 'ALL',
    link: 'https://giveth.io/project/regenerosa-collective'
  },
  {
    id: '85',
    name: 'Web3Privacy Now - Advocating for Digital Privacy',
    description: 'Promoting privacy in Web3.',
    category: 'ALL',
    link: 'https://giveth.io/project/web3privacy-now-advocating-for-digital-privacy'
  },
  {
    id: '86',
    name: 'ReFi Podcast with Maya Dentzel & Tereza Bizkova',
    description: 'Educational content about regenerative finance.',
    category: 'ALL',
    link: 'https://giveth.io/project/refi-podcast-with-maya-dentzel-tereza-bizkova'
  },
  {
    id: '87',
    name: 'ETHArauca Legacy is high-tech education for the world',
    description: 'Technology education initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/etharauca-legacy-is-high-tech-education-for-the-world'
  },
  {
    id: '88',
    name: 'Giving Scholastic Materials To Most Vulnerable children',
    description: 'Educational support for vulnerable communities.',
    category: 'ALL',
    link: 'https://giveth.io/project/giving-scholastic-materials-to-most-vulnerable-children'
  },
  {
    id: '89',
    name: 'Vida +Verde Venezuela',
    description: 'Environmental initiatives in Venezuela.',
    category: 'ALL',
    link: 'https://giveth.io/project/vida-verde-venezuela'
  },
  {
    id: '90',
    name: 'Decentralized Science in Mexico DeSci',
    description: 'Advancing decentralized science in Mexico.',
    category: 'ALL',
    link: 'https://giveth.io/project/decentralized-science-in-mexico-desci'
  },
  {
    id: '91',
    name: 'JobStash',
    description: 'Decentralized job marketplace.',
    category: 'ALL',
    link: 'https://giveth.io/project/jobstash'
  },
  {
    id: '92',
    name: 'rotki',
    description: 'Portfolio tracking and analytics tools.',
    category: 'ALL',
    link: 'https://giveth.io/project/rotki'
  },
  {
    id: '93',
    name: 'Eco Moyo Education Centre',
    description: 'Sustainable education initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/eco-moyo-education-centre'
  },
  {
    id: '94',
    name: 'NextMeta',
    description: 'Next-generation metaverse development.',
    category: 'ALL',
    link: 'https://giveth.io/project/nextmeta'
  },
  {
    id: '95',
    name: 'EVMcrispr',
    description: 'Smart contract development tools.',
    category: 'ALL',
    link: 'https://giveth.io/project/evmcrispr-0'
  },
  {
    id: '96',
    name: 'Earthist Seeds',
    description: 'Sustainable agriculture and seed preservation.',
    category: 'ALL',
    link: 'https://giveth.io/project/earthist-seeds'
  },
  {
    id: '97',
    name: 'El3eza Centre',
    description: 'Community development and support center.',
    category: 'ALL',
    link: 'https://giveth.io/project/el3eza-centre'
  },
  {
    id: '98',
    name: 'Superchain Eco',
    description: 'Ecological blockchain initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/superchain-eco'
  },
  {
    id: '99',
    name: 'DeSci Round Operation Group',
    description: 'Coordinating decentralized science initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/desci-round-operation-group'
  },
  {
    id: '100',
    name: 'SEAL 911',
    description: 'Emergency response and support services.',
    category: 'ALL',
    link: 'https://giveth.io/project/seal-911'
  },
  {
    id: '101',
    name: 'Pairwise',
    description: 'Decision-making and governance tools.',
    category: 'ALL',
    link: 'https://giveth.io/project/pairwise-simplifying-choices-amplifying-voices'
  },
  {
    id: '102',
    name: 'ETH Daily',
    description: 'Daily Ethereum news and updates.',
    category: 'ALL',
    link: 'https://giveth.io/project/eth-daily'
  },
  {
    id: '103',
    name: 'End Homelessness thanks to Web3 Community',
    description: 'Addressing homelessness through Web3.',
    category: 'ALL',
    link: 'https://giveth.io/project/end-homelessness-thanks-to-web3-community'
  },
  {
    id: '104',
    name: 'Trash Cleaning Incentive',
    description: 'Incentivizing community cleanup efforts.',
    category: 'ALL',
    link: 'https://giveth.io/project/trash-cleaning-incentive'
  },
  {
    id: '105',
    name: 'Sage to Saddle',
    description: 'Equestrian therapy and education.',
    category: 'ALL',
    link: 'https://giveth.io/project/sage-to-saddle'
  },
  {
    id: '106',
    name: 'Apatride Network - supporting stateless-led initiatives',
    description: 'Supporting stateless individuals and communities.',
    category: 'ALL',
    link: 'https://giveth.io/project/apatride-network-supporting-stateless-led-initiatives-0'
  },
  {
    id: '107',
    name: 'bloomers.tv',
    description: 'Decentralized streaming platform.',
    category: 'ALL',
    link: 'https://giveth.io/project/bloomerstv'
  },
  {
    id: '108',
    name: 'Sustaining ZAO Festivals - Creativity & Technology',
    description: 'Supporting creative and technological festivals.',
    category: 'ALL',
    link: 'https://giveth.io/project/sustaining-zao-festivals-creativity-technology'
  },
  {
    id: '109',
    name: 'Njombe Innovation Academy',
    description: 'Technology education in Tanzania.',
    category: 'ALL',
    link: 'https://giveth.io/project/njombe-innovation-academy'
  },
  {
    id: '110',
    name: 'Open Heart Mind',
    description: 'Mental health and wellness initiatives.',
    category: 'ALL',
    link: 'https://giveth.io/project/open-heart-mind'
  },
  {
    id: '111',
    name: 'CRYPTOMURALS Street art is a public good',
    description: 'Supporting public art through crypto.',
    category: 'ALL',
    link: 'https://giveth.io/project/cryptomurals-street-art-is-a-public-good'
  },
  {
    id: '112',
    name: 'DCTRL Clubhouse Events Space',
    description: 'Community space for crypto events.',
    category: 'ALL',
    link: 'https://giveth.io/project/dctrl-clubhouse-events-space'
  },
   {
    id: '113',
    name: 'SCHOLARSHIP PROGRAMME FOR UNDERPRIVILEGED CHILDREN',
    description: 'Educational support for underprivileged children.',
    category: 'ALL',
    link: 'https://giveth.io/project/scholarship-programme-for-underprivileged-children'
  },
  {
    id: '114',
    name: 'Dappnode',
    description: 'Decentralized node infrastructure.',
    category: 'ALL',
    link: 'https://giveth.io/project/dappnode'
  },
  {
    id: '115',
    name: 'Maysou A Noste - A Regen Coliving Experience',
    description: 'Regenerative coliving community.',
    category: 'ALL',
    link: 'https://giveth.io/project/maysou-a-noste-a-regen-coliving-experience'
  },
  {
    id: '116',
    name: 'Harmonica - AI agents for group sensemaking',
    description: 'AI-powered group collaboration tools.',
    category: 'ALL',
    link: 'https://giveth.io/project/harmonica-ai-agents-for-group-sensemaking'
  },
  {
    id: '117',
    name: 'TogetherCrew',
    description: 'Community collaboration platform.',
    category: 'ALL',
    link: 'https://giveth.io/project/togethercrew'
  }
];
		
						