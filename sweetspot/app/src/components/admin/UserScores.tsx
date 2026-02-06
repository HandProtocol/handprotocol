import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  ChevronDown,
  Heart,
  Shield,
  Award,
  Target,
  TrendingUp,
  Users,
  Brain,
  Settings,
  Gift,
  Wallet,
  Plus,
  Sparkles,
  UserPlus
} from 'lucide-react'
import { UserAvatar } from '../UserAvatar'
import { MOCK_SCORES } from '../../types/scores'
import { MetricBar } from './MetricBar'
import toast from 'react-hot-toast'
import {
  OrderDirection,
  useGetUsersQuery,
  User,
  User_OrderBy
} from '../../graphql/generated'
import { getLevelFromScore } from '../../utils/helpers'
import SetScore from './SetScore'
import { Address } from 'viem'

export const SCORE_CATEGORIES = [
  // {
  //   id: 'Humanity',
  //   label: 'Humanity',
  //   icon: Heart,
  //   description: 'Measures empathy and human-centric behavior',
  //   emoji: '💖'
  // },
  {
    id: 'Trust',
    label: 'Trust',
    icon: Shield,
    description: 'Reliability and trustworthiness',
    emoji: '🛡️'
  }
  // {
  //   id: 'Philanthropy',
  //   label: 'Philanthropy',
  //   icon: Award,
  //   description: 'Community contribution and giving',
  //   emoji: '🏆'
  // }
  // {
  //   id: 'Participation',
  //   label: 'Participation',
  //   icon: Target,
  //   description: 'Active involvement in protocol',
  //   emoji: '🎯'
  // },
  // {
  //   id: 'Consistency',
  //   label: 'Consistency',
  //   icon: TrendingUp,
  //   description: 'Regular engagement',
  //   emoji: '📈'
  // },
  // {
  //   id: 'Community',
  //   label: 'Community',
  //   icon: Users,
  //   description: 'Supporting other members',
  //   emoji: '👥'
  // },
  // {
  //   id: 'Innovation',
  //   label: 'Innovation',
  //   icon: Brain,
  //   description: 'Creative contributions',
  //   emoji: '🧠'
  // },
  // {
  //   id: 'Administration',
  //   label: 'Administration',
  //   icon: Settings,
  //   description: 'Protocol management skills',
  //   emoji: '⚙️'
  // },
  // {
  //   id: 'CookieGiving',
  //   label: 'Cookie Giving',
  //   icon: Gift,
  //   description: 'Token distribution fairness',
  //   emoji: '🎁'
  // },
  // {
  //   id: 'CookieHolding',
  //   label: 'Cookie Holding',
  //   icon: Wallet,
  //   description: 'Token holding responsibility',
  //   emoji: '💰'
  // }
]

function ScoreIncrementAnimation({
  emoji,
  onComplete
}: {
  emoji: string
  onComplete: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: [0, 1, 0], y: -50 }}
      transition={{ duration: 1 }}
      onAnimationComplete={onComplete}
      className="absolute text-2xl pointer-events-none"
    >
      {emoji} +5
    </motion.div>
  )
}

function AddScorePopup({
  user,
  onClose
}: {
  user: User | null
  onClose: () => void
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [userAddress, setUserAddress] = useState(user?.id || '')

  const handleScoreIncrease = (categoryId: string) => {
    setShowAnimation(true)
    const category = SCORE_CATEGORIES.find((c) => c.id === categoryId)
    if (category) {
      toast.success(`Added 5 points to ${category.label}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3 mb-6">
          <Sparkles className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-bold">Add Score Points</h2>
        </div>

        {userAddress ? (
          <div className="mb-4">
            <div className="flex items-center gap-x-3">
              <UserAvatar address={userAddress!} />
              <div>
                <div className="font-semibold break-words break-all">
                  {userAddress}
                </div>
                <div
                  className="text-red-500"
                  onClick={() => {
                    setUserAddress('')
                  }}
                >
                  Remove
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter Wallet Address"
              value={userAddress}
              className="border border-gray-300 rounded-md px-3 py-2 mb-4 w-full"
              onChange={(e) => setUserAddress(e.target.value)}
            />
          </>
        )}

        <p className="text-sm text-gray-600">Select a category to add points</p>

        <div className="space-y-2">
          {selectedCategory && userAddress ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-purple-600 hover:text-purple-700"
                >
                  ← Back to categories
                </button>
              </div>
              {SCORE_CATEGORIES.filter((c) => c.id === selectedCategory).map(
                (category) => (
                  <SetScore
                    key={category.id}
                    userAddress={userAddress as Address}
                    category={category}
                    onClose={onClose}
                  />
                )
              )}
            </div>
          ) : (
            SCORE_CATEGORIES.map((category) => (
              <motion.button
                key={category.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCategory(category.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg">
                    <category.icon className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-medium">{category.label}</span>
                </div>
                <Plus className="h-5 w-5 text-gray-400" />
              </motion.button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function ScoreCard({
  user,
  setAddScoreUser
}: {
  user: User
  setAddScoreUser: React.Dispatch<React.SetStateAction<User | null | undefined>>
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {/* <UserAvatar user={score.user} /> */}
            <div className="space-y-1">
              <div className="text-s-text">{user.id}</div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>Level {getLevelFromScore(user.totalScore)}</span>
                <span>•</span>
                <span>{user.totalScore} points</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAddScoreUser(user)}
              className="flex items-center space-x-1 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Score</span>
            </motion.button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-6 mt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.scores?.map((score) => {
                  const category = SCORE_CATEGORIES.find(
                    (c) => c.label === score.scoreType
                  )
                  if (!category) return null
                  return (
                    <MetricBar
                      key={score.id}
                      label={category.label}
                      value={score.value}
                      icon={category.icon}
                    />
                  )
                })}
              </div>

              {/* {score.achievements.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Achievements</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {score.achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-2xl">{achievement.icon}</span>
                        <div>
                          <p className="font-medium">{achievement.name}</p>
                          <p className="text-sm text-gray-600">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function UserScores() {
  const [addScoreUser, setAddScoreUser] = useState<User | null | undefined>()
  const { data: usersData } = useGetUsersQuery({
    variables: {
      orderBy: User_OrderBy.TotalScore,
      orderDirection: OrderDirection.Desc
    }
  })
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {usersData?.users.map((user) => (
          <ScoreCard
            key={user.id}
            // @ts-ignore
            user={user}
            setAddScoreUser={setAddScoreUser}
          />
        ))}
      </div>

      <div className="flex items-center justify-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAddScoreUser(null)}
          className="flex items-center space-x-1 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add New User & Score</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {addScoreUser !== undefined && (
          <AddScorePopup
            user={addScoreUser}
            onClose={() => setAddScoreUser(undefined)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
