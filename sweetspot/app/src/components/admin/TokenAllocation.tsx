import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Coins,
  Plus,
  Trash2,
  Check,
  Clock,
  PlusCircle,
  UserPlus
} from 'lucide-react'
import { UserAvatar } from '../UserAvatar'
import { QuickAllocation } from './QuickAllocation'
import { ethers } from 'ethers'
import { getSupportedToken, SUPPORTED_TOKENS } from '../../types/tokens'
import toast from 'react-hot-toast'
import { useWriteContract } from 'wagmi'
import {
  SweetSpotContractABI,
  SweetSpotContractAddress
} from '../../contracts/sweetspot/SweetSpotContractInfo'
import { valueInWei } from '../../utils/helpers'
import { viemPublicClient } from '../../utils/viemClient'
import {
  CurrentRoundAllocatedTokensDocument,
  useCurrentRoundAllocatedTokensQuery
} from '../../graphql/generated'
import EnsName from '../common/EnsName'
import { Address } from 'viem'
import { useApolloClient } from '@apollo/client'
import clsx from 'clsx'

export function TokenAllocation() {
  const [quickAllocationUser, setQuickAllocationUser] =
    useState<Address | null>(null)
  const { writeContractAsync } = useWriteContract()
  const { data: currentRound } = useCurrentRoundAllocatedTokensQuery()
  const [hoveredUser, setHoveredUser] = useState<Address | null>(null)

  const client = useApolloClient()

  const allocatedTokens =
    currentRound?.currentRounds?.[0]?.round?.allocatedTokens
  const groupedAllocatedTokens = allocatedTokens?.reduce<
    Record<string, typeof allocatedTokens>
  >((acc, token) => {
    const userId = token.user.id
    if (!acc[userId]) {
      acc[userId] = []
    }
    acc[userId].push(token)
    return acc
  }, {})

  const [newUser, setNewUser] = useState({
    address: '',
    token: SUPPORTED_TOKENS[0].symbol,
    amount: ''
  })

  const [pendingAllocations, setPendingAllocations] = useState<
    {
      userAddress: Address
      token: Address
      amount: string
      symbol: string
      decimals: number
    }[]
  >([])

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUser.address.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Please enter a valid Ethereum address')
      return
    }

    const selectedToken = SUPPORTED_TOKENS.find(
      (token) => token.symbol === newUser.token
    )

    if (!selectedToken) {
      toast.error('Invalid token selection')
      return
    }

    const userAddress = newUser.address as Address
    const tokenAddress = selectedToken.address as Address

    // Check if there's already an allocation for this user and token
    const existingAllocationIndex = pendingAllocations.findIndex(
      (allocation) =>
        allocation.userAddress.toLowerCase() === userAddress.toLowerCase() &&
        allocation.token.toLowerCase() === tokenAddress.toLowerCase()
    )

    if (existingAllocationIndex !== -1) {
      // Update the existing allocation instead of adding a new one
      const updatedAllocations = [...pendingAllocations]
      updatedAllocations[existingAllocationIndex] = {
        ...updatedAllocations[existingAllocationIndex],
        amount: newUser.amount
      }

      setPendingAllocations(updatedAllocations)
      toast.success('Updated existing allocation')
    } else {
      // Add new allocation
      setPendingAllocations([
        ...pendingAllocations,
        {
          userAddress,
          token: tokenAddress,
          amount: newUser.amount,
          symbol: selectedToken.symbol,
          decimals: selectedToken.decimals
        }
      ])

      toast.success('Allocation added to pending list')
    }

    setNewUser({
      address: '',
      token: SUPPORTED_TOKENS[0].symbol,
      amount: ''
    })
  }

  const handleAllocate = async (
    recipientAddress: Address,
    tokenSymbol: string,
    amount: string
  ) => {
    console.log('amount', amount)
    if (!recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Please enter a valid Ethereum address')
      return
    }

    try {
      const selectedToken = SUPPORTED_TOKENS.find(
        (token) => token.symbol === tokenSymbol
      )

      const tx = await writeContractAsync({
        abi: SweetSpotContractABI,
        address: SweetSpotContractAddress,
        functionName: 'setAllowedAmount',
        args: [
          recipientAddress,
          selectedToken?.address,
          valueInWei(amount, selectedToken?.decimals!)
        ]
      })

      await toast.promise(
        viemPublicClient.waitForTransactionReceipt({
          hash: tx,
          confirmations: 3
        }),
        {
          error: 'Unable to confirm new allocations',
          loading: 'Confirming allocations',
          success: 'Amount Allocated to address ' + recipientAddress
        }
      )

      await client.refetchQueries({
        include: ['CurrentRoundAllocatedTokens']
      })
    } catch (error) {
      console.error(error)
      toast.error('An Error Occured')
    }
  }

  const handleConfirmAllocations = async () => {
    if (pendingAllocations.length === 0) {
      toast.error('No pending allocations to confirm')
      return
    }

    try {
      if (pendingAllocations.length === 1) {
        // Single allocation
        const allocation = pendingAllocations[0]

        const tx = await writeContractAsync({
          abi: SweetSpotContractABI,
          address: SweetSpotContractAddress,
          functionName: 'setAllowedAmount',
          args: [
            allocation.userAddress,
            allocation.token,
            valueInWei(allocation.amount, allocation.decimals)
          ]
        })

        await toast.promise(
          viemPublicClient.waitForTransactionReceipt({
            hash: tx,
            confirmations: 3
          }),
          {
            error: 'Unable to confirm allocation',
            loading: 'Confirming allocation',
            success: 'Allocation confirmed successfully'
          }
        )
      } else {
        // Bulk allocation with parallel arrays
        const tokens = pendingAllocations.map((a) => a.token)
        const users = pendingAllocations.map((a) => a.userAddress)
        const amounts = pendingAllocations.map((a) =>
          valueInWei(a.amount, a.decimals)
        )

        const tx = await writeContractAsync({
          abi: SweetSpotContractABI,
          address: SweetSpotContractAddress,
          functionName: 'bulkSetAllowedAmount',
          args: [tokens, users, amounts]
        })

        await toast.promise(
          viemPublicClient.waitForTransactionReceipt({
            hash: tx,
            confirmations: 3
          }),
          {
            error: 'Unable to confirm bulk allocations',
            loading: 'Confirming bulk allocations',
            success: `${pendingAllocations.length} allocations confirmed successfully`
          }
        )
      }

      await client.refetchQueries({
        include: ['CurrentRoundAllocatedTokens']
      })

      // Clear pending allocations after successful confirmation
      setPendingAllocations([])
    } catch (error) {
      console.error(error)
      toast.error('Failed to confirm allocations')
    }
  }

  const handleRemovePendingAllocation = (index: number) => {
    setPendingAllocations(pendingAllocations.filter((_, i) => i !== index))
  }

  const handleRemoveAllocation = async (
    userAddress: Address,
    tokenAddress: Address
  ) => {
    const token = getSupportedToken(tokenAddress)
    try {
      const tx = await writeContractAsync({
        address: SweetSpotContractAddress,
        abi: SweetSpotContractABI,
        functionName: 'setAllowedAmount',
        args: [userAddress, token?.address, valueInWei(0, token?.decimals!)]
      })

      await toast.promise(
        viemPublicClient.waitForTransactionReceipt({
          hash: tx,
          confirmations: 3
        }),
        {
          error: 'Failed to remove allocation',
          loading: 'Removing allocation...',
          success: 'Allocation removed successfully'
        }
      )

      await client.refetchQueries({
        include: ['CurrentRoundAllocatedTokens']
      })
    } catch (error) {
      console.error(error)
      toast.error('Failed to remove allocation')
    }
  }

  return (
    <div className="space-y-8 py-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sweet Spot Allocation</h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Current Round Allocations</h2>
          <Coins className="h-6 w-6 text-purple-600" />
        </div>

        <div className="overflow-x-auto mb-8">
          <table className="min-w-full divide-y divide-gray-400">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remove Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Add Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-400">
              {groupedAllocatedTokens &&
                Object.entries(groupedAllocatedTokens).map(
                  (userAllocatedTokens) => {
                    const userAllocations = userAllocatedTokens[1]
                    const userAddress = userAllocatedTokens[0] as Address
                    return userAllocations.map(
                      (allocation, allocationIndex) => {
                        const isClaimed =
                          allocation.claimedAmount === allocation.amount
                        return (
                          <tr
                            key={`${allocation?.id}`}
                            className={clsx(
                              hoveredUser === userAddress && 'bg-gray-100'
                            )}
                            onMouseEnter={() => setHoveredUser(userAddress)}
                            onMouseLeave={() => setHoveredUser(null)}
                          >
                            {allocationIndex === 0 && (
                              <td
                                className="px-6 py-4 whitespace-nowrap"
                                rowSpan={userAllocations.length}
                              >
                                <div className="flex items-center">
                                  <UserAvatar address={userAddress} />
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {
                                        <EnsName
                                          address={userAddress as Address}
                                          className="text-sm font-medium text-gray-900"
                                        />
                                      }
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {userAddress}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="start-center-row gap-x-2">
                                <img
                                  src={
                                    getSupportedToken(
                                      allocation.token as Address
                                    )?.logoUrl
                                  }
                                  className="w-6 h-6"
                                />
                                <div className="text-sm text-gray-900">
                                  {
                                    getSupportedToken(
                                      allocation.token as Address
                                    )?.symbol
                                  }
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {ethers.formatUnits(
                                  allocation.amount,
                                  getSupportedToken(allocation.token as Address)
                                    ?.decimals
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  isClaimed
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {isClaimed ? (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Claimed
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-4 w-4 mr-1" />
                                    Pending
                                  </>
                                )}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {isClaimed ? (
                                <div>-</div>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() =>
                                    handleRemoveAllocation(
                                      userAddress,
                                      allocation.token as Address
                                    )
                                  }
                                  className="inline-flex items-center space-x-1 text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Remove
                                  </span>
                                </motion.button>
                              )}
                            </td>
                            {allocationIndex === 0 && (
                              <td
                                className="px-6 py-4 whitespace-nowrap text-center"
                                rowSpan={userAllocations.length}
                              >
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() =>
                                    setQuickAllocationUser(userAddress)
                                  }
                                  className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-700"
                                >
                                  <PlusCircle className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Add
                                  </span>
                                </motion.button>
                              </td>
                            )}
                          </tr>
                        )
                      }
                    )
                  }
                )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <div className="flex items-center gap-3 mb-6 bg-purple-50 p-4 rounded-lg">
            <div className="p-2.5 bg-purple-100 rounded-full">
              <UserPlus className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800">
              Allocate Token To New User
            </h3>
          </div>

          <form
            onSubmit={handleAddUser}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg shadow-sm"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Wallet Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Coins className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={newUser.address}
                  onChange={(e) =>
                    setNewUser({ ...newUser, address: e.target.value })
                  }
                  className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-colors"
                  placeholder="0x..."
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                {"Enter the recipient's wallet address"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Token
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Coins className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={newUser.token}
                  onChange={(e) =>
                    setNewUser({ ...newUser, token: e.target.value })
                  }
                  className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-colors bg-white"
                >
                  {SUPPORTED_TOKENS.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol} - {token.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Select the token to allocate
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Initial Allocation Amount
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Coins className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={newUser.amount}
                  onChange={(e) =>
                    setNewUser({ ...newUser, amount: e.target.value })
                  }
                  className="w-full pl-10 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-colors"
                  placeholder="Enter amount"
                  min="0"
                  step="0.000001"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                Specify how many tokens to allocate
              </p>
            </div>

            <div className="md:col-span-2 pt-4">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3.5 rounded-lg font-medium hover:from-purple-700 hover:to-purple-800 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add Allocation</span>
              </motion.button>
            </div>
          </form>
        </div>

        {pendingAllocations.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <Coins className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Pending Allocations</h3>
              </div>
              <span className="text-sm text-gray-500">
                {pendingAllocations.length} allocation
                {pendingAllocations.length !== 1 ? 's' : ''} pending
              </span>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Token
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingAllocations.map((allocation, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {allocation.userAddress}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {allocation.symbol}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {allocation.amount}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRemovePendingAllocation(index)}
                          className="inline-flex items-center space-x-1 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Remove</span>
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirmAllocations}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              {pendingAllocations.length > 1
                ? `Confirm Bulk Allocation (${pendingAllocations.length} items)`
                : 'Confirm Single Allocation'}
            </motion.button>
          </div>
        )}
      </motion.div>

      <QuickAllocation
        userAddress={quickAllocationUser}
        onClose={() => setQuickAllocationUser(null)}
        handleAllocate={handleAllocate}
      />
    </div>
  )
}
