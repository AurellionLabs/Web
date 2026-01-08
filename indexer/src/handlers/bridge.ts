/**
 * Bridge Handler
 *
 * Handles bridge-related events from BridgeFacet.
 *
 * Note: OrderCancelled has 2 versions - this handler uses the Bridge version.
 */

import { ponder } from '@/generated';
import {
  unifiedOrders,
  unifiedOrderCreatedEvents,
  tradeMatchedEvents,
  unifiedOrderSettledEvents,
} from '../../ponder.schema';

// ============================================================================
// CONSTANTS
// ============================================================================

const OrderStatus = {
  Pending: 0,
  Matched: 1,
  Settled: 2,
  Cancelled: 3,
  Expired: 4,
} as const;

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// ============================================================================
// UNIFIED ORDER CREATION
// ============================================================================

ponder.on('Diamond:UnifiedOrderCreated', async ({ event, context }) => {
  const { orderId, buyer, seller, token, tokenId, quantity, price } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[bridge] UnifiedOrderCreated: ${orderId}`);

  await context.db
    .insert(unifiedOrders)
    .values({
      id: orderId,
      buyer,
      seller,
      token,
      tokenId,
      quantity,
      price,
      status: OrderStatus.Pending,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  await context.db
    .insert(unifiedOrderCreatedEvents)
    .values({
      id,
      orderId,
      buyer,
      seller,
      token,
      tokenId,
      quantity,
      price,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// ============================================================================
// TRADE MATCHING
// ============================================================================

ponder.on('Diamond:TradeMatched', async ({ event, context }) => {
  const { buyOrderId, sellOrderId, matchedQuantity, matchedPrice } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[bridge] TradeMatched: buy=${buyOrderId}, sell=${sellOrderId}`);

  await context.db.update(unifiedOrders, { id: buyOrderId }).set({
    status: OrderStatus.Matched,
    updatedAt: event.block.timestamp,
  });

  await context.db.update(unifiedOrders, { id: sellOrderId }).set({
    status: OrderStatus.Matched,
    updatedAt: event.block.timestamp,
  });

  await context.db
    .insert(tradeMatchedEvents)
    .values({
      id,
      buyOrderId,
      sellOrderId,
      matchedQuantity,
      matchedPrice,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// ============================================================================
// ORDER SETTLEMENT
// ============================================================================

ponder.on('Diamond:OrderSettled', async ({ event, context }) => {
  const { orderId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[bridge] OrderSettled: ${orderId}`);

  await context.db.update(unifiedOrders, { id: orderId }).set({
    status: OrderStatus.Settled,
    updatedAt: event.block.timestamp,
  });

  await context.db
    .insert(unifiedOrderSettledEvents)
    .values({
      id,
      orderId,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// ============================================================================
// ORDER CANCELLATION - Bridge version (2 params)
// ============================================================================

ponder.on(
  'Diamond:OrderCancelled(bytes32 indexed unifiedOrderId, uint8 previousStatus)',
  async ({ event, context }) => {
    const { unifiedOrderId, previousStatus } = event.args;

    console.log(`[bridge] OrderCancelled: ${unifiedOrderId}`);

    await context.db.update(unifiedOrders, { id: unifiedOrderId }).set({
      status: OrderStatus.Cancelled,
      updatedAt: event.block.timestamp,
    });
  },
);
