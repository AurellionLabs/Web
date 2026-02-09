// Auto-generated handler for operators domain - Raw event storage only
// Generated at: 2026-02-09T01:17:08.032Z
//
// Pure Dumb Indexer: Store raw events only, NO aggregate tables
// All aggregation happens in frontend repository layer
// Events from: OperatorFacet

import { ponder } from 'ponder:registry';

// Import event tables from generated schema
import {
  diamondOperatorApprovedEvents,
  diamondOperatorReputationUpdatedEvents,
  diamondOperatorRevokedEvents,
  diamondOperatorSlashedEvents,
  diamondOperatorStatsUpdatedEvents,
} from 'ponder:schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// OperatorFacet Events
// =============================================================================

/**
 * Handle OperatorApproved event from OperatorFacet
 * Signature: OperatorApproved(address)
 * Hash: 0xf338da91
 */
ponder.on('Diamond:OperatorApproved', async ({ event, context }) => {
  const { operator } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOperatorApprovedEvents).values({
    id: id,
    operator: operator,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OperatorReputationUpdated event from OperatorFacet
 * Signature: OperatorReputationUpdated(address,uint256,uint256)
 * Hash: 0x8320ad02
 */
ponder.on('Diamond:OperatorReputationUpdated', async ({ event, context }) => {
  const { operator, oldReputation, newReputation } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOperatorReputationUpdatedEvents).values({
    id: id,
    operator: operator,
    old_reputation: oldReputation,
    new_reputation: newReputation,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OperatorRevoked event from OperatorFacet
 * Signature: OperatorRevoked(address)
 * Hash: 0xa5f3b762
 */
ponder.on('Diamond:OperatorRevoked', async ({ event, context }) => {
  const { operator } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOperatorRevokedEvents).values({
    id: id,
    operator: operator,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OperatorSlashed event from OperatorFacet
 * Signature: OperatorSlashed(bytes32,address,address,uint256,uint256)
 * Hash: 0x90e68b2e
 */
ponder.on('Diamond:OperatorSlashed', async ({ event, context }) => {
  const {
    opportunityId,
    operator,
    collateralToken,
    collateralTokenId,
    amount,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOperatorSlashedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    operator: operator,
    collateral_token: collateralToken,
    collateral_token_id: collateralTokenId,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OperatorStatsUpdated event from OperatorFacet
 * Signature: OperatorStatsUpdated(address,uint256,uint256)
 * Hash: 0xd6d54f61
 */
ponder.on('Diamond:OperatorStatsUpdated', async ({ event, context }) => {
  const { operator, successfulOps, totalValueProcessed } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOperatorStatsUpdatedEvents).values({
    id: id,
    operator: operator,
    successful_ops: successfulOps,
    total_value_processed: totalValueProcessed,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
