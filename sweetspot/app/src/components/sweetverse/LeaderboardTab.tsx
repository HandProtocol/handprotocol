import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, Medal, Gift, Users } from 'lucide-react'
import { MOCK_SCORES } from '../../types/scores'
import { UserAvatar } from '../UserAvatar'

export function LeaderboardTab() {
  const sortedScores = [...MOCK_SCORES].sort(
    (a, b) => b.totalScore - a.totalScore
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {sortedScores.slice(0, 3).map((score, index) => (
          <motion.div
            key={score.user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-md p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20" />
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  {/* <UserAvatar user={score.user} size="lg" /> */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{score.user.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span>{score.totalScore} points</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Level {score.level}</span>
                  <span className="text-purple-600">
                    {score.achievements.length} achievements
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Medal className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <span className="text-sm text-gray-600">Rank</span>
                    <p className="font-bold">{index + 1}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Gift className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <span className="text-sm text-gray-600">Donations</span>
                    <p className="font-bold">
                      {(Math.random() * 100).toFixed(2)} ETH
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projects
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedScores.map((score, index) => (
              <tr key={score.user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    #{index + 1}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {/* <UserAvatar user={score.user} size="sm" /> */}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {score.user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Level {score.level}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {score.totalScore}
                  </div>
                  <div className="text-sm text-gray-500">points</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-1">
                    {score.achievements.map((achievement) => (
                      <span
                        key={achievement.id}
                        className="text-lg"
                        title={achievement.name}
                      >
                        {achievement.icon}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {Math.floor(Math.random() * 10) + 1} projects
                  </div>
                  <div className="text-sm text-gray-500">
                    {(Math.random() * 100).toFixed(2)} ETH donated
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-purple-600 hover:text-purple-900">
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
