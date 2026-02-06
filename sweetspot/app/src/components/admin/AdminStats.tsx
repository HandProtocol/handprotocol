import React from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Wallet,
  Clock,
  PiggyBank,
  LineChart,
  ArrowUpRight,
  TrendingUp,
  ArrowDownRight,
  Activity,
  DollarSign
} from 'lucide-react'
import { formatEther, formatDate } from '../../utils/formatters'
import {
  TokenBalanceType,
  useTokenBalancesQuery
} from '../../graphql/generated'
import { getSupportedToken, SUPPORTED_TOKENS } from '../../types/tokens'
import { Address, formatUnits } from 'viem'

// Enhanced mock data
const MOCK_STATS = {
  totalUsers: 157,
  activeUsers: 89,
  claimedUsers: 68,
  treasuryBalance: {
    ETH: '15000000000000000000', // 15 ETH
    USDGLO: '50000000000000000000000', // 50,000 USDGLO
    USDC: '75000000000' // 75,000 USDC
  },
  treasuryMetrics: {
    totalValueLocked: 250000, // in USD
    dailyVolume: 15000,
    weeklyGrowth: 12.5,
    monthlyGrowth: 45.8,
    transactions: {
      daily: 145,
      weekly: 876,
      monthly: 3245
    }
  },
  rewardPool: {
    COOKIE: '1000000000000000000000000', // 1,000,000 COOKIE
    distribution: {
      daily: '50000000000000000000000', // 50,000 COOKIE
      weekly: '350000000000000000000000', // 350,000 COOKIE
      monthly: '1500000000000000000000000' // 1,500,000 COOKIE
    }
  },
  roundTimeLeft: 432000 // 5 days in seconds
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
}

function StatCard({ title, value, icon, trend, subtitle }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 text-sm font-medium">{title}</span>
        <div className="p-2 bg-purple-50 rounded-lg">{icon}</div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div
              className={`flex items-center mt-2 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {trend.value}% from last period
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function MetricCard({
  title,
  value,
  change
}: {
  title: string
  value: string | number
  change: number
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-lg font-semibold mt-1">{value}</p>
      </div>
      <div
        className={`flex items-center ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}
      >
        {change >= 0 ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <ArrowDownRight className="h-4 w-4" />
        )}
        <span className="text-sm font-medium ml-1">{Math.abs(change)}%</span>
      </div>
    </div>
  )
}

export function AdminStats() {
  const secondsToTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return `${days}d ${hours}h`
  }

  const { data: tokenBalanceData } = useTokenBalancesQuery({
    variables: {
      where: {
        type: TokenBalanceType.Total
      }
    }
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Value Locked"
          value={`$${MOCK_STATS.treasuryMetrics.totalValueLocked.toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6 text-purple-600" />}
          trend={{
            value: MOCK_STATS.treasuryMetrics.weeklyGrowth,
            isPositive: true
          }}
          subtitle="Across all tokens"
        />
        <StatCard
          title="24h Volume"
          value={`$${MOCK_STATS.treasuryMetrics.dailyVolume.toLocaleString()}`}
          icon={<Activity className="h-6 w-6 text-purple-600" />}
          trend={{ value: 8.5, isPositive: true }}
          subtitle="Total daily transactions"
        />
        <StatCard
          title="Active Users"
          value={MOCK_STATS.activeUsers}
          icon={<Users className="h-6 w-6 text-purple-600" />}
          trend={{ value: 12, isPositive: true }}
          subtitle="Currently participating"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Treasury Balance</h2>
            <PiggyBank className="h-6 w-6 text-purple-600" />
          </div>
          <div className="space-y-4">
            {tokenBalanceData?.tokenBalances.map((tokenBalance) => {
              const token = getSupportedToken(tokenBalance?.token as Address)
              if (!token) return null
              return (
                <div
                  key={tokenBalance.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <img
                        src={token.logoUrl}
                        alt={token?.address}
                        className="w-6 h-6"
                      />
                    </div>
                    <span className="font-medium">{token?.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatUnits(tokenBalance.amount, token?.decimals)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-lg font-semibold mb-4">Treasury Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MetricCard
                title="Monthly Growth"
                value={`${MOCK_STATS.treasuryMetrics.monthlyGrowth}%`}
                change={MOCK_STATS.treasuryMetrics.monthlyGrowth}
              />
              <MetricCard
                title="Weekly Growth"
                value={`${MOCK_STATS.treasuryMetrics.weeklyGrowth}%`}
                change={MOCK_STATS.treasuryMetrics.weeklyGrowth}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Reward Pool</h2>
            <Wallet className="h-6 w-6 text-purple-600" />
          </div>
          <div className="space-y-6">
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Total COOKIE</span>
                <span className="font-bold">
                  {formatEther(MOCK_STATS.rewardPool.COOKIE)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-purple-600 rounded-full"
                  style={{ width: '45%' }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Distribution Metrics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Daily</p>
                  <p className="font-bold mt-1">
                    {parseInt(
                      formatEther(MOCK_STATS.rewardPool.distribution.daily)
                    ).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">COOKIE</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Weekly</p>
                  <p className="font-bold mt-1">
                    {parseInt(
                      formatEther(MOCK_STATS.rewardPool.distribution.weekly)
                    ).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">COOKIE</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Monthly</p>
                  <p className="font-bold mt-1">
                    {parseInt(
                      formatEther(MOCK_STATS.rewardPool.distribution.monthly)
                    ).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">COOKIE</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Round Time Remaining</span>
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold mt-2">
                {secondsToTime(MOCK_STATS.roundTimeLeft)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
