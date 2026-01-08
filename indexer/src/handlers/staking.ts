/**
 * Staking Handler
 *
 * Handles staking-related events from StakingFacet.
 * All events use simple names - no disambiguation needed.
 */

import { ponder } from '@/generated';
import {
  stakes,
  stakedEvents,
  unstakedEvents,
  rewardPaidEvents,
  userStakeStats,
} from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;
const stakeId = (user: string) => user.toLowerCase();
const safeSub = (a: bigint, b: bigint): bigint => (a > b ? a - b : 0n);

// ============================================================================
// STAKING
// ============================================================================

ponder.on('Diamond:Staked', async ({ event, context }) => {
  const { user, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const sId = stakeId(user);

  console.log(`[staking] Staked: ${amount} by ${user}`);

  const existing = await context.db.find(stakes, { id: sId });
  const newAmount = (existing?.amount ?? 0n) + amount;

  await context.db
    .insert(stakes)
    .values({
      id: sId,
      user,
      amount: newAmount,
      rewardsClaimed: 0n,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoUpdate({
      amount: newAmount,
      updatedAt: event.block.timestamp,
    });

  await context.db
    .insert(stakedEvents)
    .values({
      id,
      user,
      amount,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:Withdrawn', async ({ event, context }) => {
  const { user, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const sId = stakeId(user);

  console.log(`[staking] Withdrawn: ${amount} by ${user}`);

  const existing = await context.db.find(stakes, { id: sId });
  const newAmount = safeSub(existing?.amount ?? 0n, amount);

  if (existing) {
    await context.db.update(stakes, { id: sId }).set({
      amount: newAmount,
      updatedAt: event.block.timestamp,
    });
  }

  await context.db
    .insert(unstakedEvents)
    .values({
      id,
      user,
      amount,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:RewardsClaimed', async ({ event, context }) => {
  const { user, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const sId = stakeId(user);

  console.log(`[staking] RewardsClaimed: ${amount} by ${user}`);

  const existing = await context.db.find(stakes, { id: sId });
  const newRewards = (existing?.rewardsClaimed ?? 0n) + amount;

  if (existing) {
    await context.db.update(stakes, { id: sId }).set({
      rewardsClaimed: newRewards,
      updatedAt: event.block.timestamp,
    });
  }

  await context.db
    .insert(rewardPaidEvents)
    .values({
      id,
      user,
      reward: amount,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});
