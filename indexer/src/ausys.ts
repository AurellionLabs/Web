import { ponder } from '@/generated';
import {
  journeys,
  orders,
  packageSignatures,
  driverAssignments,
  journeyStatusUpdates,
  orderStatusUpdates,
  orderCreatedEvents,
  journeyCreatedEvents,
  orderSettledEvents,
  fundsEscrowedEvents,
  sellerPaidEvents,
  nodeFeeDistributedEvents,
  driverStats,
  nodeStats,
} from '../ponder.schema';
import { logger, safeJsonParse, eventId as makeEventId } from './utils';

// Create logger for this module
const log = logger('Ausys');

// =============================================================================
// AUSYS EVENT HANDLERS - Orders, Journeys, Signatures, Settlements
// =============================================================================

/**
 * Handle JourneyCreated event
 */
ponder.on('Ausys:JourneyCreated', async ({ event, context }) => {
  const { journeyId, sender, receiver } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Try to get additional data from contract
  let bounty = 0n;
  let eta = 0n;
  let parcelData = {
    startLocation: { lat: '', lng: '' },
    endLocation: { lat: '', lng: '' },
    startName: '',
    endName: '',
  };

  try {
    const journey = await context.client.readContract({
      abi: context.contracts.Ausys.abi,
      address: context.contracts.Ausys.address,
      functionName: 'getjourney',
      args: [journeyId],
    });
    bounty = journey.bounty;
    eta = journey.ETA;
    parcelData = journey.parcelData;
  } catch (e) {
    log.warn(`Failed to get journey data for ${journeyId}`, e);
  }

  // Check if this journey is linked to an order
  let orderId: `0x${string}` | null = null;
  try {
    const orderIdResult = await context.client.readContract({
      abi: context.contracts.Ausys.abi,
      address: context.contracts.Ausys.address,
      functionName: 'journeyToOrderId',
      args: [journeyId],
    });
    if (
      orderIdResult !==
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      orderId = orderIdResult;
    }
  } catch (e) {
    // Journey not linked to order
  }

  // Insert Journey entity
  await context.db
    .insert(journeys)
    .values({
      id: journeyId,
      sender,
      receiver,
      driver: null,
      currentStatus: 0, // Pending
      bounty,
      journeyStart: 0n,
      journeyEnd: 0n,
      eta,
      startLocationLat: parcelData.startLocation.lat,
      startLocationLng: parcelData.startLocation.lng,
      endLocationLat: parcelData.endLocation.lat,
      endLocationLng: parcelData.endLocation.lng,
      startName: parcelData.startName,
      endName: parcelData.endName,
      orderId,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Insert JourneyCreated event
  await context.db.insert(journeyCreatedEvents).values({
    id: eventId,
    journeyId,
    sender,
    receiver,
    bounty,
    eta,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle JourneyStatusUpdated event
 */
ponder.on('Ausys:JourneyStatusUpdated', async ({ event, context }) => {
  const { journeyId, newStatus } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Get current journey to capture old status
  const journey = await context.db.find(journeys, { id: journeyId });
  const oldStatus = journey?.currentStatus ?? 0;

  // Update Journey entity
  const updateData: {
    currentStatus: number;
    updatedAt: bigint;
    journeyStart?: bigint;
    journeyEnd?: bigint;
  } = {
    currentStatus: newStatus,
    updatedAt: event.block.timestamp,
  };

  // Update journey start/end times based on status
  if (newStatus === 1) {
    // InTransit
    updateData.journeyStart = event.block.timestamp;
  } else if (newStatus === 2) {
    // Delivered
    updateData.journeyEnd = event.block.timestamp;
  }

  await context.db.update(journeys, { id: journeyId }).set(updateData);

  // Insert JourneyStatusUpdate event
  await context.db.insert(journeyStatusUpdates).values({
    id: eventId,
    journeyId,
    oldStatus,
    newStatus,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update driver stats when journey is delivered
  if (newStatus === 2 && journey?.driver) {
    const driverStatsRecord = await context.db.find(driverStats, {
      id: journey.driver,
    });
    if (driverStatsRecord) {
      await context.db.update(driverStats, { id: journey.driver }).set({
        completedJourneys: driverStatsRecord.completedJourneys + 1n,
        totalEarnings: driverStatsRecord.totalEarnings + (journey.bounty || 0n),
        lastActiveAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      });
    }
  }

  // Update driver stats when journey is canceled
  if (newStatus === 3 && journey?.driver) {
    const driverStatsRecord = await context.db.find(driverStats, {
      id: journey.driver,
    });
    if (driverStatsRecord) {
      await context.db.update(driverStats, { id: journey.driver }).set({
        canceledJourneys: driverStatsRecord.canceledJourneys + 1n,
        lastActiveAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      });
    }
  }
});

/**
 * Handle JourneyCanceled event
 */
ponder.on('Ausys:JourneyCanceled', async ({ event, context }) => {
  const { journeyId } = event.args;

  // Get journey to update driver stats
  const journey = await context.db.find(journeys, { id: journeyId });

  // Update Journey entity to canceled status
  await context.db.update(journeys, { id: journeyId }).set({
    currentStatus: 3, // Canceled
    updatedAt: event.block.timestamp,
  });

  // Update driver stats if there was an assigned driver
  if (journey?.driver) {
    const driverStatsRecord = await context.db.find(driverStats, {
      id: journey.driver,
    });
    if (driverStatsRecord) {
      await context.db.update(driverStats, { id: journey.driver }).set({
        canceledJourneys: driverStatsRecord.canceledJourneys + 1n,
        lastActiveAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      });
    }
  }
});

/**
 * Handle OrderCreated event
 */
ponder.on('Ausys:OrderCreated', async ({ event, context }) => {
  const {
    orderId,
    buyer,
    seller,
    token,
    tokenId,
    tokenQuantity,
    requestedTokenQuantity,
    price,
    txFee,
    currentStatus,
    nodes,
    locationData,
  } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Insert Order entity
  await context.db
    .insert(orders)
    .values({
      id: orderId,
      buyer,
      seller,
      token,
      tokenId,
      tokenQuantity,
      requestedTokenQuantity,
      price,
      txFee,
      currentStatus,
      startLocationLat: locationData.startLocation.lat,
      startLocationLng: locationData.startLocation.lng,
      endLocationLat: locationData.endLocation.lat,
      endLocationLng: locationData.endLocation.lng,
      startName: locationData.startName,
      endName: locationData.endName,
      nodes: JSON.stringify(nodes),
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Insert OrderCreated event
  await context.db.insert(orderCreatedEvents).values({
    id: eventId,
    orderId,
    buyer,
    seller,
    price,
    tokenQuantity,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle OrderStatusUpdated event
 */
ponder.on('Ausys:OrderStatusUpdated', async ({ event, context }) => {
  const { orderId, newStatus } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Get current order to capture old status
  const order = await context.db.find(orders, { id: orderId });
  const oldStatus = order?.currentStatus ?? 0;

  // Update Order entity
  await context.db.update(orders, { id: orderId }).set({
    currentStatus: newStatus,
    updatedAt: event.block.timestamp,
  });

  // Insert OrderStatusUpdate event
  await context.db.insert(orderStatusUpdates).values({
    id: eventId,
    orderId,
    oldStatus,
    newStatus,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle OrderSettled event
 */
ponder.on('Ausys:OrderSettled', async ({ event, context }) => {
  const { orderId } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Get order data for totals
  let totalPrice = 0n;
  let totalFee = 0n;
  try {
    const orderData = await context.client.readContract({
      abi: context.contracts.Ausys.abi,
      address: context.contracts.Ausys.address,
      functionName: 'getOrder',
      args: [orderId],
    });
    totalPrice = orderData.price;
    totalFee = orderData.txFee;
  } catch (e) {
    log.warn(`Failed to get order data for ${orderId}`, e);
  }

  // Update Order entity
  await context.db.update(orders, { id: orderId }).set({
    currentStatus: 2, // Settled
    updatedAt: event.block.timestamp,
  });

  // Insert OrderSettled event
  await context.db.insert(orderSettledEvents).values({
    id: eventId,
    orderId,
    totalPrice,
    totalFee,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update NodeStats for involved nodes
  const order = await context.db.find(orders, { id: orderId });
  if (order) {
    // Use safe JSON parse to handle malformed data
    const nodes = safeJsonParse<`0x${string}`[]>(order.nodes, []);
    const nodeCount = nodes.length;
    if (nodeCount > 0) {
      const feePerNode = totalFee / BigInt(nodeCount);
      for (let i = 0; i < nodeCount; i++) {
        const nodeAddress = nodes[i];
        const nodeStatsRecord = await context.db.find(nodeStats, {
          id: nodeAddress,
        });
        if (nodeStatsRecord) {
          await context.db.update(nodeStats, { id: nodeAddress }).set({
            totalOrders: nodeStatsRecord.totalOrders + 1n,
            completedOrders: nodeStatsRecord.completedOrders + 1n,
            totalRevenue: nodeStatsRecord.totalRevenue + totalPrice,
            totalFeesEarned: nodeStatsRecord.totalFeesEarned + feePerNode,
            lastActiveAt: event.block.timestamp,
            updatedAt: event.block.timestamp,
          });
        } else {
          await context.db
            .insert(nodeStats)
            .values({
              id: nodeAddress,
              node: nodeAddress,
              totalOrders: 1n,
              completedOrders: 1n,
              totalRevenue: totalPrice,
              totalFeesEarned: feePerNode,
              lastActiveAt: event.block.timestamp,
              updatedAt: event.block.timestamp,
            })
            .onConflictDoNothing();
        }
      }
    }
  }
});

/**
 * Handle DriverAssigned event
 */
ponder.on('Ausys:DriverAssigned', async ({ event, context }) => {
  const { driver, journeyId } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Update Journey entity with driver
  await context.db.update(journeys, { id: journeyId }).set({
    driver,
    updatedAt: event.block.timestamp,
  });

  // Insert DriverAssignment event
  await context.db.insert(driverAssignments).values({
    id: eventId,
    driver,
    journeyId,
    assignedBy: event.transaction.from,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update DriverStats
  const driverStatsRecord = await context.db.find(driverStats, { id: driver });
  if (driverStatsRecord) {
    await context.db.update(driverStats, { id: driver }).set({
      totalJourneys: driverStatsRecord.totalJourneys + 1n,
      lastActiveAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
  } else {
    await context.db
      .insert(driverStats)
      .values({
        id: driver,
        driver,
        totalJourneys: 1n,
        completedJourneys: 0n,
        canceledJourneys: 0n,
        totalEarnings: 0n,
        averageRating: 0n,
        lastActiveAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      })
      .onConflictDoNothing();
  }
});

/**
 * Handle emitSig (PackageSignature) event
 */
ponder.on('Ausys:emitSig', async ({ event, context }) => {
  const { user, id: journeyId } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Get journey to determine signature type
  const journey = await context.db.find(journeys, { id: journeyId });
  let signatureType = 'unknown';

  if (journey) {
    if (user.toLowerCase() === journey.sender.toLowerCase()) {
      signatureType = 'sender';
    } else if (user.toLowerCase() === journey.receiver.toLowerCase()) {
      signatureType = 'receiver';
    } else if (
      journey.driver &&
      user.toLowerCase() === journey.driver.toLowerCase()
    ) {
      // Driver signature type depends on journey status
      if (journey.currentStatus === 0) {
        // Pending - pickup signature
        signatureType = 'driver_pickup';
      } else if (journey.currentStatus === 1) {
        // InTransit - delivery signature
        signatureType = 'driver_delivery';
      } else {
        signatureType = 'driver';
      }
    }
  }

  // Insert PackageSignature event
  await context.db.insert(packageSignatures).values({
    id: eventId,
    journeyId,
    signer: user,
    signatureType,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle FundsEscrowed event
 */
ponder.on('Ausys:FundsEscrowed', async ({ event, context }) => {
  const { from, amount } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  await context.db.insert(fundsEscrowedEvents).values({
    id: eventId,
    from,
    amount,
    purpose: 'escrow',
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle SellerPaid event
 */
ponder.on('Ausys:SellerPaid', async ({ event, context }) => {
  const { seller, amount } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  await context.db.insert(sellerPaidEvents).values({
    id: eventId,
    seller,
    amount,
    orderId: null, // Would need to be determined from context
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle NodeFeeDistributed event
 */
ponder.on('Ausys:NodeFeeDistributed', async ({ event, context }) => {
  const { node, amount } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  await context.db.insert(nodeFeeDistributedEvents).values({
    id: eventId,
    node,
    amount,
    orderId: null, // Would need to be determined from context
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle AdminSet event
 */
ponder.on('Ausys:AdminSet', async ({ event, context }) => {
  // Log this event using proper logger
  log.info(`Admin set: ${event.args.admin}`, {
    blockNumber: event.block.number,
  });
});
