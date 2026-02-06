import { Project } from '../../types/project'

export const VIDA_VERDE_LINK = 'https://vidaverde.handprotocol.org'
export const DOCUMENTARY_HUMAN_RIGHTS_LINK =
  'https://giveth.io/project/documentary-about-nigerian-human-trafficking'
export const DIGITAL_STREET_MUSIC_LINK =
  'https://giveth.io/project/digital-street-musician-doing-free-live-concerts'
export const BLOOMERSTV_LINK =
  'https://explorer.gitcoin.co/#/projects/0x16429f74cbb2cef6f9f48481b6c8bc49fa12989d75c1f9d82462f8bb91f079eb'

export const ALL_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Documentary About Nigerian Human Trafficking',
    description:
      'Traditional organizations declined to help us. Web3 is making a full-length documentary possible. Our documentary plans to educate communities about predatory practices used by traffickers and establish a blueprint for Nigerians to leverage Web3 to address local issues. ',
    image:
      'https://giveth.mypinata.cloud/ipfs/QmVpVxBuNpKjvf7UHjm17Mr1u1eN5ZgsQuxfdrHweJ5phF',
    categories: ['Social Impact', 'Education'],
    link: DOCUMENTARY_HUMAN_RIGHTS_LINK
  },
  {
    id: '2',
    name: '+Vida + Verde Venezuela',
    description:
      'Our goal is to have a stable Green Roots nucleus, an educational space that involves nearby rural communities to reconnect them with ancestral practices of care and regeneration of nature and to complete the final stages of construction of our Hogar Verde residences.',
    image:
      'https://giveth.mypinata.cloud/ipfs/QmcStBE4boayqj8rweKLikbBVyesDxfkDharb3V8rT7mQP',
    categories: ['Environment', 'Community'],
    link: VIDA_VERDE_LINK
  },
  {
    id: '3',
    name: 'Open Source Live Streaming Platform on Lens Protocol',
    description:
      'BloomersTV aims to transform live streaming by giving creators full control over their earnings and distributing streams across multiple platforms for greater reach. It fosters a creator-first ecosystem that encourages open participation and community-driven growth.',
    image:
      'https://ik.imagekit.io/lens/media-snapshot/3e3c106e222a05c69767af09bee4dade1c658e6a2b4c853e7eeab59f2467045b.png',
    categories: ['Creator Economy', 'Open Source'],
    link: BLOOMERSTV_LINK
  }
]

export const FEATURED_PROJECTS: Project[] = ALL_PROJECTS.slice(0, 3)
