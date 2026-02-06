// Previous imports remain the same...

import {
  Award,
  Brain,
  Gift,
  Heart,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Users,
  Wallet
} from 'lucide-react'

const SCORE_TYPES = [
  {
    id: 'humanity',
    label: 'Humanity',
    icon: Heart,
    description: 'Measures human-centric behavior and empathy',
    color: 'rose'
  },
  {
    id: 'trust',
    label: 'Trust',
    icon: Shield,
    description: 'Reliability and trustworthiness in the ecosystem',
    color: 'blue'
  },
  {
    id: 'philanthropy',
    label: 'Philanthropy',
    icon: Award,
    description: 'Contribution to community welfare',
    color: 'amber'
  },
  {
    id: 'participation',
    label: 'Participation',
    icon: Target,
    description: 'Active involvement in protocol activities',
    color: 'green'
  },
  {
    id: 'consistency',
    label: 'Consistency',
    icon: TrendingUp,
    description: 'Regular and stable engagement',
    color: 'indigo'
  },
  {
    id: 'community',
    label: 'Community',
    icon: Users,
    description: 'Community engagement and support',
    color: 'purple'
  },
  {
    id: 'innovation',
    label: 'Innovation',
    icon: Brain,
    description: 'Creative contributions and suggestions',
    color: 'cyan'
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: Settings,
    description: 'Protocol administration capabilities',
    color: 'slate'
  },
  {
    id: 'cookieGiving',
    label: 'Cookie Giving',
    icon: Gift,
    description: 'Token distribution fairness and responsibility',
    color: 'orange'
  },
  {
    id: 'cookieHolding',
    label: 'Cookie Holding',
    icon: Wallet,
    description: 'Token holding and governance participation',
    color: 'emerald'
  }
]

// Rest of the component remains the same...
