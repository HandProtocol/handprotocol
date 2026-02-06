import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gift,
  History,
  ExternalLink,
  X,
  ChevronRight,
  Calendar,
  ArrowUpRight
} from 'lucide-react'
import { DONATION_PLATFORMS, MOCK_PAST_DONATIONS } from '../../types/donations'
import { formatDate } from '../../utils/formatters'

interface DonationSuggestionsModalProps {
  isOpen: boolean
  onClose: () => void
  claimedAmount: string
  claimedToken: string
}

export function DonationSuggestionsModal({
  isOpen,
  onClose,
  claimedAmount,
  claimedToken
}: DonationSuggestionsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Gift className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Pay It Forward</h2>
                    <p className="text-sm text-gray-600">
                      You claimed {claimedAmount} {claimedToken}. Consider
                      supporting these initiatives.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* Donation Platforms */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Suggested Platforms</h3>
                  <span className="text-sm text-gray-500">
                    {DONATION_PLATFORMS.length} available
                  </span>
                </div>
                <div className="space-y-4">
                  {DONATION_PLATFORMS.map((platform) => (
                    <motion.a
                      key={platform.id}
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{platform.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {platform.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {platform.categories.map((category) => (
                              <span
                                key={category}
                                className="px-2 py-1 bg-white rounded-full text-xs text-gray-600"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* Past Donations */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <History className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">Your Past Donations</h3>
                </div>
                <div className="space-y-4">
                  {MOCK_PAST_DONATIONS.map((donation) => (
                    <div
                      key={donation.id}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{donation.recipient}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {donation.amount} {donation.token.symbol}
                          </p>
                          <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(donation.date)}</span>
                          </div>
                        </div>
                        <a
                          href={`https://etherscan.io/tx/${donation.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                  {MOCK_PAST_DONATIONS.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No past donations found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Your donations help sustain the ecosystem
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex items-center space-x-2 text-purple-600"
                >
                  <span>Maybe Later</span>
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
