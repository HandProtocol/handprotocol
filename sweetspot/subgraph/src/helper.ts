// helper functions

import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  CurrentRound,
  GlobalStats,
  TokenBalance,
  User,
} from "../generated/schema";
import { TokenBalanceType } from "./types";

export const CURRENT_ROUND_ID = "current";
export const GLOBAL_ID = "global";

export function loadOrCreateUser(
  userAddress: string,
  event: ethereum.Event
): User {
  let user = User.load(userAddress);
  if (!user) {
    user = new User(userAddress);
    user.totalScore = BigInt.zero();
    user.createdAt = event.block.timestamp;
    user.save();

    let globalStats = loadOrCreateGlobalStats();
    globalStats.totalUsers = globalStats.totalUsers.plus(BigInt.fromI32(1));
    globalStats.save();
  }
  return user;
}

export function loadOrCreateTokenBalance(
  token: string,
  type: string
): TokenBalance {
  const typString = type.toString();
  let tokenBalance = TokenBalance.load(token + "-" + typString);
  if (!tokenBalance) {
    tokenBalance = new TokenBalance(token + "-" + typString);
    tokenBalance.token = token;
    tokenBalance.amount = BigInt.zero();
    tokenBalance.type = typString;
    tokenBalance.save();
  }
  return tokenBalance;
}

export function loadOrCreateGlobalStats(): GlobalStats {
  let globalStats = GlobalStats.load(GLOBAL_ID);
  if (!globalStats) {
    globalStats = new GlobalStats(GLOBAL_ID);
    globalStats.timesClaimed = BigInt.zero();
    globalStats.timesAlloted = BigInt.zero();
    globalStats.totalUsers = BigInt.zero();
    globalStats.save();
  }
  return globalStats;
}

export function getCurrentRound(): CurrentRound {
  let currentRound = CurrentRound.load(CURRENT_ROUND_ID);
  if (!currentRound) {
    throw new Error(
      "A round must be initialized before the function that emits this event is called "
    );
  }
  return currentRound;
}
