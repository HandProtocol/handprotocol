import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Coins, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { SUPPORTED_TOKENS } from '../../types/tokens'
import { formatAddress } from '../../utils/formatters'
import { Address } from 'viem'
import useEns from '../../hooks/useEns'

interface QuickAllocationProps {
  userAddress: Address | null
  handleAllocate: (
    recipientAddress: Address,
    tokenSymbol: string,
    amount: string
  ) => void
  onClose: () => void
}

export function QuickAllocation({
  userAddress,
  handleAllocate,
  onClose
}: QuickAllocationProps) {
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0])

  const { ensName } = useEns({
    address: userAddress
  })

  if (!userAddress) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await handleAllocate(userAddress, selectedToken.symbol, amount)
      onClose()
    } catch (error) {
      toast.error('Failed to allocate tokens')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <Coins className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-bold">Quick Token Allocation</h2>
        </div>

        <div className="mb-6">
          <h3 className="font-medium mb-2">Allocating to:</h3>
          <div className="flex items-center space-x-2 text-gray-600">
            <span>{ensName}</span>
            <span className="text-gray-400">{formatAddress(userAddress)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Token
            </label>
            <select
              value={selectedToken.symbol}
              onChange={(e) =>
                setSelectedToken(
                  SUPPORTED_TOKENS.find((t) => t.symbol === e.target.value)!
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            >
              {SUPPORTED_TOKENS.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              placeholder={`Enter amount in ${selectedToken.symbol}`}
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Allocate Tokens
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}
