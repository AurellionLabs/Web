/**
 * Bridge Handler
 *
 * Handles bridge-related events from BridgeFacet.
 *
 * Note: Stores only raw events - repositories handle aggregation at query time.
 *
 * Note: OrderCancelled has 2 versions - this handler uses the Bridge version.
 */

import { ponder } from '@/generated';
import {
  unifiedOrders,
  unifiedOrderCreatedEvents,
  tradeMatchedEvents,
  logisticsOrderCreatedEvents,
  unifiedOrderSettledEvents,
} from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// ============================================================================
// UNIFIED ORDER CREATION - Store only raw event
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
      clobOrderId:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      clobTradeId:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      ausysOrderId:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      journeyIds: '[]',
      buyer,
      seller,
      sellerNode:
        '0x0000000000000000000000000000000000000000000' as `0x${string}`,
      token,
      tokenId,
      tokenQuantity: quantity,
      price,
      bounty: 0n,
      status: 0,
      logisticsStatus: 0,
      startLocationLat: '',
      startLocationLng: '',
      endLocationLat: '',
      endLocationLng: '',
      startName: '',
      endName: '',
      createdAt: event.block.timestamp,
      matchedAt: 0n,
      deliveredAt: 0n,
      settledAt: 0n,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      set: {
        buyer,
        seller,
        token,
        tokenId,
        tokenQuantity: quantity,
        price,
        updatedAt: event.block.timestamp,
      },
    });

  await context.db
    .insert(unifiedOrderCreatedEvents)
    .values({
      id,
      unifiedOrderId: orderId,
      clobOrderId:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
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
// TRADE MATCHING - Store only raw event
// ============================================================================

ponder.on('Diamond:TradeMatched', async ({ event, context }) => {
  const { buyOrderId, sellOrderId, matchedQuantity, matchedPrice } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[bridge] TradeMatched: buy=${buyOrderId}, sell=${sellOrderId}`);

  await context.db.update(unifiedOrders, { id: buyOrderId }).set({
    status: 2, // Matched
    updatedAt: event.block.timestamp,
  });

  await context.db.update(unifiedOrders, { id: sellOrderId }).set({
    status: 2, // Matched
    updatedAt: event.block.timestamp,
  });

  await context.db
    .insert(tradeMatchedEvents)
    .values({
      id,
      unifiedOrderId: buyOrderId,
      clobTradeId:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      clobOrderId: buyOrderId,
      maker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      price: matchedPrice,
      amount: matchedQuantity,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// ============================================================================
// LOGISTICS ORDER CREATION - Store only raw event
// ============================================================================

ponder.on('Diamond:LogisticsOrderCreated', async ({ event, context }) => {
  const { unifiedOrderId, ausysOrderId, journeyIds, bounty, node } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[bridge] LogisticsOrderCreated: ${unifiedOrderId}`);

  await context.db.update(unifiedOrders, { id: unifiedOrderId }).set({
    ausysOrderId,
    journeyIds: JSON.stringify(journeyIds),
    sellerNode: node,
    bounty,
    status: 3, // LogisticsCreated
    logisticsStatus: 0, // Pending
    updatedAt: event.block.timestamp,
  });

  await context.db
    .insert(logisticsOrderCreatedEvents)
    .values({
      id,
      unifiedOrderId,
      ausysOrderId,
      journeyIds: JSON.stringify(journeyIds),
      bounty,
      node,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// ============================================================================
// ORDER SETTLEMENT - Store only raw event
// ============================================================================

ponder.on('Diamond:OrderSettled', async ({ event, context }) => {
  const { orderId, seller, sellerAmount, driver, driverAmount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[bridge] OrderSettled: ${orderId}`);

  await context.db.update(unifiedOrders, { id: orderId }).set({
    status: 4, // Settled
    settledAt: event.block.timestamp,
    updatedAt: event.block.timestamp,
  });

  await context.db
    .insert(unifiedOrderSettledEvents)
    .values({
      id,
      unifiedOrderId: orderId,
      seller,
      sellerAmount,
      driver:
        driver ||
        ('0x0000000000000000000000000000000000000000' as `0x${string}`),
      driverAmount,
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
    const id = eventId(event.transaction.hash, event.log.logIndex);

    console.log(`[bridge] OrderCancelled: ${unifiedOrderId}`);

    await context.db.update(unifiedOrders, { id: unifiedOrderId }).set({
      status: 5, // Cancelled
      updatedAt: event.block.timestamp,
    });
  },
);
