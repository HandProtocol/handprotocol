import {
  Deposit,
  Withdraw,
  Claimed,
  AllowedAmountUpdated,
  RoundUpdated,
} from "../generated/sweetspot/sweetspot"
import {
  Donation,
  Round,
  CurrentRound,
  AllocatedToken,
} from "../generated/schema"
import { RoundMetadata as RoundMetadataTemplate } from "../generated/templates"
import { BigInt, store } from "@graphprotocol/graph-ts"
import {
  CURRENT_ROUND_ID,
  getCurrentRound,
  loadOrCreateGlobalStats,
  loadOrCreateTokenBalance,
  loadOrCreateUser,
} from "./helper"
import { TokenBalanceType } from "./types"

export function handleDeposit(event: Deposit): void {
  let user = loadOrCreateUser(event.params.depositor.toHex(), event)
  let tokenBalance = loadOrCreateTokenBalance(
    event.params.token.toHex(),
    TokenBalanceType.TOTAL
  )

  let donationId =
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let donation = new Donation(donationId)
  donation.user = user.id
  donation.token = event.params.token.toHex()
  donation.amount = event.params.amount
  donation.timestamp = event.block.timestamp
  donation.save()

  tokenBalance.amount = tokenBalance.amount.plus(event.params.amount)
  tokenBalance.save()
}

export function handleRoundUpdated(event: RoundUpdated): void {
  let roundId = event.transaction.hash.toHex()
  let ipfsMetadataURI = event.params.metadataURI

  let round = new Round(roundId)
  round.start = event.params.start
  round.end = event.params.end
  round.createdAt = event.block.timestamp

  // Extract CID from the IPFS URI
  let ipfsHash = ipfsMetadataURI.replace("ipfs://", "")
  if (!ipfsHash) return
  round.metadata = ipfsHash

  RoundMetadataTemplate.create(ipfsHash)

  round.save()

  // also save this round at round id CURRENT_ROUND_ID

  // Update the CurrentRound entity to reflect the most recent round
  let currentRound = CurrentRound.load(CURRENT_ROUND_ID)
  if (currentRound == null) {
    currentRound = new CurrentRound(CURRENT_ROUND_ID) // Static ID for CurrentRound
  }
  currentRound.round = round.id // Set the new round as current
  currentRound.updatedAt = event.block.timestamp // Update the timestamp
  currentRound.save()
}

export function handleAllowedAmountUpdated(event: AllowedAmountUpdated): void {
  let user = loadOrCreateUser(event.params.user.toHex(), event)
  let currentRound = getCurrentRound()

  let allocatedTokenBalance = loadOrCreateTokenBalance(
    event.params.token.toHex(),
    TokenBalanceType.ALLOCATED
  )

  let allocatedTokenId =
    user.id + "-" + event.params.token.toHex() + "-" + currentRound.round
  let allocatedToken = AllocatedToken.load(allocatedTokenId)

  let newAmount = event.params.newAmount

  // If allocation is being cleared (newAmount = 0)
  if (newAmount.equals(BigInt.zero())) {
    if (allocatedToken) {
      // Subtract the previous allocation from total allocated balance
      allocatedTokenBalance.amount = allocatedTokenBalance.amount.minus(
        allocatedToken.amount
      )
      allocatedTokenBalance.save()

      // delete the allocated token as it is no longer allocated
      store.remove("AllocatedToken", allocatedTokenId)
    }
    return
  }

  if (!allocatedToken) {
    allocatedToken = new AllocatedToken(allocatedTokenId)
    allocatedToken.user = user.id
    allocatedToken.token = event.params.token.toHex()
    allocatedToken.amount = newAmount
    allocatedToken.round = currentRound.round
    allocatedToken.claimedAmount = BigInt.zero()
  }

  // Handle updating existing allocation
  if (
    allocatedToken.claimedAmount.gt(BigInt.zero()) &&
    allocatedToken.amount.equals(allocatedToken.claimedAmount)
  ) {
    allocatedToken.amount = allocatedToken.amount.plus(newAmount)
  } else {
    // Subtract old amount from total balance before setting new amount
    if (allocatedToken.amount.gt(BigInt.zero())) {
      allocatedTokenBalance.amount = allocatedTokenBalance.amount.minus(
        allocatedToken.amount
      )
    }
    allocatedToken.amount = newAmount
  }

  allocatedToken.timestamp = event.block.timestamp
  allocatedToken.save()

  allocatedTokenBalance.amount = allocatedTokenBalance.amount.plus(newAmount)
  allocatedTokenBalance.save()

  let globalStats = loadOrCreateGlobalStats()
  globalStats.timesAlloted = globalStats.timesAlloted.plus(BigInt.fromI32(1))
  globalStats.save()
}

export function handleClaimed(event: Claimed): void {
  let user = loadOrCreateUser(event.params.claimant.toHex(), event)
  let tokenBalance = loadOrCreateTokenBalance(
    event.params.token.toHex(),
    TokenBalanceType.TOTAL
  )
  let claimedTokenBalance = loadOrCreateTokenBalance(
    event.params.token.toHex(),
    TokenBalanceType.CLAIMED
  )
  let globalStats = loadOrCreateGlobalStats()

  let currentRound = getCurrentRound()

  let allocatedTokenId =
    user.id + "-" + event.params.token.toHex() + "-" + currentRound.round

  let allocatedToken = AllocatedToken.load(allocatedTokenId)
  if (!allocatedToken) {
    throw new Error(
      "Can't claim if amount isn't allocated for the current round"
    )
  }
  allocatedToken.claimedAmount = allocatedToken.claimedAmount.plus(
    event.params.amount
  )
  allocatedToken.claimedTimeStamp = event.block.timestamp

  allocatedToken.save()

  tokenBalance.amount = tokenBalance.amount.minus(event.params.amount)
  tokenBalance.save()

  claimedTokenBalance.amount = claimedTokenBalance.amount.plus(
    event.params.amount
  )
  claimedTokenBalance.save()

  globalStats.timesClaimed = globalStats.timesClaimed.plus(BigInt.fromI32(1))
  globalStats.save()
}

export function handleWithdraw(event: Withdraw): void {
  let tokenBalance = loadOrCreateTokenBalance(
    event.params.token.toHex(),
    TokenBalanceType.TOTAL
  )
  tokenBalance.amount = tokenBalance.amount.minus(event.params.amount)
  tokenBalance.save()
}
