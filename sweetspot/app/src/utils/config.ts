export const APP_NAME = 'SweetSpot'
export const IPFS_ENDPOINT = 'https://4everland.io/ipfs/'
export const IMAGE_KIT_ENDPOINT = 'https://ik.imagekit.io/kopveel8c'
export const DEFAULT_THEME: 'light' | 'dark' = 'light'
export const IS_FIXED_THEME = true

export const EVER_REGION = 'us-west-2'
export const EVER_ENDPOINT = 'https://endpoint.4everland.co'
export const STS_TOKEN_URL = process.env.NEXT_PUBLIC_STS_TOKEN_URL

export const PASSPORT_API_KEY = process.env.NEXT_PUBLIC_PASSPORT_SCORER_API_KEY
export const PASSPORT_API_URL = 'https://api.scorer.gitcoin.co'

export type SupportedChain = 'celoAlfajores' | 'celo'

export const CHAIN_NETWORK: SupportedChain =
  (process.env.NEXT_PUBLIC_CHAIN_NETWORK as SupportedChain) || 'celoAlfajores'

export const GRAPHQL_ENDPOINT =
  CHAIN_NETWORK === 'celo'
    ? 'https://api.studio.thegraph.com/query/33698/hand-prod/version/latest'
    : 'https://api.studio.thegraph.com/query/33698/hand/version/latest'

export const GITHUB_LINK = 'https://github.com/HandProtocol/sweetspot'
export const ORG_LINK = 'https://handprotocol.org'
