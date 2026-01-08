/**
 * Orders Handler
 *
 * Handles order-related events from OrdersFacet.
 * Note: OrdersFacet emits simple events, but the orders table expects
 * more detailed data. We'll populate what we can and log warnings for missing data.
 */

import { ponder } from '@/generated';
import { orders, orderStatusUpdates } from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

const OrderStatus = {
  Created: 0,
  Processing: 1,
  Settled: 2,
  Cancelled: 3,
} as const;

// Helper to convert string status to numeric
function statusToNumber(status: string): number {
  const upper = status.toUpperCase();
  if (upper === 'CREATED' || upper === 'PENDING') return OrderStatus.Created;
  if (upper === 'PROCESSING' || upper === 'IN_PROGRESS')
    return OrderStatus.Processing;
  if (upper === 'SETTLED' || upper === 'COMPLETED') return OrderStatus.Settled;
  if (upper === 'CANCELLED' || upper === 'CANCELED')
    return OrderStatus.Cancelled;
  return OrderStatus.Created;
}

// ============================================================================
// ORDER CREATION
// ============================================================================

ponder.on(
  'Diamond:OrderCreated(bytes32 indexed orderHash, address indexed buyer, address indexed seller, uint256 price, uint256 amount)',
  async ({ event, context }) => {
    const { orderHash, buyer, seller, price, amount } = event.args;
    const id = eventId(event.transaction.hash, event.log.logIndex);

    console.log(`[orders] OrderCreated (OrdersFacet): ${orderHash}`);

    // Validate handler is working
    try {
      // Try to read full order data from contract
      let token = '0x0000000000000000000000000000000000000000' as `0x${string}`;
      let tokenId = 0n;
      let tokenQuantity = amount;
      let requestedTokenQuantity = amount;
      let txFee = 0n;
      let currentStatus = OrderStatus.Created;
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
          // OrdersFacet.getOrder returns: buyer, seller, price, amount, status, createdAt
          // But orders table expects more fields. We'll use defaults for missing data.
          currentStatus = statusToNumber(o.status || 'CREATED');
        }
      } catch (e) {
        console.warn(`[orders] Could not read order data for ${orderHash}:`, e);
        console.warn(
          `[orders] This order will be created with minimal data. Some queries may fail.`,
        );
      }

      // Check if this order is linked to a unified order (which has more data)
      try {
        // Unified orders might have the ausysOrderId that matches this orderHash
        // We could try to find it, but for now we'll create with available data
      } catch (e) {
        // Ignore - not critical
      }

      await context.db
        .insert(orders)
        .values({
          id: orderHash,
          buyer,
          seller,
          token,
          tokenId,
          tokenQuantity,
          requestedTokenQuantity,
          price,
          txFee,
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

      console.warn(
        `[orders] ⚠️  Order ${orderHash} created with minimal data. ` +
          `Missing: token, tokenId, location data, nodes. ` +
          `Frontend queries requiring these fields may return incomplete data.`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `[orders] ❌ ERROR handling OrderCreated event for ${orderHash}: ${errorMsg}`,
      );
      console.error(
        `[orders] Stack trace:`,
        error instanceof Error ? error.stack : 'N/A',
      );
      throw error; // Re-throw to let Ponder retry
    }
  },
);

// ============================================================================
// ORDER STATUS UPDATES
// ============================================================================

ponder.on('Diamond:OrderUpdated', async ({ event, context }) => {
  const { orderHash, status } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[orders] OrderUpdated: ${orderHash}, status=${status}`);

  try {
    const existingOrder = await context.db.find(orders, { id: orderHash });
    const oldStatus = existingOrder?.currentStatus ?? OrderStatus.Created;
    const newStatus = statusToNumber(status);

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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[orders] ❌ ERROR handling OrderUpdated event for ${orderHash}: ${errorMsg}`,
    );
    console.error(
      `[orders] Stack trace:`,
      error instanceof Error ? error.stack : 'N/A',
    );
    throw error;
  }
});

// ============================================================================
// ORDER CANCELLATION
// ============================================================================

ponder.on(
  'Diamond:OrderCancelled(bytes32 indexed orderHash, address indexed buyer)',
  async ({ event, context }) => {
    const { orderHash, buyer } = event.args;
    const id = eventId(event.transaction.hash, event.log.logIndex);

    console.log(`[orders] OrderCancelled (OrdersFacet): ${orderHash}`);

    try {
      const existingOrder = await context.db.find(orders, { id: orderHash });
      const oldStatus = existingOrder?.currentStatus ?? OrderStatus.Created;

      await context.db.update(orders, { id: orderHash }).set({
        currentStatus: OrderStatus.Cancelled,
        updatedAt: event.block.timestamp,
      });

      // Create status update event record
      await context.db
        .insert(orderStatusUpdates)
        .values({
          id,
          orderId: orderHash,
          oldStatus,
          newStatus: OrderStatus.Cancelled,
          blockNumber: event.block.number,
          blockTimestamp: event.block.timestamp,
          transactionHash: event.transaction.hash,
        })
        .onConflictDoNothing();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `[orders] ❌ ERROR handling OrderCancelled event for ${orderHash}: ${errorMsg}`,
      );
      console.error(
        `[orders] Stack trace:`,
        error instanceof Error ? error.stack : 'N/A',
      );
      throw error;
    }
  },
);
