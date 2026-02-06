import React from 'react'
import { motion } from 'framer-motion'
import { Settings, Users, Wallet, Info, ArrowRight } from 'lucide-react'
import { AdminStats } from './AdminStats'
import { RoundsOverview } from './RoundsOverview'

interface ActionCardProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}

function ActionCard({ icon, title, description, onClick }: ActionCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-left w-full group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
          {icon}
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
      </div>
      <h3 className="text-lg font-semibold mb-2 group-hover:text-purple-600 transition-colors">
        {title}
      </h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </motion.button>
  )
}

interface AdminOverviewProps {
  onTabChange: (tab: string) => void
}

export function AdminOverview({ onTabChange }: AdminOverviewProps) {
  const actions = [
    {
      id: 'round',
      icon: <Settings className="h-6 w-6 text-purple-600" />,
      title: 'Round Settings',
      description:
        'Configure distribution round parameters including name, description, and timing'
    },
    {
      id: 'allocation',
      icon: <Users className="h-6 w-6 text-purple-600" />,
      title: 'Token Allocation',
      description:
        'Manage token allocations for users and set individual distribution amounts'
    },
    {
      id: 'treasury',
      icon: <Wallet className="h-6 w-6 text-purple-600" />,
      title: 'Treasury Management',
      description:
        'Handle contract deposits and withdrawals for various supported tokens'
    }
  ]

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <AdminStats />
      </div>

      <RoundsOverview />

      <div>
        <div className="flex items-center space-x-3 mb-6">
          <Info className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              icon={action.icon}
              title={action.title}
              description={action.description}
              onClick={() => onTabChange(action.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
