// Auto-generated handler for staking domain - Raw event storage only
// Generated at: 2026-01-12T23:41:16.511Z
//
// Dumb indexer pattern: Store raw events, aggregate in repository layer
// Events from: StakingFacet

import { ponder } from '@/generated';

// Import event tables (auto-generated from ABI)
import { initialized } from '../../generated-schema';
import { rewardRateUpdated } from '../../generated-schema';
import { rewardsClaimed } from '../../generated-schema';
import { staked } from '../../generated-schema';
import { withdrawn } from '../../generated-schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// StakingFacet Events
// =============================================================================

/**
 * Handle Initialized event from StakingFacet
 * Signature: Initialized(uint64)
 * Hash: 0xc7f505b2
 */
ponder.on('Diamond:Initialized', async ({ event, context }) => {
  const { version } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(initialized).values({
    id,
    version: version,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle RewardRateUpdated event from StakingFacet
 * Signature: RewardRateUpdated(uint256,uint256)
 * Hash: 0xc390a98a
 */
ponder.on('Diamond:RewardRateUpdated', async ({ event, context }) => {
  const { oldRate, newRate } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(rewardRateUpdated).values({
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
  await context.db.insert(rewardsClaimed).values({
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
  await context.db.insert(staked).values({
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
  await context.db.insert(withdrawn).values({
    id,
    user: user,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
