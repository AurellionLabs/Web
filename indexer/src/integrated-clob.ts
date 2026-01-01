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
 * When a node adds supported assets, only update inventory capacity
 * Node must explicitly place sell orders at their chosen price
 */
ponder.on(
  'AurumNodeManager:SupportedAssetAdded',
  async ({ event, context }) => {
    const { node, asset } = event.args;
    const { token, tokenId, price, capacity } = asset;

    const inventoryId = getInventoryId(node, token, tokenId);

    // Create or update inventory (no auto-listing)
    await context.db.nodeInventory.upsert({
      id: inventoryId,
      create: {
        nodeId: node,
        token: token,
        tokenId: tokenId,
        totalCapacity: capacity,
        availableQuantity: capacity,
        reservedQuantity: 0n,
        basePrice: price, // Reference price, node can list at different price
        autoList: false, // No auto-listing
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

    // Log inventory update event (no sell order created yet)
    await context.db.logisticsEvents.create({
      id: `${event.transaction.hash}-${event.log.logIndex}-inventory`,
      orderId:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      eventType: 'inventory_updated',
      actor: node,
      actorRole: 'node',
      lat: null,
      lng: null,
      eventData: JSON.stringify({
        token,
        tokenId: tokenId.toString(),
        capacity: capacity.toString(),
        referencePrice: price.toString(),
      }),
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  },
);

/**
 * Node explicitly places a sell order at their chosen price
 * This is called when node decides to list inventory on the CLOB
 */
ponder.on('AuraCLOB:NodeSellOrderPlaced', async ({ event, context }) => {
  const { orderId, node, token, tokenId, quoteToken, price, quantity } =
    event.args;

  const inventoryId = getInventoryId(node, token, tokenId);
  const orderBookId = getOrderBookId(token, tokenId, quoteToken);

  // Verify node has sufficient inventory
  const inventory = await context.db.nodeInventory.findUnique({
    id: inventoryId,
  });

  if (!inventory || inventory.availableQuantity < quantity) {
    console.error('Insufficient inventory for node sell order:', {
      node,
      requested: quantity,
      available: inventory?.availableQuantity ?? 0n,
    });
    return;
  }

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
      totalSellVolume: quantity,
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
      totalSellOrders: (existing) => (existing?.totalSellOrders ?? 0n) + 1n,
      totalSellVolume: (existing) =>
        (existing?.totalSellVolume ?? 0n) + quantity,
      bestAsk: (existing) => {
        const current = existing?.bestAsk;
        return current === null || price < current ? price : current;
      },
      updatedAt: event.block.timestamp,
    },
  });

  // Create sell order
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

  // Reserve inventory (reduce available, track as listed)
  await context.db.nodeInventory.update({
    id: inventoryId,
    data: {
      availableQuantity: (existing) =>
        (existing?.availableQuantity ?? 0n) - quantity,
      updatedAt: event.block.timestamp,
    },
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
      quantity: quantity.toString(),
      manualListing: true,
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Node cancels a sell order - returns inventory to available
 */
ponder.on('AuraCLOB:NodeSellOrderCancelled', async ({ event, context }) => {
  const { orderId, node } = event.args;

  const order = await context.db.marketOrders.findUnique({ id: orderId });

  if (!order || order.nodeId !== node) {
    console.error('Order not found or not owned by node:', { orderId, node });
    return;
  }

  const remainingQuantity = order.remainingQuantity;
  const inventoryId = getInventoryId(node, order.baseToken, order.baseTokenId);

  // Return remaining quantity to inventory
  await context.db.nodeInventory.update({
    id: inventoryId,
    data: {
      availableQuantity: (existing) =>
        (existing?.availableQuantity ?? 0n) + remainingQuantity,
      updatedAt: event.block.timestamp,
    },
  });

  // Update order status
  await context.db.marketOrders.update({
    id: orderId,
    data: {
      status: 'cancelled',
      remainingQuantity: 0n,
      updatedAt: event.block.timestamp,
    },
  });

  // Update order book
  await context.db.orderBooks.update({
    id: order.orderBookId,
    data: {
      totalSellOrders: (existing) =>
        Math.max(0, Number((existing?.totalSellOrders ?? 1n) - 1n)),
      totalSellVolume: (existing) =>
        (existing?.totalSellVolume ?? 0n) - remainingQuantity,
      updatedAt: event.block.timestamp,
    },
  });

  // Log event
  await context.db.orderBookEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-cancel`,
    orderBookId: order.orderBookId,
    eventType: 'order_cancelled',
    orderId: orderId,
    tradeId: null,
    eventData: JSON.stringify({
      nodeId: node,
      returnedQuantity: remainingQuantity.toString(),
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Node updates price on existing sell order
 */
ponder.on('AuraCLOB:NodeSellOrderUpdated', async ({ event, context }) => {
  const { orderId, node, newPrice } = event.args;

  const order = await context.db.marketOrders.findUnique({ id: orderId });

  if (!order || order.nodeId !== node) {
    console.error('Order not found or not owned by node:', { orderId, node });
    return;
  }

  // Update order price
  await context.db.marketOrders.update({
    id: orderId,
    data: {
      price: newPrice,
      updatedAt: event.block.timestamp,
    },
  });

  // Log event
  await context.db.orderBookEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-update`,
    orderBookId: order.orderBookId,
    eventType: 'order_updated',
    orderId: orderId,
    tradeId: null,
    eventData: JSON.stringify({
      nodeId: node,
      oldPrice: order.price.toString(),
      newPrice: newPrice.toString(),
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

// =============================================================================
// BUYER ORDER MANAGEMENT
// =============================================================================

/**
 * Buyer places a buy order (limit order on the book)
 * Can match immediately if price >= best ask, otherwise rests on book
 */
ponder.on('AuraCLOB:BuyOrderPlaced', async ({ event, context }) => {
  const {
    orderId,
    buyer,
    baseToken,
    baseTokenId,
    quoteToken,
    price,
    quantity,
  } = event.args;

  const orderBookId = getOrderBookId(baseToken, baseTokenId, quoteToken);

  // Ensure order book exists
  await context.db.orderBooks.upsert({
    id: orderBookId,
    create: {
      baseToken: baseToken,
      baseTokenId: baseTokenId,
      quoteToken: quoteToken,
      bestBid: price,
      bestAsk: null,
      spread: null,
      totalBuyOrders: 1n,
      totalSellOrders: 0n,
      totalBuyVolume: quantity,
      totalSellVolume: 0n,
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
      totalBuyOrders: (existing) => (existing?.totalBuyOrders ?? 0n) + 1n,
      totalBuyVolume: (existing) => (existing?.totalBuyVolume ?? 0n) + quantity,
      bestBid: (existing) => {
        const current = existing?.bestBid ?? 0n;
        return price > current ? price : current;
      },
      updatedAt: event.block.timestamp,
    },
  });

  // Create buy order
  await context.db.marketOrders.create({
    id: orderId,
    orderBookId: orderBookId,
    maker: buyer,
    nodeId: null, // Not from a node
    baseToken: baseToken,
    baseTokenId: baseTokenId,
    quoteToken: quoteToken,
    side: 'buy',
    orderType: 'limit',
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

  // Log event
  await context.db.orderBookEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-buy`,
    orderBookId: orderBookId,
    eventType: 'order_placed',
    orderId: orderId,
    tradeId: null,
    eventData: JSON.stringify({
      buyer,
      side: 'buy',
      price: price.toString(),
      quantity: quantity.toString(),
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Buyer cancels their buy order
 */
ponder.on('AuraCLOB:BuyOrderCancelled', async ({ event, context }) => {
  const { orderId, buyer } = event.args;

  const order = await context.db.marketOrders.findUnique({ id: orderId });

  if (!order || order.maker !== buyer || order.side !== 'buy') {
    console.error('Buy order not found or not owned by buyer:', {
      orderId,
      buyer,
    });
    return;
  }

  const remainingQuantity = order.remainingQuantity;

  // Update order status
  await context.db.marketOrders.update({
    id: orderId,
    data: {
      status: 'cancelled',
      remainingQuantity: 0n,
      updatedAt: event.block.timestamp,
    },
  });

  // Update order book
  await context.db.orderBooks.update({
    id: order.orderBookId,
    data: {
      totalBuyOrders: (existing) =>
        (existing?.totalBuyOrders ?? 1n) > 0n
          ? (existing?.totalBuyOrders ?? 1n) - 1n
          : 0n,
      totalBuyVolume: (existing) =>
        (existing?.totalBuyVolume ?? 0n) - remainingQuantity,
      updatedAt: event.block.timestamp,
    },
  });

  // Log event
  await context.db.orderBookEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-cancel`,
    orderBookId: order.orderBookId,
    eventType: 'order_cancelled',
    orderId: orderId,
    tradeId: null,
    eventData: JSON.stringify({
      buyer,
      side: 'buy',
      cancelledQuantity: remainingQuantity.toString(),
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Buyer updates price on existing buy order
 */
ponder.on('AuraCLOB:BuyOrderUpdated', async ({ event, context }) => {
  const { orderId, buyer, newPrice } = event.args;

  const order = await context.db.marketOrders.findUnique({ id: orderId });

  if (!order || order.maker !== buyer || order.side !== 'buy') {
    console.error('Buy order not found or not owned by buyer:', {
      orderId,
      buyer,
    });
    return;
  }

  // Update order price
  await context.db.marketOrders.update({
    id: orderId,
    data: {
      price: newPrice,
      updatedAt: event.block.timestamp,
    },
  });

  // Log event
  await context.db.orderBookEvents.create({
    id: `${event.transaction.hash}-${event.log.logIndex}-update`,
    orderBookId: order.orderBookId,
    eventType: 'order_updated',
    orderId: orderId,
    tradeId: null,
    eventData: JSON.stringify({
      buyer,
      side: 'buy',
      oldPrice: order.price.toString(),
      newPrice: newPrice.toString(),
    }),
    createdAt: event.block.timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
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
