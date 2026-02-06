import React from 'react'
import { motion } from 'framer-motion'
import { IceCream, TrendingUp, Star, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

const MOCK_IMPACT_DATA = {
  totalScoops: 42,
  impactScore: 850,
  recentScoops: [
    {
      id: 1,
      title: 'Community Support Initiative',
      impact: 25,
      date: '2024-03-15'
    },
    {
      id: 2,
      title: 'Educational Workshop',
      impact: 30,
      date: '2024-03-10'
    }
  ]
}

export function ImpactScoop() {
  const { push } = useRouter()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <IceCream className="h-6 w-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold">Impact Scoop</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => push('/report')}
          className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
        >
          <span className="text-sm font-medium">Report Impact</span>
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Total Scoops</p>
              <p className="text-2xl font-bold text-purple-600">
                {MOCK_IMPACT_DATA.totalScoops}
              </p>
            </div>
            <div className="p-3 bg-white rounded-full">
              <IceCream className="h-6 w-6 text-purple-600" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Impact Score</p>
              <p className="text-2xl font-bold text-purple-600">
                {MOCK_IMPACT_DATA.impactScore}
              </p>
            </div>
            <div className="p-3 bg-white rounded-full">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Recent Scoops</h3>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
          <div className="space-y-3">
            {MOCK_IMPACT_DATA.recentScoops.map((scoop) => (
              <div key={scoop.id} className="bg-white p-3 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{scoop.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(scoop.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 text-purple-600">
                    <Star className="h-4 w-4" />
                    <span className="text-sm font-medium">+{scoop.impact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
