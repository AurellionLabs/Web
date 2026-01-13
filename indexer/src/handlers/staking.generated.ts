// Auto-generated handler for staking domain - Raw event storage only
// Generated at: 2026-01-13T14:14:28.789Z
//
// Dumb indexer pattern: Store raw events, aggregate in repository layer
// Events from: StakingFacet

import { ponder } from '@/generated';

// Import event tables (auto-generated from ABI)
import { rewardRateUpdatedC390Events } from '../../generated-schema';
import { rewardsClaimedFc30Events } from '../../generated-schema';
import { staked_9e71Events } from '../../generated-schema';
import { withdrawn_7084Events } from '../../generated-schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// StakingFacet Events
// =============================================================================

/**
 * Handle RewardRateUpdated event from StakingFacet
 * Signature: RewardRateUpdated(uint256,uint256)
 * Hash: 0xc390a98a
 */
ponder.on('Diamond:RewardRateUpdated', async ({ event, context }) => {
  const { oldRate, newRate } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(rewardRateUpdatedC390Events).values({
    id,
    old_rate: oldRate,
    new_rate: newRate,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle RewardsClaimed event from StakingFacet
 * Signature: RewardsClaimed(address,uint256)
 * Hash: 0xfc30cdde
 */
ponder.on('Diamond:RewardsClaimed', async ({ event, context }) => {
  const { user, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(rewardsClaimedFc30Events).values({
    id,
    user: user,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle Staked event from StakingFacet
 * Signature: Staked(address,uint256)
 * Hash: 0x9e71bc8e
 */
ponder.on('Diamond:Staked', async ({ event, context }) => {
  const { user, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(staked_9e71Events).values({
    id,
    user: user,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle Withdrawn event from StakingFacet
 * Signature: Withdrawn(address,uint256)
 * Hash: 0x7084f547
 */
ponder.on('Diamond:Withdrawn', async ({ event, context }) => {
  const { user, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(withdrawn_7084Events).values({
    id,
    user: user,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
