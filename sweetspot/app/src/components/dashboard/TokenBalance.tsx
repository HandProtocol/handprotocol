import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Coins } from 'lucide-react'
import { UserBalances } from '../../types/contract'
import { formatEther } from '../../utils/formatters'
import { DonationSuggestionsModal } from '../donations/DonationSuggestionsModal'
import toast from 'react-hot-toast'
import { useAccount, useWriteContract } from 'wagmi'
import {
  SweetSpotContractABI,
  SweetSpotContractAddress
} from '../../contracts/sweetspot/SweetSpotContractInfo'
import { getSupportedToken, SUPPORTED_TOKENS } from '../../types/tokens'
import { viemPublicClient } from '../../utils/viemClient'
import {
  useAllocatedTokensQuery,
  useCurrentRoundsQuery
} from '../../graphql/generated'
import { Address } from 'viem'
import { useApolloClient } from '@apollo/client'
import { formatUnits } from 'ethers'

export function TokenBalance() {
  const { address } = useAccount()
  const { data } = useCurrentRoundsQuery()
  const currentRound = data?.currentRounds[0]

  const isRoundYetToStart = Date.now() < currentRound?.round.start * 1000
  const isRoundFinished = Date.now() > currentRound?.round.end * 1000
  const isRoundActive = !isRoundFinished && !isRoundYetToStart

  const [showDonationModal, setShowDonationModal] = useState(false)
  const [claimedAmount, setClaimedAmount] = useState('')
  const { writeContractAsync } = useWriteContract()

  const client = useApolloClient()

  const { data: allocatedTokens } = useAllocatedTokensQuery({
    variables: {
      where: {
        user: address?.toLowerCase(),
        round: currentRound?.round?.id
      }
    },
    skip: !address || !currentRound?.round?.id
  })

  const unclaimedTokens = allocatedTokens?.allocatedTokens?.filter((token) => {
    // check if claimedAmount is less than amount
    return Number(token?.amount) > Number(token?.claimedAmount)
  })

  const handleClaim = async () => {
    try {
      await toast.promise(
        (async () => {
          const tx = await writeContractAsync({
            abi: SweetSpotContractABI,
            address: SweetSpotContractAddress,
            functionName: 'claim',
            args: [unclaimedTokens?.[0]?.token]
          })

          await viemPublicClient.waitForTransactionReceipt({
            hash: tx,
            confirmations: 3
          })

          await client.refetchQueries({
            include: ['AllocatedTokens']
          })
        })(),
        {
          error: 'Error Claiming token',
          loading: 'Claiming Tokens',
          success: 'Claimed Allocated Tokens'
        }
      )
    } catch (error) {
      console.error(error)
      toast.error('Failed to claim tokens.')
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Claimable Tokens</h2>
          <Coins className="h-6 w-6 text-purple-600" />
        </div>

        <div className="space-y-4">
          {unclaimedTokens?.length ? (
            unclaimedTokens?.map((token) => {
              const tokenInfo = getSupportedToken(token?.token as Address)!
              const unCliamedAmountInWei =
                Number(token?.amount) - Number(token?.claimedAmount)
              const unCliamedAmount = formatUnits(
                String(unCliamedAmountInWei),
                tokenInfo?.decimals
              )

              return (
                <div className="between-row" key={token?.id}>
                  <div className="start-center-row gap-x-2">
                    <img src={tokenInfo.logoUrl} alt="" className="h-8 w-8" />
                    <div>{tokenInfo?.symbol} </div>
                  </div>
                  <div className="font-semibold">{unCliamedAmount}</div>
                </div>
              )
            })
          ) : (
            <div className="text-gray-600">
              No tokens to claim for this round.
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClaim}
            disabled={!unclaimedTokens?.length || !isRoundActive}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-purple-300"
          >
            {isRoundActive && unclaimedTokens?.length
              ? `Claim ${getSupportedToken(unclaimedTokens?.[0]?.token as Address)?.symbol} Tokens `
              : isRoundYetToStart
                ? 'Round Not Started'
                : isRoundFinished
                  ? 'Round Finished'
                  : 'No Tokens to Claim'}
          </motion.button>
        </div>
      </motion.div>

      <DonationSuggestionsModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
        claimedAmount={claimedAmount}
        claimedToken="COOKIE"
      />
    </>
  )
}
