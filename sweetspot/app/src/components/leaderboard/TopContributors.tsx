import React from 'react'
import { motion } from 'framer-motion'
import { LeaderboardCard } from './LeaderboardCard'
import {
  OrderDirection,
  useGetUsersQuery,
  User_OrderBy
} from '../../graphql/generated'
import { Trophy, Star, Award, Flame } from 'lucide-react'

export function TopContributors() {
  const { data, loading } = useGetUsersQuery({
    variables: {
      first: 10,
      orderBy: User_OrderBy.TotalScore,
      orderDirection: OrderDirection.Desc
    }
  })

  // Animation variants for staggered animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
        <h2 className="text-xl font-bold flex items-center">
          <Trophy className="mr-2 h-6 w-6 text-yellow-300" />
          Top Contributors
        </h2>
        <p className="text-purple-100 text-sm">
          Ranked by total contribution points from claimed tokensscore
        </p>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-4 p-4 border-b border-purple-100 bg-white/60 font-semibold text-purple-900">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-3">Contributor</div>
        <div className="col-span-2 flex items-center">
          <Star className="h-4 w-4 text-yellow-500 mr-1" />
          Points
        </div>
        <div className="col-span-2 flex items-center">
          <Award className="h-4 w-4 text-indigo-500 mr-1" />
          Contributions
        </div>
        <div className="col-span-2 flex items-center">
          <Flame className="h-4 w-4 text-orange-500 mr-1" />
          Impact
        </div>
        <div className="col-span-2 text-center">Progress</div>
      </div>

      {/* Leaderboard rows */}
      {loading ? (
        <div className="p-8 text-center text-purple-500">
          Loading leaderboard...
        </div>
      ) : (
        <div className="divide-y divide-purple-100">
          {data?.users.map((user, index) => (
            <motion.div
              key={user.id}
              variants={itemVariants}
              className={`p-3 ${index < 3 ? 'bg-gradient-to-r from-purple-50 to-indigo-50' : 'bg-white/80'} hover:bg-purple-50 transition-colors duration-200`}
            >
              <LeaderboardCard
                // @ts-ignore
                user={user}
                rank={index + 1}
                score={user.totalScore}
                achievements={user.scores?.length || 0}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="bg-white/60 p-3 text-xs text-center text-purple-500 border-t border-purple-100">
        Earn more points by contributing to open-source projects and claiming
        tokens!
      </div>
    </motion.div>
  )
}
