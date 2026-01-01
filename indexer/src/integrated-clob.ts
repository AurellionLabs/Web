/**
 * Integrated CLOB + Logistics Event Handlers
 *
 * This handler manages the complete flow:
 * 1. Node inventory → CLOB sell orders
 * 2. CLOB order matching → Trade execution
 * 3. Trade → Logistics order creation
 * 4. Driver notification & assignment
 * 5. Delivery tracking & settlement
 */

import { ponder } from '@/generated';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getOrderBookId(
  baseToken: string,
  baseTokenId: bigint,
  quoteToken: string,
): string {
  return `${baseToken.toLowerCase()}-${baseTokenId.toString()}-${quoteToken.toLowerCase()}`;
}

function getInventoryId(
  nodeId: string,
  token: string,
  tokenId: bigint,
): string {
  return `${nodeId.toLowerCase()}-${token.toLowerCase()}-${tokenId.toString()}`;
}

// =============================================================================
// NODE INVENTORY MANAGEMENT
// =============================================================================

/**
 * When a node adds/updates supported assets, create inventory and auto-list on CLOB
 */
ponder.on(
  'AurumNodeManager:SupportedAssetAdded',
  async ({ event, context }) => {
    const { node, asset } = event.args;
    const { token, tokenId, price, capacity } = asset;

    const inventoryId = getInventoryId(node, token, tokenId);

    // Create or update inventory
    await context.db.nodeInventory.upsert({
      id: inventoryId,
      create: {
        nodeId: node,
        token: token,
        tokenId: tokenId,
        totalCapacity: capacity,
        availableQuantity: capacity,
        reservedQuantity: 0n,
        basePrice: price,
        autoList: true,
        minOrderSize: 1n,
        maxOrderSize: null,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      },
      update: {
        totalCapacity: capacity,
        basePrice: price,
        updatedAt: event.block.timestamp,
      },
    });

    // Get quote token from config (could be from contract or config)
    const quoteToken =
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`; // USDC
    const orderBookId = getOrderBookId(token, tokenId, quoteToken);

    // Ensure order book exists
    await context.db.orderBooks.upsert({
      id: orderBookId,
      create: {
        baseToken: token,
        baseTokenId: tokenId,
        quoteToken: quoteToken,
        bestBid: null,
        bestAsk: price,
        spread: null,
        totalBuyOrders: 0n,
        totalSellOrders: 1n,
        totalBuyVolume: 0n,
        totalSellVolume: capacity,
        volume24h: 0n,
        trades24h: 0n,
        high24h: null,
        low24h: null,
        lastPrice: null,
        isActive: true,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      },
      update: {
        updatedAt: event.block.timestamp,
      },
    });

    // Auto-create sell order for node inventory
    const orderId =
      `${event.transaction.hash}-${event.log.logIndex}` as `0x${string}`;

    await context.db.marketOrders.create({
      id: orderId,
      orderBookId: orderBookId,
      maker: node,
      nodeId: node,
      baseToken: token,
      baseTokenId: tokenId,
      quoteToken: quoteToken,
      side: 'sell',
      orderType: 'limit',
      price: price,
      quantity: capacity,
      filledQuantity: 0n,
      remainingQuantity: capacity,
      status: 'open',
      expiresAt: null,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    // Update node stats
    await context.db.nodes.update({
      id: node,
      data: {
        totalListings: (existing) => (existing?.totalListings ?? 0n) + 1n,
        updatedAt: event.block.timestamp,
      },
    });

    // Log event
    await context.db.orderBookEvents.create({
      id: `${event.transaction.hash}-${event.log.logIndex}-list`,
      orderBookId: orderBookId,
      eventType: 'order_placed',
      orderId: orderId,
      tradeId: null,
      eventData: JSON.stringify({
        nodeId: node,
        price: price.toString(),
        quantity: capacity.toString(),
        autoListed: true,
      }),
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  },
);

// =============================================================================
// CLOB ORDER PLACEMENT
// =============================================================================

/**
 * Buy order placed - could match against node inventory
 */
ponder.on('AuraCLOB:OrderPlaced', async ({ event, context }) => {
  const {
    orderId,
    maker,
    baseToken,
    baseTokenId,
    quoteToken,
    price,
    quantity,
    isBuy,
    orderType,
  } = event.args;

  const orderBookId = getOrderBookId(baseToken, baseTokenId, quoteToken);

  // Create the order
  await context.db.marketOrders.create({
    id: orderId,
    orderBookId: orderBookId,
    maker: maker,
    nodeId: null, // Not from a node
    baseToken: baseToken,
    baseTokenId: baseTokenId,
    quoteToken: quoteToken,
    side: isBuy ? 'buy' : 'sell',
    orderType: orderType === 0 ? 'limit' : 'market',
    price: price,
    quantity: quantity,
    filledQuantity: 0n,
    remainingQuantity: quantity,
    status: 'open',
    expiresAt: null,
    createdAt: event.block.timestamp,
    updatedAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });

  // Update order book stats
  await context.db.orderBooks.update({
    id: orderBookId,
    data: {
      totalBuyOrders: isBuy
        ? (existing) => (existing?.totalBuyOrders ?? 0n) + 1n
        : undefined,
      totalSellOrders: !isBuy
        ? (existing) => (existing?.totalSellOrders ?? 0n) + 1n
        : undefined,
      totalBuyVolume: isBuy
        ? (existing) => (existing?.totalBuyVolume ?? 0n) + quantity
        : undefined,
      totalSellVolume: !isBuy
        ? (existing) => (existing?.totalSellVolume ?? 0n) + quantity
        : undefined,
      bestBid: isBuy
        ? (existing) => {
            const current = existing?.bestBid ?? 0n;
            return price > current ? price : current;
          }
        : undefined,
      bestAsk: !isBuy
        ? (existing) => {
            const current = existing?.bestAsk;
            return current === null || price < current ? price : current;
          }
        : undefined,
      updatedAt: event.block.timestamp,
    },
  });
});

// =============================================================================
// ORDER MATCHING & TRADE EXECUTION
// =============================================================================

/**
 * When orders match, create trade and trigger logistics flow
 */
ponder.on('AuraCLOB:OrderMatched', async ({ event, context }) => {
  const { tradeId, buyOrderId, sellOrderId, price, quantity, quoteAmount } =
    event.args;

  // Get both orders
  const buyOrder = await context.db.marketOrders.findUnique({ id: buyOrderId });
  const sellOrder = await context.db.marketOrders.findUnique({
    id: sellOrderId,
  });

  if (!buyOrder || !sellOrder) {
    console.error('Orders not found for match:', { buyOrderId, sellOrderId });
    return;
  }

  const orderBookId = buyOrder.orderBookId;

  // Calculate fees
  const protocolFee = (quoteAmount * 25n) / 10000n; // 0.25%
  const nodeFee = sellOrder.nodeId ? (quoteAmount * 50n) / 10000n : 0n; // 0.5% if from node

  // Create trade record
  await context.db.trades.create({
    id: tradeId,
    orderBookId: orderBookId,
    buyOrderId: buyOrderId,
    sellOrderId: sellOrderId,
    buyer: buyOrder.maker,
    seller: sellOrder.maker,
    sellerNodeId: sellOrder.nodeId,
    baseToken: buyOrder.baseToken,
    baseTokenId: buyOrder.baseTokenId,
    quoteToken: buyOrder.quoteToken,
    price: price,
    quantity: quantity,
    quoteAmount: quoteAmount,
    protocolFee: protocolFee,
    nodeFee: nodeFee,
    logisticsOrderId: null, // Will be set when logistics order is created
    settlementStatus: 'pending',
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });

  // Update orders
  const buyFilled = buyOrder.filledQuantity + quantity;
  const sellFilled = sellOrder.filledQuantity + quantity;

  await context.db.marketOrders.update({
    id: buyOrderId,
    data: {
      filledQuantity: buyFilled,
      remainingQuantity: buyOrder.quantity - buyFilled,
      status: buyFilled >= buyOrder.quantity ? 'filled' : 'partial',
      updatedAt: event.block.timestamp,
    },
  });

  await context.db.marketOrders.update({
    id: sellOrderId,
    data: {
      filledQuantity: sellFilled,
      remainingQuantity: sellOrder.quantity - sellFilled,
      status: sellFilled >= sellOrder.quantity ? 'filled' : 'partial',
      updatedAt: event.block.timestamp,
    },
  });

  // If seller is a node, update inventory
  if (sellOrder.nodeId) {
    const inventoryId = getInventoryId(
      sellOrder.nodeId,
      sellOrder.baseToken,
      sellOrder.baseTokenId,
    );

    await context.db.nodeInventory.update({
      id: inventoryId,
      data: {
        availableQuantity: (existing) =>
          (existing?.availableQuantity ?? 0n) - quantity,
        reservedQuantity: (existing) =>
          (existing?.reservedQuantity ?? 0n) + quantity,
        updatedAt: event.block.timestamp,
      },
    });
  }

  // Update order book stats
  await context.db.orderBooks.update({
    id: orderBookId,
    data: {
      volume24h: (existing) => (existing?.volume24h ?? 0n) + quoteAmount,
      trades24h: (existing) => (existing?.trades24h ?? 0n) + 1n,
      lastPrice: price,
      high24h: (existing) => {
        const current = existing?.high24h;
        return current === null || price > current ? price : current;
      },
      low24h: (existing) => {
        const current = existing?.low24h;
        return current === null || price < current ? price : current;
      },
      updatedAt: event.block.timestamp,
    },
  });

  // Log trade event
  await context.db.orderBookEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-trade`,
    orderBookId: orderBookId,
    eventType: 'trade_executed',
    orderId: null,
    tradeId: tradeId,
    eventData: JSON.stringify({
      buyer: buyOrder.maker,
      seller: sellOrder.maker,
      nodeId: sellOrder.nodeId,
      price: price.toString(),
      quantity: quantity.toString(),
      quoteAmount: quoteAmount.toString(),
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

// =============================================================================
// LOGISTICS ORDER CREATION (Triggered after trade match)
// =============================================================================

/**
 * Trade matched → Create logistics order for physical delivery
 */
ponder.on('AuraCLOB:LogisticsOrderCreated', async ({ event, context }) => {
  const {
    orderId,
    tradeId,
    buyer,
    seller,
    sellerNode,
    token,
    tokenId,
    quantity,
    totalPrice,
    driverBounty,
    pickupLocation,
    deliveryLocation,
  } = event.args;

  // Calculate fees
  const txFee = (totalPrice * 25n) / 10000n;
  const nodeFee = (totalPrice * 50n) / 10000n;
  const escrowedAmount = totalPrice + txFee;

  // Create logistics order
  await context.db.logisticsOrders.create({
    id: orderId,
    tradeId: tradeId,
    buyer: buyer,
    seller: seller,
    sellerNodeId: sellerNode,
    token: token,
    tokenId: tokenId,
    quantity: quantity,
    totalPrice: totalPrice,
    escrowedAmount: escrowedAmount,
    txFee: txFee,
    nodeFee: nodeFee,
    driverBounty: driverBounty,
    pickupLat: pickupLocation.lat,
    pickupLng: pickupLocation.lng,
    pickupName: pickupLocation.name,
    deliveryLat: deliveryLocation.lat,
    deliveryLng: deliveryLocation.lng,
    deliveryName: deliveryLocation.name,
    status: 'created',
    createdAt: event.block.timestamp,
    assignedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    settledAt: null,
    updatedAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });

  // Link trade to logistics order
  await context.db.trades.update({
    id: tradeId,
    data: {
      logisticsOrderId: orderId,
      settlementStatus: 'pending',
    },
  });

  // Create escrow record
  await context.db.escrows.create({
    id: orderId,
    orderId: orderId,
    totalAmount: escrowedAmount,
    sellerAmount: totalPrice - nodeFee - driverBounty,
    nodeFeeAmount: nodeFee,
    driverBountyAmount: driverBounty,
    protocolFeeAmount: txFee,
    token: token, // Assuming payment in same token, adjust as needed
    status: 'held',
    sellerPaid: false,
    nodePaid: false,
    driverPaid: false,
    createdAt: event.block.timestamp,
    releasedAt: null,
    updatedAt: event.block.timestamp,
  });

  // Log event
  await context.db.logisticsEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-created`,
    orderId: orderId,
    eventType: 'created',
    actor: buyer,
    actorRole: 'buyer',
    lat: null,
    lng: null,
    eventData: JSON.stringify({
      tradeId,
      quantity: quantity.toString(),
      totalPrice: totalPrice.toString(),
      driverBounty: driverBounty.toString(),
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

// =============================================================================
// DRIVER NOTIFICATIONS
// =============================================================================

/**
 * Notify nearby drivers of new order
 */
ponder.on('AuraCLOB:DriverNotified', async ({ event, context }) => {
  const {
    orderId,
    driver,
    pickupLocation,
    deliveryLocation,
    bountyAmount,
    estimatedDistance,
    expiresAt,
  } = event.args;

  const notificationId = `${orderId}-${driver}-${event.block.timestamp}`;

  await context.db.driverNotifications.create({
    id: notificationId,
    orderId: orderId,
    driverId: driver,
    notificationType: 'new_order',
    message: `New delivery available: ${pickupLocation.name} → ${deliveryLocation.name}`,
    pickupLocation: pickupLocation.name,
    deliveryLocation: deliveryLocation.name,
    estimatedDistance: estimatedDistance,
    bountyAmount: bountyAmount,
    status: 'pending',
    respondedAt: null,
    expiresAt: expiresAt,
    createdAt: event.block.timestamp,
  });

  // Log event
  await context.db.logisticsEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-notify`,
    orderId: orderId,
    eventType: 'driver_notified',
    actor: driver,
    actorRole: 'driver',
    lat: null,
    lng: null,
    eventData: JSON.stringify({
      bountyAmount: bountyAmount.toString(),
      estimatedDistance: estimatedDistance?.toString(),
      expiresAt: expiresAt.toString(),
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

// =============================================================================
// DRIVER ASSIGNMENT
// =============================================================================

/**
 * Driver accepts and is assigned to order
 */
ponder.on('AuraCLOB:DriverAssigned', async ({ event, context }) => {
  const {
    orderId,
    driver,
    estimatedPickupTime,
    estimatedDeliveryTime,
    bountyAmount,
  } = event.args;

  const assignmentId = `${orderId}-${driver}`;

  // Create assignment
  await context.db.driverAssignments.create({
    id: assignmentId,
    orderId: orderId,
    driverId: driver,
    estimatedPickupTime: estimatedPickupTime,
    estimatedDeliveryTime: estimatedDeliveryTime,
    actualPickupTime: null,
    actualDeliveryTime: null,
    bountyAmount: bountyAmount,
    bonusAmount: 0n,
    status: 'assigned',
    createdAt: event.block.timestamp,
    updatedAt: event.block.timestamp,
  });

  // Update logistics order
  await context.db.logisticsOrders.update({
    id: orderId,
    data: {
      status: 'assigned',
      assignedAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    },
  });

  // Update trade settlement status
  const order = await context.db.logisticsOrders.findUnique({ id: orderId });
  if (order) {
    await context.db.trades.update({
      id: order.tradeId,
      data: {
        settlementStatus: 'in_transit',
      },
    });
  }

  // Update driver
  await context.db.drivers.upsert({
    id: driver,
    create: {
      isActive: true,
      isAvailable: false,
      currentLat: null,
      currentLng: null,
      totalDeliveries: 1n,
      completedDeliveries: 0n,
      cancelledDeliveries: 0n,
      totalEarnings: 0n,
      averageRating: 0n,
      currentOrderId: orderId,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    },
    update: {
      isAvailable: false,
      totalDeliveries: (existing) => (existing?.totalDeliveries ?? 0n) + 1n,
      currentOrderId: orderId,
      updatedAt: event.block.timestamp,
    },
  });

  // Update notification status
  const notificationId = `${orderId}-${driver}-*`; // Would need actual timestamp
  // Mark notification as accepted (simplified - real impl would use proper ID)

  // Log event
  await context.db.logisticsEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-assigned`,
    orderId: orderId,
    eventType: 'driver_assigned',
    actor: driver,
    actorRole: 'driver',
    lat: null,
    lng: null,
    eventData: JSON.stringify({
      estimatedPickupTime: estimatedPickupTime.toString(),
      estimatedDeliveryTime: estimatedDeliveryTime.toString(),
      bountyAmount: bountyAmount.toString(),
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

// =============================================================================
// DELIVERY TRACKING
// =============================================================================

/**
 * Package picked up from node
 */
ponder.on('AuraCLOB:PackagePickedUp', async ({ event, context }) => {
  const { orderId, driver, signature, location } = event.args;

  // Update logistics order
  await context.db.logisticsOrders.update({
    id: orderId,
    data: {
      status: 'picked_up',
      pickedUpAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    },
  });

  // Update driver assignment
  const assignmentId = `${orderId}-${driver}`;
  await context.db.driverAssignments.update({
    id: assignmentId,
    data: {
      actualPickupTime: event.block.timestamp,
      status: 'picked_up',
      updatedAt: event.block.timestamp,
    },
  });

  // Record signature
  await context.db.deliverySignatures.create({
    id: `${orderId}-${driver}-pickup`,
    orderId: orderId,
    signer: driver,
    signerRole: 'driver',
    signatureType: 'pickup_confirm',
    signatureHash: signature,
    lat: location.lat,
    lng: location.lng,
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });

  // Log event
  await context.db.logisticsEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-pickup`,
    orderId: orderId,
    eventType: 'picked_up',
    actor: driver,
    actorRole: 'driver',
    lat: location.lat,
    lng: location.lng,
    eventData: JSON.stringify({ signatureHash: signature }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Package in transit (driver location update)
 */
ponder.on('AuraCLOB:DriverLocationUpdated', async ({ event, context }) => {
  const { orderId, driver, location } = event.args;

  // Update driver location
  await context.db.drivers.update({
    id: driver,
    data: {
      currentLat: location.lat,
      currentLng: location.lng,
      updatedAt: event.block.timestamp,
    },
  });

  // Update logistics order status
  await context.db.logisticsOrders.update({
    id: orderId,
    data: {
      status: 'in_transit',
      updatedAt: event.block.timestamp,
    },
  });

  // Log location update (for tracking history)
  await context.db.logisticsEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-location`,
    orderId: orderId,
    eventType: 'in_transit',
    actor: driver,
    actorRole: 'driver',
    lat: location.lat,
    lng: location.lng,
    eventData: JSON.stringify({ timestamp: event.block.timestamp.toString() }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Package delivered
 */
ponder.on('AuraCLOB:PackageDelivered', async ({ event, context }) => {
  const { orderId, driver, receiver, signature, location } = event.args;

  // Update logistics order
  await context.db.logisticsOrders.update({
    id: orderId,
    data: {
      status: 'delivered',
      deliveredAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    },
  });

  // Update driver assignment
  const assignmentId = `${orderId}-${driver}`;
  await context.db.driverAssignments.update({
    id: assignmentId,
    data: {
      actualDeliveryTime: event.block.timestamp,
      status: 'delivered',
      updatedAt: event.block.timestamp,
    },
  });

  // Record receiver signature
  await context.db.deliverySignatures.create({
    id: `${orderId}-${receiver}-delivery`,
    orderId: orderId,
    signer: receiver,
    signerRole: 'buyer',
    signatureType: 'receipt_confirm',
    signatureHash: signature,
    lat: location.lat,
    lng: location.lng,
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });

  // Update trade settlement status
  const order = await context.db.logisticsOrders.findUnique({ id: orderId });
  if (order) {
    await context.db.trades.update({
      id: order.tradeId,
      data: {
        settlementStatus: 'delivered',
      },
    });
  }

  // Log event
  await context.db.logisticsEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-delivered`,
    orderId: orderId,
    eventType: 'delivered',
    actor: receiver,
    actorRole: 'buyer',
    lat: location.lat,
    lng: location.lng,
    eventData: JSON.stringify({ signatureHash: signature, driver }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

// =============================================================================
// SETTLEMENT
// =============================================================================

/**
 * Order settled - release escrow to all parties
 */
ponder.on('AuraCLOB:OrderSettled', async ({ event, context }) => {
  const { orderId } = event.args;

  const order = await context.db.logisticsOrders.findUnique({ id: orderId });
  const escrow = await context.db.escrows.findUnique({ id: orderId });

  if (!order || !escrow) {
    console.error('Order or escrow not found:', orderId);
    return;
  }

  // Update logistics order
  await context.db.logisticsOrders.update({
    id: orderId,
    data: {
      status: 'settled',
      settledAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    },
  });

  // Update escrow
  await context.db.escrows.update({
    id: orderId,
    data: {
      status: 'released',
      releasedAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    },
  });

  // Update trade
  await context.db.trades.update({
    id: order.tradeId,
    data: {
      settlementStatus: 'settled',
    },
  });

  // Update node inventory - remove reserved quantity
  const inventoryId = getInventoryId(
    order.sellerNodeId,
    order.token,
    order.tokenId,
  );

  await context.db.nodeInventory.update({
    id: inventoryId,
    data: {
      reservedQuantity: (existing) =>
        (existing?.reservedQuantity ?? 0n) - order.quantity,
      updatedAt: event.block.timestamp,
    },
  });

  // Update node stats
  await context.db.nodes.update({
    id: order.sellerNodeId,
    data: {
      totalSales: (existing) => (existing?.totalSales ?? 0n) + 1n,
      totalVolume: (existing) =>
        (existing?.totalVolume ?? 0n) + order.totalPrice,
      updatedAt: event.block.timestamp,
    },
  });

  // Log event
  await context.db.logisticsEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-settled`,
    orderId: orderId,
    eventType: 'settled',
    actor: order.buyer,
    actorRole: 'system',
    lat: null,
    lng: null,
    eventData: JSON.stringify({
      totalPrice: order.totalPrice.toString(),
      nodeFee: order.nodeFee.toString(),
      driverBounty: order.driverBounty.toString(),
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Seller paid
 */
ponder.on('AuraCLOB:SellerPaid', async ({ event, context }) => {
  const { orderId, seller, amount, token } = event.args;

  // Record payment
  await context.db.payments.create({
    id: `${orderId}-${seller}-seller`,
    orderId: orderId,
    recipient: seller,
    recipientRole: 'seller',
    token: token,
    amount: amount,
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });

  // Update escrow
  await context.db.escrows.update({
    id: orderId,
    data: {
      sellerPaid: true,
      updatedAt: event.block.timestamp,
    },
  });
});

/**
 * Node fee paid
 */
ponder.on('AuraCLOB:NodeFeePaid', async ({ event, context }) => {
  const { orderId, node, amount, token } = event.args;

  // Record payment
  await context.db.payments.create({
    id: `${orderId}-${node}-node`,
    orderId: orderId,
    recipient: node,
    recipientRole: 'node',
    token: token,
    amount: amount,
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });

  // Update escrow
  await context.db.escrows.update({
    id: orderId,
    data: {
      nodePaid: true,
      updatedAt: event.block.timestamp,
    },
  });
});

/**
 * Driver bounty paid
 */
ponder.on('AuraCLOB:DriverPaid', async ({ event, context }) => {
  const { orderId, driver, amount, token } = event.args;

  // Record payment
  await context.db.payments.create({
    id: `${orderId}-${driver}-driver`,
    orderId: orderId,
    recipient: driver,
    recipientRole: 'driver',
    token: token,
    amount: amount,
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });

  // Update escrow
  await context.db.escrows.update({
    id: orderId,
    data: {
      driverPaid: true,
      updatedAt: event.block.timestamp,
    },
  });

  // Update driver stats
  await context.db.drivers.update({
    id: driver,
    data: {
      completedDeliveries: (existing) =>
        (existing?.completedDeliveries ?? 0n) + 1n,
      totalEarnings: (existing) => (existing?.totalEarnings ?? 0n) + amount,
      isAvailable: true,
      currentOrderId: null,
      updatedAt: event.block.timestamp,
    },
  });
});
