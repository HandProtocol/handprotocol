import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Medal,
  Clock,
  Gift,
  ChevronRight,
  ExternalLink,
  Heart,
  Shield,
  Award,
  Target,
  TrendingUp,
  Users,
  Brain
} from 'lucide-react'
import { MOCK_SCORES } from '../../types/scores'
import { MOCK_ROUNDS, Round } from '../../types/rounds'
import { UserAvatar } from '../UserAvatar'
import { formatEther } from '../../utils/formatters'

const tabs = [
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'rounds', label: 'Rounds', icon: Clock }
]

function LeaderboardTab() {
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
                  {/* todo  */}
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

function RoundCard({
  round,
  isActive = false
}: {
  round: Round
  isActive?: boolean
}) {
  const progress =
    (parseFloat(round.claimedAmount) /
      parseFloat(round.totalAllocation.amount)) *
    100
  const timeLeft = Math.max(0, round.endTime - Date.now())
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg shadow-md p-6 ${
        isActive ? 'border-2 border-purple-500' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-bold">{round.name}</h3>
            {isActive && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Active
              </span>
            )}
          </div>
          <p className="text-gray-600 text-sm mt-1">{round.description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Total Allocation</span>
          <span className="font-medium">
            {formatEther(round.totalAllocation.amount)}{' '}
            {round.totalAllocation.token.symbol}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-purple-600 rounded-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {round.participantCount} participants
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">
              {round.status === 'upcoming'
                ? `Starts in ${daysLeft} days`
                : round.status === 'active'
                  ? `${daysLeft} days left`
                  : 'Completed'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function RoundsTab() {
  const activeRound = MOCK_ROUNDS.find((round) => round.status === 'active')
  const upcomingRounds = MOCK_ROUNDS.filter(
    (round) => round.status === 'upcoming'
  )
  const completedRounds = MOCK_ROUNDS.filter(
    (round) => round.status === 'completed'
  )

  return (
    <div className="space-y-8">
      {activeRound && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Active Round</h2>
          <RoundCard round={activeRound} isActive />
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-4">Upcoming Rounds</h2>
        <div className="grid grid-cols-1 gap-6">
          {upcomingRounds.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Past Rounds</h2>
        <div className="grid grid-cols-1 gap-6">
          {completedRounds.map((round) => (
            <RoundCard key={round.id} round={round} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState('leaderboard')

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Cookie Holders</h1>
        <p className="mt-2 text-gray-600">
          Discover our top contributors and their achievements
        </p>
      </div>

      <div className="mb-8">
        <nav className="flex space-x-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:bg-purple-50'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </motion.button>
            )
          })}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'leaderboard' ? <LeaderboardTab /> : <RoundsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
