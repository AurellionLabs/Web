// Auto-generated handler for bridge domain - Raw event storage only
// Generated at: 2026-01-12T23:41:16.511Z
//
// Dumb indexer pattern: Store raw events, aggregate in repository layer
// Events from: BridgeFacet

import { ponder } from '@/generated';

// Import event tables (auto-generated from ABI)
import { bountyPaid } from '../../generated-schema';
import { feeRecipientUpdated } from '../../generated-schema';
import { initialized } from '../../generated-schema';
import { journeyStatusUpdated } from '../../generated-schema';
import { logisticsOrderCreated } from '../../generated-schema';
import { orderCancelled } from '../../generated-schema';
import { orderSettled } from '../../generated-schema';
import { tradeMatched } from '../../generated-schema';
import { unifiedOrderCreated } from '../../generated-schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// BridgeFacet Events
// =============================================================================

/**
 * Handle BountyPaid event from BridgeFacet
 * Signature: BountyPaid(bytes32,uint256)
 * Hash: 0x8e7bc4ed
 */
ponder.on('Diamond:BountyPaid', async ({ event, context }) => {
  const { unifiedOrderId, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(bountyPaid).values({
    id,
    unified_order_id: unifiedOrderId,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle FeeRecipientUpdated event from BridgeFacet
 * Signature: FeeRecipientUpdated(address,address)
 * Hash: 0xaaebcf1b
 */
ponder.on('Diamond:FeeRecipientUpdated', async ({ event, context }) => {
  const { oldRecipient, newRecipient } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(feeRecipientUpdated).values({
    id,
    old_recipient: oldRecipient,
    new_recipient: newRecipient,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle Initialized event from BridgeFacet
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
 * Handle JourneyStatusUpdated event from BridgeFacet
 * Signature: JourneyStatusUpdated(bytes32,bytes32,uint8)
 * Hash: 0xf7da2d1a
 */
ponder.on('Diamond:JourneyStatusUpdated', async ({ event, context }) => {
  const { unifiedOrderId, journeyId, phase } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(journeyStatusUpdated).values({
    id,
    unified_order_id: unifiedOrderId,
    journey_id: journeyId,
    phase: phase,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle LogisticsOrderCreated event from BridgeFacet
 * Signature: LogisticsOrderCreated(bytes32,bytes32,bytes32[],uint256,address)
 * Hash: 0x9c831fa4
 */
ponder.on('Diamond:LogisticsOrderCreated', async ({ event, context }) => {
  const { unifiedOrderId, ausysOrderId, journeyIds, bounty, node } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(logisticsOrderCreated).values({
    id,
    unified_order_id: unifiedOrderId,
    ausys_order_id: ausysOrderId,
    journey_ids: journeyIds,
    bounty: bounty,
    node: node,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OrderCancelled event from BridgeFacet
 * Signature: OrderCancelled(bytes32,uint8)
 * Hash: 0xe3bb8b6a
 */
ponder.on('Diamond:OrderCancelled', async ({ event, context }) => {
  const { unifiedOrderId, previousStatus } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(orderCancelled).values({
    id,
    unified_order_id: unifiedOrderId,
    previous_status: previousStatus,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OrderSettled event from BridgeFacet
 * Signature: OrderSettled(bytes32,address,uint256,address,uint256)
 * Hash: 0xe72627b4
 */
ponder.on('Diamond:OrderSettled', async ({ event, context }) => {
  const { unifiedOrderId, seller, sellerAmount, driver, driverAmount } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(orderSettled).values({
    id,
    unified_order_id: unifiedOrderId,
    seller: seller,
    seller_amount: sellerAmount,
    driver: driver,
    driver_amount: driverAmount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TradeMatched event from BridgeFacet
 * Signature: TradeMatched(bytes32,bytes32,bytes32,address,uint256,uint256)
 * Hash: 0x51d0a1e6
 */
ponder.on('Diamond:TradeMatched', async ({ event, context }) => {
  const { unifiedOrderId, clobTradeId, clobOrderId, maker, price, amount } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(tradeMatched).values({
    id,
    unified_order_id: unifiedOrderId,
    clob_trade_id: clobTradeId,
    clob_order_id: clobOrderId,
    maker: maker,
    price: price,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle UnifiedOrderCreated event from BridgeFacet
 * Signature: UnifiedOrderCreated(bytes32,bytes32,address,address,address,uint256,uint256,uint256)
 * Hash: 0xc8b6af07
 */
ponder.on('Diamond:UnifiedOrderCreated', async ({ event, context }) => {
  const {
    unifiedOrderId,
    clobOrderId,
    buyer,
    seller,
    token,
    tokenId,
    quantity,
    price,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(unifiedOrderCreated).values({
    id,
    unified_order_id: unifiedOrderId,
    clob_order_id: clobOrderId,
    buyer: buyer,
    seller: seller,
    token: token,
    token_id: tokenId,
    quantity: quantity,
    price: price,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
