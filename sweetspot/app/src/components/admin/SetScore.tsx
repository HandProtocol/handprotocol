import React, { useState } from 'react'
import { User } from '../../graphql/generated'
import { SCORE_CATEGORIES } from './UserScores'
import { motion } from 'framer-motion'
import { useWriteContract } from 'wagmi'
import toast from 'react-hot-toast'
import {
  scorerContractABI,
  scorerContractAddress
} from '../../contracts/scorer/scorerContractnfo'
import { viemPublicClient } from '../../utils/viemClient'
import { useApolloClient } from '@apollo/client'
import { Address } from 'viem'

const SetScore = ({
  userAddress,
  userScore = 0,
  category,
  onClose
}: {
  userAddress?: Address
  userScore?: number
  category: (typeof SCORE_CATEGORIES)[0]
  onClose?: () => void
}) => {
  const [score, setScore] = useState<number>(userScore || 0)

  const { writeContractAsync } = useWriteContract()
  const client = useApolloClient()

  const handleSetNewScore = async () => {
    try {
      await toast.promise(
        (async () => {
          const tx = await writeContractAsync({
            abi: scorerContractABI,
            address: scorerContractAddress,
            functionName: 'setScore',
            args: [userAddress, category?.id, score]
          })
          await viemPublicClient.waitForTransactionReceipt({
            hash: tx,
            confirmations: 3
          })

          await client.refetchQueries({
            include: ['GetUsers']
          })
        })(),
        {
          error: 'Unable to confirm transaction',
          loading: 'Updating New Score',
          success: 'New Score Updated'
        }
      )
      onClose?.()
    } catch (error) {
      console.error(error)
      toast.error('Failed to set new score')
    }
  }

  return (
    <div className="p-4 bg-purple-50 rounded-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <category.icon className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold">{category.label}</h3>
          <p className="text-sm text-gray-600">{category.description}</p>
        </div>
      </div>
      <input
        type="number"
        onChange={(e) => {
          setScore(parseInt(e.target.value))
        }}
        className="border border-gray-300 rounded-md px-3 py-2 mb-4 w-full"
        value={score}
        placeholder="Score"
      />
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSetNewScore}
        className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors relative"
      >
        Set New Score
        {/* {showAnimation && (
                        <ScoreIncrementAnimation
                          emoji={category.emoji}
                          onComplete={() => setShowAnimation(false)}
                        />
                      )} */}
      </motion.button>
    </div>
  )
}

export default SetScore
