import { BigInt, ByteArray, crypto, log, store } from "@graphprotocol/graph-ts";
import {
  RoleGranted,
  RoleRevoked,
  ScoreTypeAdded,
  ScoreTypeRemoved,
  ScoreUpdated,
} from "../generated/Scorer/Scorer";
import { Admin, Score, ScoreType } from "../generated/schema";
import { loadOrCreateUser } from "./helper";

export const ADMIN_ROLE_HEX = crypto
  .keccak256(ByteArray.fromUTF8("ADMIN_ROLE"))
  .toHex();

export function handleRoleGranted(event: RoleGranted): void {
  const isAdminRoleGranted =
    event.params.role.toHex().trim().toLowerCase() ==
    ADMIN_ROLE_HEX.trim().toLowerCase();
  if (!isAdminRoleGranted) return;
  let admin = new Admin(event.params.account.toHex());
  admin.appointedAt = event.block.timestamp;
  admin.save();
}

export function handleRoleRevoked(event: RoleRevoked): void {
  const isAdminRoleRevoked = event.params.role.toHex() == ADMIN_ROLE_HEX;
  if (!isAdminRoleRevoked) return;
  let adminId = event.params.account.toHex();
  store.remove("Admin", adminId);
}

export function handleScoreTypeAdded(event: ScoreTypeAdded): void {
  let scoreType = new ScoreType(event.params.scoreType);
  scoreType.save();
}

export function handleScoreTypeRemoved(event: ScoreTypeRemoved): void {
  let scoreTypeId = event.params.scoreType;
  // remove score type
  store.remove("ScoreType", scoreTypeId);
}

export function handleScoreUpdated(event: ScoreUpdated): void {
  const user = loadOrCreateUser(event.params.user.toHex(), event);

  let scoreId = `${user.id}-${event.params.scoreType}`;
  let score = Score.load(scoreId);
  if (!score) {
    score = new Score(scoreId);
    score.user = user.id;
    score.scoreType = event.params.scoreType;
    score.value = BigInt.zero();
  }

  // Update score
  let oldScore = score.value;
  score.value = event.params.newScore;
  score.save();

  // Update user's total score
  user.totalScore = user.totalScore.minus(oldScore).plus(score.value);
  user.save();
}
