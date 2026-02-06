export interface UserProfileData {
  name: string
  address: string
  avatar: string | null
  reputation: number
  verified: boolean
  createdAt: Date
  bio: string
}

export const MOCK_USER_PROFILE: UserProfileData = {
  name: 'Alice Johnson',
  address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  avatar: null,
  reputation: 85,
  verified: true,
  createdAt: new Date('2023-09-15'),
  bio: 'Active contributor to DeFi protocols and blockchain ecosystems. Passionate about decentralized governance and community building.'
}

export interface AllocationHistory {
  id: string
  date: Date
  token: string
  amount: string
  usdValue: number
  status: 'claimed' | 'pending'
}

export const MOCK_ALLOCATION_HISTORY: AllocationHistory[] = [
  {
    id: '1',
    date: new Date('2024-03-01'),
    token: 'SWEET',
    amount: '1000',
    usdValue: 2500,
    status: 'claimed'
  },
  {
    id: '2',
    date: new Date('2024-02-15'),
    token: 'ETH',
    amount: '0.5',
    usdValue: 1250,
    status: 'pending'
  }
]

export interface FinancialStats {
  totalClaimed: {
    tokens: number
    usdValue: number
  }
  pendingAllocations: {
    tokens: number
    usdValue: number
  }
  totalTransactions: number
  donationsMade: number
  donationsReceived: number
  successRate: number
}

export const MOCK_FINANCIAL_STATS: FinancialStats = {
  totalClaimed: {
    tokens: 5000,
    usdValue: 12500
  },
  pendingAllocations: {
    tokens: 2000,
    usdValue: 5000
  },
  totalTransactions: 45,
  donationsMade: 15,
  donationsReceived: 8,
  successRate: 98
}
