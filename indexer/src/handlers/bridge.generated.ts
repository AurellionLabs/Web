// Auto-generated handler for bridge domain - Raw event storage only
// Generated at: 2026-02-04T21:39:23.348Z
// 
// Pure Dumb Indexer: Store raw events only, NO aggregate tables
// All aggregation happens in frontend repository layer
// Events from: BridgeFacet

import { ponder } from "@/generated";

// Import event tables from generated schema
import { diamondBountyPaidEvents, diamondBridgeFeeRecipientUpdatedEvents, diamondBridgeOrderCancelledEvents, diamondJourneyStatusUpdatedEvents, diamondLogisticsOrderCreatedEvents, diamondOrderSettledEvents, diamondTradeMatchedEvents, diamondUnifiedOrderCreatedEvents } from "@/generated-schema";

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

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondBountyPaidEvents).values({
    id: id,
    unified_order_id: unifiedOrderId,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle BridgeFeeRecipientUpdated event from BridgeFacet
 * Signature: BridgeFeeRecipientUpdated(address,address)
 * Hash: 0xd240f26b
 */
ponder.on('Diamond:BridgeFeeRecipientUpdated', async ({ event, context }) => {
  const { oldRecipient, newRecipient } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondBridgeFeeRecipientUpdatedEvents).values({
    id: id,
    old_recipient: oldRecipient,
    new_recipient: newRecipient,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle BridgeOrderCancelled event from BridgeFacet
 * Signature: BridgeOrderCancelled(bytes32,uint8)
 * Hash: 0xfb630ff8
 */
ponder.on('Diamond:BridgeOrderCancelled', async ({ event, context }) => {
  const { unifiedOrderId, previousStatus } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondBridgeOrderCancelledEvents).values({
    id: id,
    unified_order_id: unifiedOrderId,
    previous_status: previousStatus,
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

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondJourneyStatusUpdatedEvents).values({
    id: id,
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

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondLogisticsOrderCreatedEvents).values({
    id: id,
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
 * Handle OrderSettled event from BridgeFacet
 * Signature: OrderSettled(bytes32,address,uint256,address,uint256)
 * Hash: 0xe72627b4
 */
ponder.on('Diamond:OrderSettled', async ({ event, context }) => {
  const { unifiedOrderId, seller, sellerAmount, driver, driverAmount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOrderSettledEvents).values({
    id: id,
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
  const { unifiedOrderId, clobTradeId, clobOrderId, maker, price, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondTradeMatchedEvents).values({
    id: id,
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
  const { unifiedOrderId, clobOrderId, buyer, seller, token, tokenId, quantity, price } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondUnifiedOrderCreatedEvents).values({
    id: id,
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

