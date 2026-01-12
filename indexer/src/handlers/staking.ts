/**
 * Staking Handler
 *
 * Handles staking-related events from StakingFacet.
 * All events use simple names - no disambiguation needed.
 *
 * Note: Stores only raw events - repositories handle aggregation at query time.
 */

import { ponder } from '@/generated';
import {
  stakes,
  stakedEvents,
  unstakedEvents,
  rewardPaidEvents,
} from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;
const safeSub = (a: bigint, b: bigint): bigint => (a > b ? a - b : 0n);

// ============================================================================
// STAKING - Store only raw events
// ============================================================================

ponder.on('Diamond:Staked', async ({ event, context }) => {
  const { user, amount, operationId, eType, time } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const sId = `${operationId}-${user.toLowerCase()}`;

  console.log(`[staking] Staked: ${amount} by ${user}`);

  const existing = await context.db.find(stakes, { id: sId });
  const newAmount = (existing?.amount ?? 0n) + amount;

  await context.db
    .insert(stakes)
    .values({
      id: sId,
      stakeOperationId: operationId,
      user,
      token: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      amount: newAmount,
      timestamp: time,
      isActive: true,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      set: {
        amount: newAmount,
        timestamp: time,
        updatedAt: event.block.timestamp,
      },
    });

  await context.db
    .insert(stakedEvents)
    .values({
      id,
      token: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      user,
      amount,
      stakedOperationId: operationId,
      eType: eType || 'deposit',
      time,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:Withdrawn', async ({ event, context }) => {
  const { user, amount, operationId, eType, time } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const sId = `${operationId}-${user.toLowerCase()}`;

  console.log(`[staking] Withdrawn: ${amount} by ${user}`);

  const existing = await context.db.find(stakes, { id: sId });
  const newAmount = safeSub(existing?.amount ?? 0n, amount);

  if (existing) {
    await context.db.update(stakes, { id: sId }).set({
      amount: newAmount,
      isActive: newAmount > 0n,
      timestamp: time,
      updatedAt: event.block.timestamp,
    });
  }

  await context.db
    .insert(unstakedEvents)
    .values({
      id,
      token: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      user,
      amount,
      unstakedOperationId: operationId,
      eType: eType || 'withdraw',
      time,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:RewardsClaimed', async ({ event, context }) => {
  const { user, amount, operationId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[staking] RewardsClaimed: ${amount} by ${user}`);

  await context.db
    .insert(rewardPaidEvents)
    .values({
      id,
      user,
      amount,
      rewardOperationId: operationId,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});
