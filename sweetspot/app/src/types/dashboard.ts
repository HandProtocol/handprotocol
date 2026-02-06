import { RoundDetails, UserBalances } from './contract'

export const MOCK_DASHBOARD_DATA = {
  roundDetails: {
    startTime: Math.floor(Date.now() / 1000) - 86400, // 24h ago
    endTime: Math.floor(Date.now() / 1000) + 86400 * 6, // 6 days from now
    metadataUri: 'ipfs://QmXxxx'
  } as RoundDetails,

  balances: {
    claimableTokens: '1000000000000000000', // 1 COOKIE
    allowedAmount: '100000000000000000' // 0.1 ETH
  } as UserBalances
}
