import { ponder } from '@/generated';

// =============================================================================
// AUSYS EVENT HANDLERS - Orders, Journeys, Signatures, Settlements
// =============================================================================

/**
 * Handle JourneyCreated event
 */
ponder.on('Ausys:JourneyCreated', async ({ event, context }) => {
  const { journeyId, sender, receiver } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

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
    console.warn(`Failed to get journey data for ${journeyId}:`, e);
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

  // Create Journey entity
  await context.db.journeys.create({
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
  });

  // Create JourneyCreated event
  await context.db.journeyCreatedEvents.create({
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
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Get current journey to capture old status
  const journey = await context.db.journeys.findUnique({ id: journeyId });
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

  await context.db.journeys.update({
    id: journeyId,
    data: updateData,
  });

  // Create JourneyStatusUpdate event
  await context.db.journeyStatusUpdates.create({
    id: eventId,
    journeyId,
    oldStatus,
    newStatus,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle JourneyCanceled event
 */
ponder.on('Ausys:JourneyCanceled', async ({ event, context }) => {
  const { journeyId } = event.args;

  // Update Journey entity to canceled status
  await context.db.journeys.update({
    id: journeyId,
    data: {
      currentStatus: 3, // Canceled
      updatedAt: event.block.timestamp,
    },
  });
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
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Create Order entity
  await context.db.orders.create({
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
  });

  // Create OrderCreated event
  await context.db.orderCreatedEvents.create({
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
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Get current order to capture old status
  const order = await context.db.orders.findUnique({ id: orderId });
  const oldStatus = order?.currentStatus ?? 0;

  // Update Order entity
  await context.db.orders.update({
    id: orderId,
    data: {
      currentStatus: newStatus,
      updatedAt: event.block.timestamp,
    },
  });

  // Create OrderStatusUpdate event
  await context.db.orderStatusUpdates.create({
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
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

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
    console.warn(`Failed to get order data for ${orderId}:`, e);
  }

  // Update Order entity
  await context.db.orders.update({
    id: orderId,
    data: {
      currentStatus: 2, // Settled
      updatedAt: event.block.timestamp,
    },
  });

  // Create OrderSettled event
  await context.db.orderSettledEvents.create({
    id: eventId,
    orderId,
    totalPrice,
    totalFee,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update NodeStats for involved nodes
  const order = await context.db.orders.findUnique({ id: orderId });
  if (order) {
    const nodes = JSON.parse(order.nodes) as `0x${string}`[];
    const nodeCount = nodes.length;
    if (nodeCount > 0) {
      const feePerNode = totalFee / BigInt(nodeCount);
      for (let i = 0; i < nodeCount; i++) {
        const nodeAddress = nodes[i];
        const nodeStats = await context.db.nodeStats.findUnique({
          id: nodeAddress,
        });
        if (nodeStats) {
          await context.db.nodeStats.update({
            id: nodeAddress,
            data: {
              totalOrders: nodeStats.totalOrders + 1n,
              completedOrders: nodeStats.completedOrders + 1n,
              totalRevenue: nodeStats.totalRevenue + totalPrice,
              totalFeesEarned: nodeStats.totalFeesEarned + feePerNode,
              lastActiveAt: event.block.timestamp,
              updatedAt: event.block.timestamp,
            },
          });
        } else {
          await context.db.nodeStats.create({
            id: nodeAddress,
            node: nodeAddress,
            totalOrders: 1n,
            completedOrders: 1n,
            totalRevenue: totalPrice,
            totalFeesEarned: feePerNode,
            lastActiveAt: event.block.timestamp,
            updatedAt: event.block.timestamp,
          });
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
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Update Journey entity with driver
  await context.db.journeys.update({
    id: journeyId,
    data: {
      driver,
      updatedAt: event.block.timestamp,
    },
  });

  // Create DriverAssignment event
  await context.db.driverAssignments.create({
    id: eventId,
    driver,
    journeyId,
    assignedBy: event.transaction.from,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update DriverStats
  const driverStats = await context.db.driverStats.findUnique({ id: driver });
  if (driverStats) {
    await context.db.driverStats.update({
      id: driver,
      data: {
        totalJourneys: driverStats.totalJourneys + 1n,
        lastActiveAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      },
    });
  } else {
    await context.db.driverStats.create({
      id: driver,
      driver,
      totalJourneys: 1n,
      completedJourneys: 0n,
      canceledJourneys: 0n,
      totalEarnings: 0n,
      averageRating: 0n,
      lastActiveAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
  }
});

/**
 * Handle emitSig (PackageSignature) event
 */
ponder.on('Ausys:emitSig', async ({ event, context }) => {
  const { user, id: journeyId } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Get journey to determine signature type
  const journey = await context.db.journeys.findUnique({ id: journeyId });
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

  // Create PackageSignature event
  await context.db.packageSignatures.create({
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
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  await context.db.fundsEscrowedEvents.create({
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
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  await context.db.sellerPaidEvents.create({
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
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  await context.db.nodeFeeDistributedEvents.create({
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
  // Just log this event - could be used for admin tracking
  console.log(`Admin set: ${event.args.admin} at block ${event.block.number}`);
});
