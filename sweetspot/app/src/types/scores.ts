import { User } from './users'

export interface UserScore {
  user: User
  metrics: {
    humanity: number // 0-100: Measures human-centric behavior
    trust: number // 0-100: Reliability and trustworthiness
    philanthropy: number // 0-100: Community contribution
    participation: number // 0-100: Active involvement
    consistency: number // 0-100: Regular engagement
    community: number // 0-100: Community support
    innovation: number // 0-100: Creative contributions
    administration: number // 0-100: Protocol administration skills
    cookieGiving: number // 0-100: Token distribution fairness
    cookieHolding: number // 0-100: Token holding responsibility
  }
  achievements: Achievement[]
  level: number
  totalScore: number
  lastUpdated: number
  role: 'admin' | 'holder' | 'giver' | 'user'
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  dateEarned: number
}

// Mock data for demonstration
export const MOCK_SCORES: UserScore[] = [
  {
    user: {
      id: '1',
      name: 'Alice Johnson',
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
    },
    metrics: {
      humanity: 85,
      trust: 90,
      philanthropy: 75,
      participation: 88,
      consistency: 92,
      community: 85,
      innovation: 78,
      administration: 95,
      cookieGiving: 88,
      cookieHolding: 82
    },
    achievements: [
      {
        id: 'master-admin',
        name: 'Master Administrator',
        description: 'Exceptional protocol management',
        icon: '👑',
        dateEarned: Date.now() - 86400000 * 30
      },
      {
        id: 'fair-distributor',
        name: 'Fair Distributor',
        description: 'Maintained equitable token distribution',
        icon: '⚖️',
        dateEarned: Date.now() - 86400000 * 15
      }
    ],
    level: 4,
    totalScore: 825,
    lastUpdated: Date.now() - 86400000,
    role: 'admin'
  },
  {
    user: {
      id: '2',
      name: 'Bob Smith',
      address: '0x123f681646d4a755815f9cb19e1acc8565a0c2ac'
    },
    metrics: {
      humanity: 70,
      trust: 85,
      philanthropy: 95,
      participation: 72,
      consistency: 68,
      community: 90,
      innovation: 65,
      administration: 45,
      cookieGiving: 92,
      cookieHolding: 78
    },
    achievements: [
      {
        id: 'generous-giver',
        name: 'Generous Cookie Giver',
        description: 'Top contributor in token distribution',
        icon: '🍪',
        dateEarned: Date.now() - 86400000 * 10
      }
    ],
    level: 3,
    totalScore: 725,
    lastUpdated: Date.now() - 86400000 * 2,
    role: 'giver'
  }
]
