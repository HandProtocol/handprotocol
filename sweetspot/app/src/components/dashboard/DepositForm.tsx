import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, ChevronDown, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { Token, SUPPORTED_TOKENS } from '../../types/tokens'

export function DepositForm() {
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState<Token>(SUPPORTED_TOKENS[0])
  const [isTokenListOpen, setIsTokenListOpen] = useState(false)

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulated deposit
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success(`Successfully deposited ${amount} ${selectedToken.symbol}!`)
      setAmount('')
    } catch (error) {
      toast.error('Deposit failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token)
    setIsTokenListOpen(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Deposit</h2>
        <CreditCard className="h-6 w-6 text-purple-600" />
      </div>

      <form onSubmit={handleDeposit} className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Token
          </label>
          <button
            type="button"
            onClick={() => setIsTokenListOpen(!isTokenListOpen)}
            className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          >
            <div className="flex items-center space-x-2">
              <img
                src={selectedToken.logoUrl}
                alt={selectedToken.symbol}
                className="w-6 h-6 rounded-full"
              />
              <span>{selectedToken.symbol}</span>
            </div>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${isTokenListOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {isTokenListOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg"
              >
                {SUPPORTED_TOKENS.map((token) => (
                  <button
                    key={token.symbol}
                    type="button"
                    onClick={() => handleTokenSelect(token)}
                    className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-purple-50 transition-colors"
                  >
                    <img
                      src={token.logoUrl}
                      alt={token.symbol}
                      className="w-6 h-6 rounded-full"
                    />
                    <span>{token.symbol}</span>
                    <span className="text-sm text-gray-500">
                      - {token.name}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsTokenListOpen(false)}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-purple-50 transition-colors border-t border-gray-200"
                >
                  <Wallet className="w-6 h-6" />
                  <span>Custom ERC20 Token</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.000001"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              placeholder="0.00"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {selectedToken.symbol}
            </span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : `Deposit ${selectedToken.symbol}`}
        </motion.button>
      </form>
    </motion.div>
  )
}
