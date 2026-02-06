import { Token } from './tokens'

export interface Round {
  id: string
  name: string
  description: string
  startTime: number
  endTime: number
  status: 'upcoming' | 'active' | 'completed'
  totalAllocation: {
    token: Token
    amount: string
  }
  claimedAmount: string
  participantCount: number
}

// Mock data for demonstration
export const MOCK_ROUNDS: Round[] = [
  {
    id: '1',
    name: 'Genesis Distribution',
    description: 'Initial token distribution for early supporters',
    startTime: Date.now() - 86400000 * 7, // 7 days ago
    endTime: Date.now() + 86400000 * 23, // 23 days remaining
    status: 'active',
    totalAllocation: {
      token: {
        symbol: 'COOKIE',
        name: 'Cookie Token',
        decimals: 18,
        address: '0x...',
        logoUrl:
          'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png'
      },
      amount: '1000000000000000000000000' // 1,000,000 COOKIE
    },
    claimedAmount: '250000000000000000000000', // 250,000 COOKIE
    participantCount: 157
  },
  {
    id: '2',
    name: 'Community Rewards Phase 1',
    description: 'First phase of community rewards distribution',
    startTime: Date.now() + 86400000 * 30, // Starts in 30 days
    endTime: Date.now() + 86400000 * 60, // Ends in 60 days
    status: 'upcoming',
    totalAllocation: {
      token: {
        symbol: 'COOKIE',
        name: 'Cookie Token',
        decimals: 18,
        address: '0x...',
        logoUrl:
          'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png'
      },
      amount: '2000000000000000000000000' // 2,000,000 COOKIE
    },
    claimedAmount: '0',
    participantCount: 0
  }
]
