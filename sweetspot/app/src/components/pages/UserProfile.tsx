'use client'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Shield,
  Clock,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Activity,
  BarChart3,
  Star,
  Copy,
  CheckCircle,
  Info
} from 'lucide-react'
import {
  formatAddress,
  formatDate,
  formatShortDate
} from '../../utils/formatters'
import { UserAvatar } from '../UserAvatar'
import {
  MOCK_ALLOCATION_HISTORY,
  MOCK_FINANCIAL_STATS
} from '../../types/profile'
import { useAccount } from 'wagmi'
import useEns from '../../hooks/useEns'
import { Address, formatUnits } from 'viem'
import { AllocatedToken, User, useUserQuery } from '../../graphql/generated'
import { getSupportedToken } from '../../types/tokens'
import {
  extractPassportScore,
  getPassportScore
} from '../../api/gitcoinPassport'
import { Tooltip } from '@mui/material'

type PassportScoreState = {
  score: number | null
  isLoading: boolean
  error: string | null
}

function MetricCard({
  title,
  value,
  icon,
  trend = null
}: {
  title: string
  value: string
  icon: any
  trend: any
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-4 sm:p-6"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-600 text-sm">{title}</span>
        <div className="p-2 bg-purple-50 rounded-lg">
          {/* <Icon className="h-5 w-5 text-purple-600" /> */}
        </div>
      </div>
      <div className="text-lg sm:text-2xl font-bold">{value}</div>
      {trend && (
        <div
          className={`flex items-center mt-2 ${trend.positive ? 'text-green-500' : 'text-red-500'}`}
        >
          <TrendingUp
            className={`h-4 w-4 ${!trend.positive && 'rotate-180'}`}
          />
          <span className="text-sm ml-1">{trend.value}% from last period</span>
        </div>
      )}
    </motion.div>
  )
}

function AllocationHistoryTable({
  allocations
}: {
  allocations: AllocatedToken[]
}) {
  const [currentPage, setCurrentPage] = useState(1)
  // const [sortConfig, setSortConfig] = useState({
  //   key: 'date',
  //   direction: 'desc'
  // })
  const [filter, setFilter] = useState<
    'all' | 'claimed' | 'pending' | 'expired'
  >('all')

  const itemsPerPage = 10
  const filteredData = allocations.filter(
    (item) =>
      filter === 'all' ||
      (filter === 'claimed' && item.claimedAmount === item.amount) ||
      (filter === 'pending' &&
        Number(item.round.end) * 1000 > Date.now() &&
        item.claimedAmount < item.amount) ||
      (filter === 'expired' &&
        Number(item.round.end) * 1000 < Date.now() &&
        item.claimedAmount < item.amount)
  )

  // const handleSort = (key: string) => {
  //   setSortConfig((prev) => ({
  //     key,
  //     direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
  //   }))
  // }

  // Mobile card view for each allocation
  const MobileAllocationCard = ({ item }: { item: AllocatedToken }) => {
    const isClaimed = item.claimedAmount === item.amount
    const isExpired = Number(item.round.end) * 1000 < Date.now() && !isClaimed
    const isPending = Number(item.round.end) * 1000 > Date.now() && !isClaimed
    const status = isClaimed ? 'Claimed' : isPending ? 'Pending' : 'Expired'
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-sm text-gray-500">
              {formatShortDate(item.timestamp)}
            </span>
            <div className="font-medium">
              {getSupportedToken(item.token as Address)?.symbol}
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isClaimed
                ? 'bg-green-100 text-green-800'
                : isPending
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {status}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Amount</span>
          <span className="font-medium">
            {formatUnits(
              item.amount,
              getSupportedToken(item.token as Address)?.decimals!
            )}
          </span>
        </div>
        {/* <div className="flex justify-between items-center text-sm mt-1">
          <span className="text-gray-600">Value</span>
          <span className="font-medium">${item.usdValue.toLocaleString()}</span>
        </div> */}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Allocation History</h2>
          <select
            value={filter}
            // @ts-ignore
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="claimed">Claimed</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block sm:hidden">
        <div className="divide-y divide-gray-100">
          {filteredData?.length > 0 &&
            filteredData.map((item) => (
              <div key={item.id} className="p-4">
                <MobileAllocationCard item={item} />
              </div>
            ))}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((item) => {
              const isClaimed = item.claimedAmount === item.amount
              const isPending =
                Number(item.round.end) * 1000 > Date.now() && !isClaimed
              const isExpired =
                Number(item.round.end) * 1000 < Date.now() && !isClaimed
              const status = isClaimed
                ? 'Claimed'
                : isPending
                  ? 'Pending'
                  : 'Expired'

              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {`${formatShortDate(item.timestamp)}${isClaimed ? ' (✅ ' + formatShortDate(item.claimedTimeStamp) + ')' : ''}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getSupportedToken(item.token as Address)?.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatUnits(
                      item.amount,
                      getSupportedToken(item.token as Address)?.decimals!
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isClaimed
                          ? 'bg-green-100 text-green-800'
                          : isPending
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-gray-700 order-2 sm:order-1">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredData.length)} of{' '}
            {filteredData.length} entries
          </span>
          <div className="flex space-x-2 order-1 sm:order-2 w-full sm:w-auto">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex-1 sm:flex-none px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage * itemsPerPage >= filteredData.length}
              className="flex-1 sm:flex-none px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// New component for Score display with tooltip
function ScoreDisplay({
  value,
  label,
  bgColor,
  textColor,
  isLoading = false,
  error = null,
  tooltipText
}: {
  value: any
  label: string
  bgColor: string
  textColor: string
  isLoading?: boolean
  error?: string | null
  tooltipText: string
}) {
  return (
    <div className="text-center relative">
      <div
        className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${bgColor}`}
      >
        <div className={`text-2xl font-bold ${textColor}`}>
          {isLoading ? (
            <span className="text-base">Loading...</span>
          ) : error ? (
            <span className="text-base text-red-500">Error</span>
          ) : (
            value
          )}
        </div>
      </div>
      <div className="mt-2 text-sm text-gray-600 flex items-center justify-center">
        {label}
        <Tooltip title={tooltipText} arrow placement="top">
          <button
            className="ml-1 focus:outline-none"
            aria-label={`Information about ${label}`}
          >
            <Info className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}

export function UserProfile({ address }: { address: Address }) {
  const { address: connectedAddress } = useAccount()
  const { ensName } = useEns({ address })
  const { data } = useUserQuery({
    variables: {
      id: address.toLowerCase()
    }
  })

  const [passportScore, setPassportScore] = useState<PassportScoreState>({
    score: null,
    isLoading: false,
    error: null
  })

  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    const fetchPassportScore = async () => {
      if (!address) return

      setPassportScore((prev) => ({ ...prev, isLoading: true }))
      try {
        const response = await getPassportScore(address)
        setPassportScore({
          score: extractPassportScore(response),
          isLoading: false,
          error: null
        })
      } catch (error) {
        setPassportScore({
          score: null,
          isLoading: false,
          error:
            error instanceof Error ? error.message : 'Failed to fetch score'
        })
      }
    }

    fetchPassportScore()
  }, [address])

  const formatMemberSince = (timestamp: number) => {
    const date = new Date(timestamp * 1000) // Convert seconds to milliseconds
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date)
  }

  const trustScore = data?.user?.scores?.find(
    (score) => score.scoreType === 'Trust'
  )?.value

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 min-h-screen h-fit overflow-y-auto">
      {/* Profile Overview - Enhanced */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <UserAvatar address={address} size="lg" />

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 mb-3">
              <h1 className="text-2xl font-bold">
                {ensName ?? formatAddress(address as Address)}
              </h1>
              {data?.user?.totalScore > 0 && (
                <div className="flex items-center bg-blue-50 px-2 py-1 rounded-full">
                  <Shield className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-xs font-medium text-blue-600">
                    Verified
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                <Wallet className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-mono">
                  {formatAddress(address as Address, 11)}
                </span>
                <button
                  onClick={() => copyToClipboard(address)}
                  className="focus:outline-none transition-colors"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>

              {data?.user && (
                <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    Member since{' '}
                    <span className="font-semibold">
                      {formatMemberSince(Number(data?.user?.createdAt))}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="text-center flex gap-4 justify-center mt-4 sm:mt-0">
            <ScoreDisplay
              value={trustScore || '—'}
              label="Trust Score"
              bgColor="bg-purple-100"
              textColor="text-purple-600"
              tooltipText="Your Trust Score reflects your reputation within the SweetSpot ecosystem based on your activity and contributions."
            />

            <ScoreDisplay
              value={passportScore.score}
              label="Passport Score"
              bgColor="bg-green-100"
              textColor="text-green-600"
              isLoading={passportScore.isLoading}
              error={passportScore.error}
              tooltipText="Gitcoin Passport score measures your decentralized identity verification across Web3 platforms."
            />
          </div>
        </div>
      </div>

      {/* Allocation History */}
      {data?.user?.allocatedTokens &&
        data?.user?.allocatedTokens?.length > 0 && (
          // @ts-ignore
          <AllocationHistoryTable allocations={data?.user?.allocatedTokens} />
        )}

      {/* Additional Metrics */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Transaction Metrics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Transaction Value</span>
              <span className="font-bold">
                $
                {(
                  MOCK_FINANCIAL_STATS.totalClaimed.usdValue /
                  MOCK_FINANCIAL_STATS.totalTransactions
                ).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Most Used Token</span>
              <span className="font-bold">SWEET</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Platform Engagement</span>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 mr-1" />
                <span className="font-bold">High</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Monthly Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Claims This Month</span>
              <span className="font-bold">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Days</span>
              <span className="font-bold">18</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Contribution Score</span>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 mr-1" />
                <span className="font-bold">92/100</span>
              </div>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  )
}
