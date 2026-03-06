// Auto-generated handler for clob-mev domain
// Generated at: 2026-03-06T16:33:32.573Z
//
// Inline aggregate writes: raw event insert + aggregate table upsert in ONE ponder.on() handler.
// This avoids the Ponder 0.16 restriction: only one ponder.on() per event name is allowed.
// Events from: CLOBMEVFacet

import { ponder } from 'ponder:registry';

// Import event tables from generated schema
import {
  diamondOrderCommittedEvents,
  diamondOrderRevealedEvents,
} from 'ponder:schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// CLOBMEVFacet Events
// =============================================================================

/**
 * Handle OrderCommitted event from CLOBMEVFacet
 * Signature: OrderCommitted(bytes32,address,uint256)
 * Hash: 0x25cd9c95
 */
ponder.on('Diamond:OrderCommitted', async ({ event, context }) => {
  const { commitmentId, committer, commitBlock } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondOrderCommittedEvents).values({
    id: id,
    commitment_id: commitmentId,
    committer: committer,
    commit_block: commitBlock,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OrderRevealed event from CLOBMEVFacet
 * Signature: OrderRevealed(bytes32,bytes32,address)
 * Hash: 0x73609089
 */
ponder.on('Diamond:OrderRevealed', async ({ event, context }) => {
  const { commitmentId, orderId, maker } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondOrderRevealedEvents).values({
    id: id,
    commitment_id: commitmentId,
    order_id: orderId,
    maker: maker,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
