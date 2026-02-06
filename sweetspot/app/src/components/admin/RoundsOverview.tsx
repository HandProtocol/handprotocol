import React from 'react'
import { AlertCircle } from 'lucide-react'
import { useCurrentRoundsQuery } from '../../graphql/generated'
import { RoundCard } from '../sweetverse/RoundsTab'

export function RoundsOverview() {
  const { data: currentRoundsData } = useCurrentRoundsQuery()

  const currentRound = currentRoundsData?.currentRounds?.[0]?.round

  return (
    <div className="space-y-8">
      {currentRound && (
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <AlertCircle className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold">
              {Number(currentRound?.end) * 1000 < Date.now()
                ? 'Last Round'
                : 'Active Round'}
            </h2>
          </div>
          <RoundCard round={currentRound} />
        </div>
      )}
    </div>
  )
}
