import { createPublicClient, http } from 'viem'
import {
  arbitrumSepolia,
  celoAlfajores,
  mainnet,
  polygon,
  celo
} from 'viem/chains'
import { CHAIN_NETWORK } from './config'

export const viemPublicClientEth = createPublicClient({
  chain: mainnet,
  transport: http()
})

export const viewPublicClientPolygon = createPublicClient({
  chain: polygon,
  transport: http()
})

export const arbitrumSepoliaPublicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http()
})

export const celoAlfajoresPublicClient = createPublicClient({
  chain: celoAlfajores,
  transport: http()
})

export const celoPublicClient = createPublicClient({
  chain: celo,
  transport: http()
})

export const viemPublicClient =
  CHAIN_NETWORK === 'celo' ? celoPublicClient : celoAlfajoresPublicClient
