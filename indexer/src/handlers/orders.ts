/**
 * Orders Handler
 *
 * Handles order-related events from OrdersFacet.
 *
 * Note: Stores only raw events - repositories handle aggregation at query time.
 */

import { ponder } from '@/generated';
import {
  orders,
  orderCreatedEvents,
  orderStatusUpdates,
} from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// ============================================================================
// ORDER CREATION - Store only raw event
// ============================================================================

ponder.on(
  'Diamond:OrderCreated(bytes32 indexed orderHash, address indexed buyer, address indexed seller, uint256 price, uint256 amount)',
  async ({ event, context }) => {
    const { orderHash, buyer, seller, price, amount } = event.args;
    const id = eventId(event.transaction.hash, event.log.logIndex);

    console.log(`[orders] OrderCreated (OrdersFacet): ${orderHash}`);

    // Try to read full order data from contract
    let token = '0x0000000000000000000000000000000000000000' as `0x${string}`;
    let tokenId = 0n;
    let tokenQuantity = amount;
    let currentStatus = 0;
    let startLocationLat = '';
    let startLocationLng = '';
    let endLocationLat = '';
    let endLocationLng = '';
    let startName = '';
    let endName = '';
    let nodes: string[] = [];

    try {
      const order = await context.client.readContract({
        abi: context.contracts.Diamond.abi,
        address: context.contracts.Diamond.address,
        functionName: 'getOrder',
        args: [orderHash],
        blockNumber: event.block.number,
      });

      if (order) {
        const o = order as any;
        currentStatus =
          o.status === 'SETTLED' ? 2 : o.status === 'CANCELLED' ? 3 : 0;
      }
    } catch (e) {
      console.warn(`[orders] Could not read order data for ${orderHash}:`, e);
    }

    // Create order entity
    await context.db
      .insert(orders)
      .values({
        id: orderHash,
        buyer,
        seller,
        token,
        tokenId,
        tokenQuantity,
        requestedTokenQuantity: tokenQuantity,
        price,
        txFee: 0n,
        currentStatus,
        startLocationLat,
        startLocationLng,
        endLocationLat,
        endLocationLng,
        startName,
        endName,
        nodes: JSON.stringify(nodes),
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoUpdate({
        set: {
          price,
          tokenQuantity: amount,
          requestedTokenQuantity: amount,
          updatedAt: event.block.timestamp,
        },
      });

    // Create event record
    await context.db
      .insert(orderCreatedEvents)
      .values({
        id,
        orderId: orderHash,
        buyer,
        seller,
        price,
        tokenQuantity,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();
  },
);

// ============================================================================
// ORDER STATUS UPDATES - Store only raw event
// ============================================================================

ponder.on('Diamond:OrderUpdated', async ({ event, context }) => {
  const { orderHash, status } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[orders] OrderUpdated: ${orderHash}, status=${status}`);

  const existingOrder = await context.db.find(orders, { id: orderHash });
  const oldStatus = existingOrder?.currentStatus ?? 0;
  const newStatus = status === 'SETTLED' ? 2 : status === 'CANCELLED' ? 3 : 1;

  await context.db.update(orders, { id: orderHash }).set({
    currentStatus: newStatus,
    updatedAt: event.block.timestamp,
  });

  // Create status update event record
  await context.db
    .insert(orderStatusUpdates)
    .values({
      id,
      orderId: orderHash,
      oldStatus,
      newStatus,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// ============================================================================
// ORDER CANCELLATION - Store only raw event
// ============================================================================

ponder.on(
  'Diamond:OrderCancelled(bytes32 indexed orderHash, address indexed buyer)',
  async ({ event, context }) => {
    const { orderHash, buyer } = event.args;
    const id = eventId(event.transaction.hash, event.log.logIndex);

    console.log(`[orders] OrderCancelled (OrdersFacet): ${orderHash}`);

    const existingOrder = await context.db.find(orders, { id: orderHash });
    const oldStatus = existingOrder?.currentStatus ?? 0;

    await context.db.update(orders, { id: orderHash }).set({
      currentStatus: 3, // Cancelled
      updatedAt: event.block.timestamp,
    });

    // Create status update event record
    await context.db
      .insert(orderStatusUpdates)
      .values({
        id,
        orderId: orderHash,
        oldStatus,
        newStatus: 3,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();
  },
);
