import React from 'react'
import { Clock, Calendar, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDate } from '../../utils/formatters'
import { useCurrentRoundsQuery } from '../../graphql/generated'
import clsx from 'clsx'

export function RoundInfo() {
  const { data } = useCurrentRoundsQuery()
  const currentRound = data?.currentRounds[0]

  const isRoundYetToStart = Date.now() < currentRound?.round.start * 1000
  const isRoundFinished = Date.now() > currentRound?.round.end * 1000
  const isRoundActive = !isRoundFinished && !isRoundYetToStart

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <h2 className="text-2xl font-bold mb-4">Current Round</h2>
      {currentRound && (
        <div className="space-y-4">
          <div className="font-semibold">
            {currentRound?.round.metadata.name}
          </div>
          <div className="">{currentRound?.round.metadata.description}</div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <span className="text-gray-600">
              Start: {formatDate(currentRound?.round.start)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <span className="text-gray-600">
              End: {formatDate(currentRound?.round.end)}
            </span>
          </div>

          {/* // status */}
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span className="text-gray-600">Status:</span>

            <div
              className={clsx(
                'px-3 py-0.5 rounded-full text-sm font-semibold',
                isRoundFinished
                  ? 'bg-red-100 text-red-800'
                  : isRoundYetToStart
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-green-100 text-green-800'
              )}
            >
              {isRoundFinished
                ? 'Finished'
                : isRoundYetToStart
                  ? 'Upcoming'
                  : 'Active'}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
