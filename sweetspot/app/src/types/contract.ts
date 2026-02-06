export interface RoundDetails {
  startTime: number
  endTime: number
  metadataUri: string
}

export interface UserBalances {
  claimableTokens: string
  allowedAmount: string
}

export interface ContractState {
  isConnected: boolean
  isOwner: boolean
  address: string | null
  roundDetails: RoundDetails | null
  userBalances: UserBalances | null
}
