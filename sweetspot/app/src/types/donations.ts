import { ZERO_ADDRESS } from '../utils/contants'
import { Token } from './tokens'

export interface DonationPlatform {
  id: string
  name: string
  description: string
  url: string
  logo: string
  categories: string[]
  minimumDonation?: {
    amount: string
    token: Token
  }
}

export interface PastDonation {
  id: string
  platform: string
  amount: string
  token: Token
  recipient: string
  date: number
  txHash: string
}

export const DONATION_PLATFORMS: DonationPlatform[] = [
  {
    id: 'gitcoin',
    name: 'Gitcoin Explorer',
    description: 'Support open source projects and public goods',
    url: 'https://explorer.gitcoin.co',
    logo: 'https://explorer.gitcoin.co/assets/gitcoinLogoWhite.svg',
    categories: ['open-source', 'public-goods', 'web3']
  },
  {
    id: 'octant',
    name: 'Octant',
    description: 'Fund impactful Web3 initiatives and DAOs',
    url: 'https://octant.app',
    logo: 'https://octant.app/logo.svg',
    categories: ['web3', 'daos', 'infrastructure']
  },
  {
    id: 'giveth',
    name: 'Giveth',
    description: 'Support verified projects making positive impact',
    url: 'https://giveth.io',
    logo: 'https://giveth.io/images/giveth-logo.svg',
    categories: ['social-impact', 'environment', 'community']
  },
  {
    id: 'giving-block',
    name: 'The Giving Block',
    description: 'Donate crypto to registered nonprofits',
    url: 'https://thegivingblock.com',
    logo: 'https://thegivingblock.com/wp-content/uploads/2021/07/TGB_Logo.svg',
    categories: ['nonprofits', 'charity', 'institutions']
  },
  {
    id: 'endaoment',
    name: 'Endaoment',
    description: 'Support US nonprofits with crypto donations',
    url: 'https://endaoment.org',
    logo: 'https://endaoment.org/logo.svg',
    categories: ['nonprofits', 'daos', 'governance']
  }
]

// Mock data for demonstration
export const MOCK_PAST_DONATIONS: PastDonation[] = [
  {
    id: '1',
    platform: 'gitcoin',
    amount: '0.1',
    token: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      address: ZERO_ADDRESS,
      logoUrl:
        'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png'
    },
    recipient: 'Protocol Guild',
    date: Date.now() - 86400000 * 30, // 30 days ago
    txHash: '0x123...'
  },
  {
    id: '2',
    platform: 'giveth',
    amount: '500',
    token: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      address: '0x...',
      logoUrl:
        'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdc.png'
    },
    recipient: 'Climate Action Fund',
    date: Date.now() - 86400000 * 60, // 60 days ago
    txHash: '0x456...'
  }
]
