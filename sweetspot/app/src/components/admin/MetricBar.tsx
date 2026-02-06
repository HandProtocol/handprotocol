import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface MetricBarProps {
  value: number
  label: string
  icon: LucideIcon
}

export function MetricBar({ value, label, icon: Icon }: MetricBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="h-5 w-5 text-purple-600" />
          <span className="font-medium text-gray-700">{label}</span>
        </div>
        <span className="text-sm text-gray-500">{value}/100</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-purple-600 rounded-full"
        />
      </div>
    </div>
  )
}
