// Auto-generated handler for diamond domain - Raw event storage only
// Generated at: 2026-01-12T23:41:16.512Z
//
// Dumb indexer pattern: Store raw events, aggregate in repository layer
// Events from: DiamondCutFacet, OwnershipFacet

import { ponder } from '@/generated';

// Import event tables (auto-generated from ABI)
import { diamondCut } from '../../generated-schema';
import { initialized } from '../../generated-schema';
import { ownershipTransferred } from '../../generated-schema';
import { ownershipTransferred } from '../../generated-schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// DiamondCutFacet Events
// =============================================================================

/**
 * Handle DiamondCut event from DiamondCutFacet
 * Signature: DiamondCut(tuple[],address,bytes)
 * Hash: 0xe785b7d4
 */
ponder.on('Diamond:DiamondCut', async ({ event, context }) => {
  const { _diamondCut, _init, _calldata } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(diamondCut).values({
    id,
    diamond_cut: _diamondCut,
    init: _init,
    calldata: _calldata,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

// =============================================================================
// OwnershipFacet Events
// =============================================================================

/**
 * Handle Initialized event from OwnershipFacet
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
 * Handle OwnershipTransferred event from OwnershipFacet
 * Signature: OwnershipTransferred(address,address)
 * Hash: 0x8be0079c
 */
ponder.on('Diamond:OwnershipTransferred', async ({ event, context }) => {
  const { previousOwner, newOwner } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(ownershipTransferred).values({
    id,
    previous_owner: previousOwner,
    new_owner: newOwner,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OwnershipTransferred event from OwnershipFacet
 * Signature: OwnershipTransferred(address,address)
 * Hash: 0x8be0079c
 */
ponder.on('Diamond:OwnershipTransferred', async ({ event, context }) => {
  const { previousOwner, newOwner } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(ownershipTransferred).values({
    id,
    previous_owner: previousOwner,
    new_owner: newOwner,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
