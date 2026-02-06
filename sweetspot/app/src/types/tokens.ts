import { Address } from 'viem'
import { ZERO_ADDRESS } from '../utils/contants'
import { CHAIN_NETWORK } from '../utils/config'

export interface Token {
  symbol: string
  name: string
  decimals: number
  address: Address
  logoUrl: string
}

export const ARBITRUM_SEPOLIA_TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    address: ZERO_ADDRESS,
    logoUrl:
      'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png'
  },
  // {
  //   symbol: 'USDGLO',
  //   name: 'USD Global',
  //   decimals: 18,
  //   address: '0x1234...', // Replace with actual contract address
  //   logoUrl:
  //     'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png'
  // },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    logoUrl:
      'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdc.png'
  }
  // {
  //   symbol: 'USDN',
  //   name: 'USD Neutrino',
  //   decimals: 18,
  //   address: '0x9012...', // Replace with actual contract address
  //   logoUrl:
  //     'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png'
  // }
]

export const CELO_ALFAJORES_TOKENS: Token[] = [
  {
    symbol: 'CELO',
    name: 'CELO ',
    decimals: 18,
    address: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9',
    logoUrl: 'https://avatars.githubusercontent.com/u/37552875?s=200&v=4'
  },
  // {
  //   symbol: 'USDGLO',
  //   name: 'USD Global',
  //   decimals: 18,
  //   address: '0x1234...', // Replace with actual contract address
  //   logoUrl:
  //     'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png'
  // },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
    logoUrl:
      'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdc.png'
  }
  // {
  //   symbol: 'USDN',
  //   name: 'USD Neutrino',
  //   decimals: 18,
  //   address: '0x9012...', // Replace with actual contract address
  //   logoUrl:
  //     'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png'
  // }
]

export const CELO_TOKENS: Token[] = [
  {
    symbol: 'CELO',
    name: 'CELO ',
    decimals: 18,
    // native
    address: ZERO_ADDRESS,
    logoUrl: 'https://avatars.githubusercontent.com/u/37552875?s=200&v=4'
  },
  {
    symbol: 'cUSD',
    name: 'Celo Dollar',
    decimals: 18,
    address: '0x765de816845861e75a25fca122bb6898b8b1282a',
    logoUrl: 'https://celoscan.io/token/images/celodollar_32.png'
  },
  {
    symbol: 'USDGLO',
    name: 'Glo Dollar',
    decimals: 18,
    address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
    logoUrl: 'https://avatars.githubusercontent.com/u/131250622?s=48&v=4'
  }
]

export const SUPPORTED_TOKENS: Token[] =
  CHAIN_NETWORK === 'celo' ? CELO_TOKENS : CELO_ALFAJORES_TOKENS

export const getSupportedToken = (address: Address) => {
  return SUPPORTED_TOKENS.find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  )
}
