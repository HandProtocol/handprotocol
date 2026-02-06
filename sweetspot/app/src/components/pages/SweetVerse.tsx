import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Rocket, Globe2 } from 'lucide-react'
import { RoundsTab } from '../sweetverse/RoundsTab'
import { ProjectsTab } from '../sweetverse/ProjectsTab'
import { TabNavigation } from '../common/TabNavigation'

const tabs = [
  { id: 'rounds', label: 'Rounds', icon: Clock },
  { id: 'projects', label: 'Projects', icon: Rocket }
]

export function SweetVerse() {
  const [activeTab, setActiveTab] = useState('rounds')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen h-fit">
      <div className="mb-8">
        <div className="flex items-center space-x-3">
          <Globe2 className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Sweet Verse</h1>
        </div>
        <p className="mt-2 text-gray-600">
          Explore the ecosystem of Sweet Holders, rounds, and supported projects
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
          {/* {activeTab === 'leaderboard' && <LeaderboardTab />} */}
          {activeTab === 'rounds' && <RoundsTab />}
          {activeTab === 'projects' && <ProjectsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
