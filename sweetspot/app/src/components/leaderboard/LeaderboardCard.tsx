import React from 'react'
import { motion } from 'framer-motion'
import { Star, Trophy, Award, Target } from 'lucide-react'
import { UserAvatar } from '../UserAvatar'
import { User } from '../../graphql/generated'
import { formatAddress } from '../../utils/formatters'

interface LeaderboardCardProps {
  user: User
  rank: number
  score: number
  achievements: number
  animate?: boolean
  tableView?: boolean
}

const rankColors = {
  1: 'from-yellow-400 to-yellow-600',
  2: 'from-slate-300 to-slate-500',
  3: 'from-amber-600 to-amber-800'
}

const rankEmojis = {
  1: '👑',
  2: '🥈',
  3: '🥉'
}

const rankBgColors = {
  1: 'bg-yellow-100 border-yellow-300',
  2: 'bg-gray-100 border-gray-300',
  3: 'bg-amber-100 border-amber-300'
}

export function LeaderboardCard({
  user,
  rank,
  score,
  achievements,
  animate = true
}: LeaderboardCardProps) {
  const isTopThree = rank <= 3
  const rankColor = rankColors[rank as keyof typeof rankColors]
  const rankEmoji = rankEmojis[rank as keyof typeof rankEmojis]
  const rankBgColor = rankBgColors[rank as keyof typeof rankBgColors]

  return (
    <div className="grid grid-cols-12 gap-4 items-center">
      {/* Rank number */}
      <div className="col-span-1">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${isTopThree ? rankBgColor : 'bg-purple-100 border-purple-200'} border font-bold text-sm mx-auto`}
        >
          {isTopThree ? <span>{rankEmoji}</span> : rank}
        </div>
      </div>

      {/* Player info */}
      <div className="col-span-3 flex items-center space-x-2">
        <div className="relative">
          <UserAvatar address={user.id} size="sm" />
        </div>
        <div className="truncate">
          <div className="font-medium">{formatAddress(user.id)}</div>
        </div>
      </div>

      {/* Score */}
      <div className="col-span-2 font-bold text-purple-900">
        {score.toLocaleString()}
      </div>

      {/* Achievements */}
      <div className="col-span-2 font-medium text-indigo-700">
        {achievements}
      </div>

      {/* Level */}
      <div className="col-span-2 font-medium text-orange-600">
        {Math.floor(score / 100)}
      </div>

      {/* Progress bar */}
      <div className="col-span-2">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score % 100}%` }}
            transition={{ duration: 1, delay: rank * 0.1 }}
            className={`h-full bg-gradient-to-r ${rankColor || 'from-purple-500 to-purple-700'}`}
          />
        </div>
        <div className="text-xs text-center text-gray-500 mt-1">
          {score % 100}/100 XP
        </div>
      </div>
    </div>
  )
}
