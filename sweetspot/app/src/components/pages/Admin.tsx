import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Settings, Users, Wallet, Star } from 'lucide-react'
import { AdminOverview } from '../admin/AdminOverview'
import { SetRoundForm } from '../admin/SetRoundForm'
import { TokenAllocation } from '../admin/TokenAllocation'
import { AdminTreasury } from '../admin/AdminTreasury'
import { UserScores } from '../admin/UserScores'
import { TabNavigation } from '../common/TabNavigation'

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'round', label: 'Round Settings', icon: Settings },
  { id: 'allocation', label: 'Token Allocation', icon: Users },
  { id: 'treasury', label: 'Treasury', icon: Wallet },
  { id: 'scores', label: 'Scores', icon: Star }
]

export function Admin() {
  const [activeTab, setActiveTab] = useState('overview')

  const TabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview onTabChange={setActiveTab} />
      case 'round':
        return <SetRoundForm />
      case 'allocation':
        return <TokenAllocation />
      case 'treasury':
        return <AdminTreasury />
      case 'scores':
        return <UserScores />
      default:
        return null
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen py-8 h-fit">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-gray-600">
          Manage your SweetSpot distribution settings and treasury
        </p>
      </div>

      <div className="mb-8">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <TabContent />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
