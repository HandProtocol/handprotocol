import { Token } from './tokens'

export type ImpactCategory =
  | 'community_building'
  | 'education'
  | 'development'
  | 'governance'
  | 'security'
  | 'sustainability'
  | 'inclusion'
  | 'innovation'

export type ProofType =
  | 'transaction_hash'
  | 'github_pr'
  | 'forum_post'
  | 'social_post'
  | 'snapshot_vote'
  | 'documentation'
  | 'video_content'
  | 'other'

export interface ImpactMetrics {
  peopleReached?: number
  communityGrowth?: number
  resourcesSaved?: number
  participationRate?: number
  completionRate?: number
  satisfactionScore?: number
}

export interface ResourceContribution {
  type: 'time' | 'token' | 'skill'
  amount: number
  token?: Token
  description: string
}

export interface ImpactEvidence {
  type: ProofType
  url: string
  description: string
  timestamp: number
}

export interface ImpactReport {
  id: string
  title: string
  description: string
  category: ImpactCategory
  subcategory?: string
  startDate: number
  endDate: number
  status: 'draft' | 'submitted' | 'verified' | 'rejected'
  metrics: ImpactMetrics
  contributions: ResourceContribution[]
  evidence: ImpactEvidence[]
  collaborators: string[] // Array of wallet addresses
  tags: string[]
  beneficiaries: string[]
  location?: {
    type: 'global' | 'regional' | 'local'
    details?: string
  }
  sdgGoals?: number[] // UN Sustainable Development Goals (1-17)
  chainId?: number
  createdAt: number
  updatedAt: number
  verifiedBy?: string
  verificationNotes?: string
}

export const IMPACT_CATEGORIES = [
  {
    id: 'community_building',
    label: 'Community Building',
    description: 'Growing and nurturing the community',
    icon: '👥'
  },
  {
    id: 'education',
    label: 'Education',
    description: 'Creating educational content and resources',
    icon: '📚'
  },
  {
    id: 'development',
    label: 'Development',
    description: 'Technical contributions and development',
    icon: '💻'
  },
  {
    id: 'governance',
    label: 'Governance',
    description: 'Participation in governance and decision-making',
    icon: '⚖️'
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Improving protocol and community security',
    icon: '🛡️'
  },
  {
    id: 'sustainability',
    label: 'Sustainability',
    description: 'Environmental and economic sustainability initiatives',
    icon: '🌱'
  },
  {
    id: 'inclusion',
    label: 'Inclusion',
    description: 'Promoting diversity and inclusion',
    icon: '🤝'
  },
  {
    id: 'innovation',
    label: 'Innovation',
    description: 'New ideas and innovative solutions',
    icon: '💡'
  }
] as const

export const PROOF_TYPES = [
  {
    id: 'transaction_hash',
    label: 'Transaction Hash',
    description: 'On-chain transaction proof',
    icon: '🔗'
  },
  {
    id: 'github_pr',
    label: 'GitHub Pull Request',
    description: 'Code contribution proof',
    icon: '📝'
  },
  {
    id: 'forum_post',
    label: 'Forum Post',
    description: 'Discussion or proposal proof',
    icon: '💬'
  },
  {
    id: 'social_post',
    label: 'Social Media Post',
    description: 'Social media engagement proof',
    icon: '📱'
  },
  {
    id: 'snapshot_vote',
    label: 'Snapshot Vote',
    description: 'Governance participation proof',
    icon: '🗳️'
  },
  {
    id: 'documentation',
    label: 'Documentation',
    description: 'Written documentation proof',
    icon: '📄'
  },
  {
    id: 'video_content',
    label: 'Video Content',
    description: 'Video or streaming proof',
    icon: '🎥'
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Other forms of proof',
    icon: '📎'
  }
] as const

export const SDG_GOALS = [
  { id: 1, name: 'No Poverty' },
  { id: 2, name: 'Zero Hunger' },
  { id: 3, name: 'Good Health and Well-being' },
  { id: 4, name: 'Quality Education' },
  { id: 5, name: 'Gender Equality' },
  { id: 6, name: 'Clean Water and Sanitation' },
  { id: 7, name: 'Affordable and Clean Energy' },
  { id: 8, name: 'Decent Work and Economic Growth' },
  { id: 9, name: 'Industry, Innovation and Infrastructure' },
  { id: 10, name: 'Reduced Inequality' },
  { id: 11, name: 'Sustainable Cities and Communities' },
  { id: 12, name: 'Responsible Consumption and Production' },
  { id: 13, name: 'Climate Action' },
  { id: 14, name: 'Life Below Water' },
  { id: 15, name: 'Life on Land' },
  { id: 16, name: 'Peace, Justice, and Strong Institutions' },
  { id: 17, name: 'Partnerships for the Goals' }
] as const
