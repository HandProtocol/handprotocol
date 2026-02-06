import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface Tab {
  id: string
  label: string
  icon: LucideIcon
}

interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange
}: TabNavigationProps) {
  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex justify-center space-x-8 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center py-2"
            >
              <div
                className={`p-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-purple-50'
                }`}
              >
                <tab.icon className="h-5 w-5 flex-shrink-0" />
              </div>
              <span
                className={`text-sm mt-1 ${
                  isActive ? 'text-purple-600 font-medium' : 'text-gray-600'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTabDesktop"
                  className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-purple-600"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden">
        <div className="flex justify-around items-center bg-white rounded-lg shadow-sm py-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center min-h-[4.5rem]"
              >
                <div
                  className={`p-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-purple-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-xs mt-2 ${
                    isActive ? 'text-purple-600 font-medium' : 'text-gray-600'
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabMobile"
                    className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-purple-600"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
