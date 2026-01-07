// @ts-nocheck - File with type issues that need deeper refactoring
import { ponder } from '@/generated';
import {
  nodes,
  nodeAssets,
  nodeRegisteredEvents,
  nodeOwnershipTransferredEvents,
  nodeStatusUpdatedEvents,
  supportedAssetAddedEvents,
  assets,
  assetAttributes,
  supportedClasses,
  unifiedOrders,
  unifiedOrderCreatedEvents,
  tradeMatchedEvents,
  logisticsOrderCreatedEvents,
  unifiedOrderSettledEvents,
  clobOrders,
  clobTrades,
  clobPools,
  clobLiquidityPositions,
  orderPlacedEvents,
  orderMatchedEvents,
  orderCancelledEvents,
  tradeExecutedEvents,
  liquidityAddedEvents,
  liquidityRemovedEvents,
  poolCreatedEvents,
  marketData,
  userTradingStats,
} from '../ponder.schema';

// =============================================================================
// DIAMOND NODE HANDLERS - All node events come from the Diamond proxy
// =============================================================================

/**
 * Handle NodeRegistered event from Diamond
 */
ponder.on('Diamond:NodeRegistered', async ({ event, context }) => {
  const { nodeHash, owner, nodeType } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Get additional node data from Diamond
  let locationData = {
    addressName: '',
    lat: '0',
    lng: '0',
  };
  let status = 'Active';

  try {
    // getNode returns flat fields: [owner, nodeType, capacity, createdAt, active, validNode, assetHash, addressName, lat, lng]
    const node = await context.client.readContract({
      abi: context.contracts.Diamond.abi,
      address: context.contracts.Diamond.address,
      functionName: 'getNode',
      args: [nodeHash],
    });
    // Access flat fields directly (viem returns as array or object depending on ABI)
    locationData = {
      addressName: (node as any).addressName || (node as any)[7] || '',
      lat: (node as any).lat || (node as any)[8] || '0',
      lng: (node as any).lng || (node as any)[9] || '0',
    };
    status = ((node as any).active ?? (node as any)[4]) ? 'Active' : 'Inactive';
  } catch (e) {
    console.warn(`Failed to get node data for ${nodeHash}:`, e);
  }

  // Insert Node entity using db.insert().values() with onConflictDoNothing to handle re-orgs
  await context.db
    .insert(nodes)
    .values({
      id: nodeHash,
      owner,
      addressName: locationData.addressName,
      lat: locationData.lat,
      lng: locationData.lng,
      validNode: true,
      status,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Insert NodeRegistered event
  await context.db.insert(nodeRegisteredEvents).values({
    id: eventId,
    nodeAddress: nodeHash,
    owner,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle NodeUpdated event from Diamond
 */
ponder.on('Diamond:NodeUpdated', async ({ event, context }) => {
  const { nodeHash, nodeType, capacity } = event.args;

  // Update Node entity
  await context.db.update(nodes, { id: nodeHash }).set({
    status: 'Active', // Node is active after update
    updatedAt: event.block.timestamp,
  });
});

/**
 * Handle NodeDeactivated event from Diamond
 */
ponder.on('Diamond:NodeDeactivated', async ({ event, context }) => {
  const { nodeHash } = event.args;

  // Update Node entity
  await context.db.update(nodes, { id: nodeHash }).set({
    status: 'Inactive',
    updatedAt: event.block.timestamp,
  });
});

/**
 * Handle SupportedAssetAdded event from Diamond
 * This is emitted when a node adds a new supported asset via addSupportedAsset()
 */
ponder.on('Diamond:SupportedAssetAdded', async ({ event, context }) => {
  const { nodeHash, token, tokenId, price, capacity } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
  const assetId = `${nodeHash}-${token}-${tokenId}`;

  // Insert node asset
  await context.db
    .insert(nodeAssets)
    .values({
      id: assetId,
      node: nodeHash,
      token: token,
      tokenId: tokenId,
      price: price,
      capacity: capacity,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Insert SupportedAssetAdded event
  await context.db.insert(supportedAssetAddedEvents).values({
    id: eventId,
    nodeAddress: nodeHash,
    token: token,
    tokenId: tokenId,
    price: price,
    capacity: capacity,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle SupportedAssetsUpdated event from Diamond
 * This is emitted when a node updates its supported assets via updateSupportedAssets()
 */
ponder.on('Diamond:SupportedAssetsUpdated', async ({ event, context }) => {
  const { nodeHash, count } = event.args;

  // Note: The event only tells us the count changed, we need to read the actual assets
  // from the contract. For now, we'll just log this - the actual asset data comes from
  // SupportedAssetAdded events or needs to be read from contract state.
  console.log(
    `[Diamond] SupportedAssetsUpdated for node ${nodeHash}, count: ${count}`,
  );
});

/**
 * Handle UpdateLocation event from Diamond
 */
ponder.on('Diamond:UpdateLocation', async ({ event, context }) => {
  const { addressName, lat, lng, node } = event.args;

  // Update Node entity with new location
  await context.db.update(nodes, { id: node }).set({
    addressName,
    lat,
    lng,
    updatedAt: event.block.timestamp,
  });
});

/**
 * Handle UpdateOwner event from Diamond
 */
ponder.on('Diamond:UpdateOwner', async ({ event, context }) => {
  const { owner, node } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Get current owner for event record
  const existingNode = await context.db.find(nodes, { id: node });
  const oldOwner =
    existingNode?.owner || '0x0000000000000000000000000000000000000000';

  // Update Node entity with new owner
  await context.db.update(nodes, { id: node }).set({
    owner,
    updatedAt: event.block.timestamp,
  });

  // Insert ownership transfer event
  await context.db.insert(nodeOwnershipTransferredEvents).values({
    id: eventId,
    nodeAddress: node,
    oldOwner,
    newOwner: owner,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle UpdateStatus event from Diamond
 */
ponder.on('Diamond:UpdateStatus', async ({ event, context }) => {
  const { status, node } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Convert bytes1 status to string
  const statusStr = status === '0x01' ? 'Active' : 'Inactive';

  // Update Node entity
  await context.db.update(nodes, { id: node }).set({
    status: statusStr,
    updatedAt: event.block.timestamp,
  });

  // Insert status update event
  await context.db.insert(nodeStatusUpdatedEvents).values({
    id: eventId,
    nodeAddress: node,
    status: statusStr,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle NodeCapacityUpdated event from Diamond
 */
ponder.on('Diamond:NodeCapacityUpdated', async ({ event, context }) => {
  const { nodeHash, quantities } = event.args;

  // Update node timestamp
  await context.db.update(nodes, { id: nodeHash }).set({
    updatedAt: event.block.timestamp,
  });

  // Note: quantities is an array - we'd need to match these to specific assets
  // This would require reading the node's asset list from the contract
  console.log(
    `[Diamond] NodeCapacityUpdated for node ${nodeHash}, quantities: ${quantities.length}`,
  );
});

/**
 * Handle ClobApprovalGranted event from Diamond
 */
ponder.on('Diamond:ClobApprovalGranted', async ({ event, context }) => {
  const { nodeHash, clobAddress } = event.args;

  console.log(
    `[Diamond] ClobApprovalGranted for node ${nodeHash}, CLOB: ${clobAddress}`,
  );
});

/**
 * Handle ClobApprovalRevoked event from Diamond
 */
ponder.on('Diamond:ClobApprovalRevoked', async ({ event, context }) => {
  const { nodeHash, clobAddress } = event.args;

  console.log(
    `[Diamond] ClobApprovalRevoked for node ${nodeHash}, CLOB: ${clobAddress}`,
  );
});

// =============================================================================
// DIAMOND ASSET HANDLERS - Asset management events from Diamond
// =============================================================================

/**
 * Handle AssetClassAdded event from Diamond
 */
ponder.on('Diamond:AssetClassAdded', async ({ event, context }) => {
  const { assetClass } = event.args;

  // Insert new supported class
  await context.db
    .insert(supportedClasses)
    .values({
      id: assetClass,
      name: assetClass,
      index: 0n, // Would need to track index from contract
      isActive: true,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoNothing();
});

/**
 * Handle AssetAdded event from Diamond
 */
ponder.on('Diamond:AssetAdded', async ({ event, context }) => {
  const { assetHash, name, assetClass } = event.args;

  // Insert new asset
  await context.db
    .insert(assets)
    .values({
      id: assetHash,
      hash: assetHash,
      tokenId: 0n, // Would need to get from contract
      name,
      assetClass,
      className: assetClass,
      account: event.transaction.from,
      amount: 0n,
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// =============================================================================
// DIAMOND BRIDGE HANDLERS - Order Bridge events from Diamond
// =============================================================================

/**
 * Handle UnifiedOrderCreated event from Diamond BridgeFacet
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
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert unified order entity
  await context.db
    .insert(unifiedOrders)
    .values({
      id: unifiedOrderId,
      clobOrderId,
      clobTradeId: null,
      ausysOrderId: null,
      journeyIds: '[]',
      buyer,
      seller,
      sellerNode: seller, // Initially same as seller
      token,
      tokenId,
      tokenQuantity: quantity,
      price,
      bounty: 0n,
      status: 1, // PendingTrade
      logisticsStatus: 0, // None
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
    .onConflictDoNothing();

  // Insert event record
  await context.db.insert(unifiedOrderCreatedEvents).values({
    id: eventId,
    unifiedOrderId,
    clobOrderId,
    buyer,
    seller,
    token,
    tokenId,
    quantity,
    price,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle TradeMatched event from Diamond BridgeFacet
 */
ponder.on('Diamond:TradeMatched', async ({ event, context }) => {
  const { unifiedOrderId, clobTradeId, clobOrderId, maker, price, amount } =
    event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Update unified order with trade info
  await context.db.update(unifiedOrders, { id: unifiedOrderId }).set({
    clobTradeId,
    status: 2, // TradeMatched
    matchedAt: event.block.timestamp,
  });

  // Insert event record
  await context.db.insert(tradeMatchedEvents).values({
    id: eventId,
    unifiedOrderId,
    clobTradeId,
    clobOrderId,
    maker,
    price,
    amount,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle LogisticsOrderCreated event from Diamond BridgeFacet
 */
ponder.on('Diamond:LogisticsOrderCreated', async ({ event, context }) => {
  const { unifiedOrderId, ausysOrderId, journeyIds, bounty, node } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Update unified order with logistics info
  await context.db.update(unifiedOrders, { id: unifiedOrderId }).set({
    ausysOrderId,
    journeyIds: JSON.stringify(journeyIds),
    bounty,
    sellerNode: node,
    status: 3, // LogisticsCreated
    logisticsStatus: 1, // Pending
  });

  // Insert event record
  await context.db.insert(logisticsOrderCreatedEvents).values({
    id: eventId,
    unifiedOrderId,
    ausysOrderId,
    journeyIds: JSON.stringify(journeyIds),
    bounty,
    node,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle JourneyStatusUpdated event from Diamond BridgeFacet
 */
ponder.on('Diamond:JourneyStatusUpdated', async ({ event, context }) => {
  const { unifiedOrderId, journeyId, phase } = event.args;

  // Update unified order logistics status
  await context.db.update(unifiedOrders, { id: unifiedOrderId }).set({
    logisticsStatus: phase,
  });

  // If delivered (phase 3), update deliveredAt
  if (phase === 3) {
    await context.db.update(unifiedOrders, { id: unifiedOrderId }).set({
      deliveredAt: event.block.timestamp,
    });
  }
});

/**
 * Handle OrderSettled event from Diamond BridgeFacet
 */
ponder.on('Diamond:OrderSettled', async ({ event, context }) => {
  const { unifiedOrderId, seller, sellerAmount, driver, driverAmount } =
    event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Update unified order status
  await context.db.update(unifiedOrders, { id: unifiedOrderId }).set({
    status: 4, // Settled
    settledAt: event.block.timestamp,
  });

  // Insert event record
  await context.db.insert(unifiedOrderSettledEvents).values({
    id: eventId,
    unifiedOrderId,
    seller,
    sellerAmount,
    driver,
    driverAmount,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle BountyPaid event from Diamond BridgeFacet
 */
ponder.on('Diamond:BountyPaid', async ({ event, context }) => {
  const { unifiedOrderId, amount } = event.args;

  console.log(
    `[Diamond] BountyPaid for order ${unifiedOrderId}, amount: ${amount}`,
  );
});

/**
 * Handle FeeRecipientUpdated event from Diamond BridgeFacet
 */
ponder.on('Diamond:FeeRecipientUpdated', async ({ event, context }) => {
  const { oldRecipient, newRecipient } = event.args;

  console.log(
    `[Diamond] FeeRecipientUpdated from ${oldRecipient} to ${newRecipient}`,
  );
});

// =============================================================================
// DIAMOND CLOB HANDLERS - CLOB events from Diamond CLOBFacet
// =============================================================================

/**
 * Handle OrderPlaced event from Diamond CLOBFacet (market-based, legacy)
 * Note: This is the original market-based event. New orders also emit OrderPlacedWithTokens.
 */
ponder.on('Diamond:OrderPlaced', async ({ event, context }) => {
  const { orderId, maker, marketId, price, amount, isBuy, orderType } =
    event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Get market info to determine tokens
  let baseToken = '0x0000000000000000000000000000000000000000' as `0x${string}`;
  let baseTokenId = 0n;
  let quoteToken =
    '0x0000000000000000000000000000000000000000' as `0x${string}`;

  try {
    const market = await context.client.readContract({
      abi: context.contracts.Diamond.abi,
      address: context.contracts.Diamond.address,
      functionName: 'getMarket',
      args: [marketId],
    });
    // Market returns strings for tokens, would need to resolve to addresses
  } catch (e) {
    console.warn(`Failed to get market data for ${marketId}:`, e);
  }

  // Insert CLOB Order entity (use onConflictDoNothing since OrderPlacedWithTokens may have already inserted)
  await context.db
    .insert(clobOrders)
    .values({
      id: orderId,
      maker,
      baseToken,
      baseTokenId,
      quoteToken,
      price,
      amount,
      filledAmount: 0n,
      remainingAmount: amount,
      isBuy,
      orderType,
      status: 0, // Open
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Insert OrderPlaced event (use onConflictDoNothing)
  await context.db
    .insert(orderPlacedEvents)
    .values({
      id: eventId,
      orderId,
      maker,
      baseToken,
      baseTokenId,
      quoteToken,
      price,
      amount,
      isBuy,
      orderType,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Update user trading stats
  await updateDiamondUserTradingStats(
    context,
    maker,
    event.block.timestamp,
    'orderPlaced',
  );
});

/**
 * Handle OrderPlacedWithTokens event from Diamond CLOBFacet
 * This is the PRIMARY event for node sell orders - contains actual token addresses
 */
ponder.on('Diamond:OrderPlacedWithTokens', async ({ event, context }) => {
  const {
    orderId,
    maker,
    baseToken,
    baseTokenId,
    quoteToken,
    price,
    amount,
    isBuy,
    orderType,
  } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}-tokens`;

  console.log('[Diamond:OrderPlacedWithTokens] Processing order:', {
    orderId,
    maker,
    baseToken,
    baseTokenId: baseTokenId.toString(),
    quoteToken,
    price: price.toString(),
    amount: amount.toString(),
    isBuy,
    orderType,
    txHash: event.transaction.hash,
  });

  // Insert CLOB Order entity with actual token addresses
  await context.db
    .insert(clobOrders)
    .values({
      id: orderId,
      maker,
      baseToken,
      baseTokenId,
      quoteToken,
      price,
      amount,
      filledAmount: 0n,
      remainingAmount: amount,
      isBuy,
      orderType,
      status: 0, // Open
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      // If order already exists (from OrderPlaced), update with token info
      baseToken,
      baseTokenId,
      quoteToken,
      updatedAt: event.block.timestamp,
    });

  // Insert OrderPlaced event with token info
  await context.db
    .insert(orderPlacedEvents)
    .values({
      id: eventId,
      orderId,
      maker,
      baseToken,
      baseTokenId,
      quoteToken,
      price,
      amount,
      isBuy,
      orderType,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Update user trading stats
  await updateDiamondUserTradingStats(
    context,
    maker,
    event.block.timestamp,
    'orderPlaced',
  );

  // Update market data for this token
  await updateMarketData(
    context,
    baseToken,
    baseTokenId,
    quoteToken,
    event.block.timestamp,
  );
});

/**
 * Handle OrderMatched event from Diamond CLOBFacet
 */
ponder.on('Diamond:OrderMatched', async ({ event, context }) => {
  const {
    takerOrderId,
    makerOrderId,
    tradeId,
    fillAmount,
    fillPrice,
    quoteAmount,
  } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Update maker order
  const makerOrder = await context.db.find(clobOrders, { id: makerOrderId });
  if (makerOrder) {
    const newFilledAmount = makerOrder.filledAmount + fillAmount;
    const newRemainingAmount = makerOrder.amount - newFilledAmount;
    const newStatus = newRemainingAmount === 0n ? 2 : 1; // Filled or PartialFill

    await context.db.update(clobOrders, { id: makerOrderId }).set({
      filledAmount: newFilledAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus,
      updatedAt: event.block.timestamp,
    });
  }

  // Insert OrderMatched event
  await context.db.insert(orderMatchedEvents).values({
    id: eventId,
    takerOrderId,
    makerOrderId,
    tradeId,
    fillAmount,
    fillPrice,
    quoteAmount,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle OrderCancelled event from Diamond CLOBFacet
 * Using full signature to disambiguate from other OrderCancelled events
 * CLOBFacet: OrderCancelled(bytes32 indexed orderId, address indexed maker, uint256 remainingAmount)
 */
ponder.on(
  'Diamond:OrderCancelled(bytes32 indexed orderId, address indexed maker, uint256 remainingAmount)',
  async ({ event, context }) => {
    const { orderId, maker, remainingAmount } = event.args;
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

    // Update CLOB Order entity
    await context.db.update(clobOrders, { id: orderId }).set({
      status: 3, // Cancelled
      remainingAmount: 0n,
      updatedAt: event.block.timestamp,
    });

    // Insert OrderCancelled event
    await context.db.insert(orderCancelledEvents).values({
      id: eventId,
      orderId,
      maker,
      remainingAmount,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    });

    // Update user trading stats
    await updateDiamondUserTradingStats(
      context,
      maker,
      event.block.timestamp,
      'orderCancelled',
    );
  },
);

/**
 * Handle OrderCancelled event from Diamond BridgeFacet
 * Using full signature to disambiguate from other OrderCancelled events
 * BridgeFacet: OrderCancelled(bytes32 indexed unifiedOrderId, uint8 previousStatus)
 */
ponder.on(
  'Diamond:OrderCancelled(bytes32 indexed unifiedOrderId, uint8 previousStatus)',
  async ({ event, context }) => {
    const { unifiedOrderId } = event.args;

    // Update unified order status
    await context.db.update(unifiedOrders, { id: unifiedOrderId }).set({
      status: 5, // Cancelled
    });
  },
);

/**
 * Handle TradeExecuted event from Diamond CLOBFacet
 */
ponder.on('Diamond:TradeExecuted', async ({ event, context }) => {
  const {
    tradeId,
    taker,
    maker,
    marketId,
    price,
    amount,
    quoteAmount,
    timestamp,
  } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Get market info
  let baseToken = '0x0000000000000000000000000000000000000000' as `0x${string}`;
  let baseTokenId = 0n;
  let quoteToken =
    '0x0000000000000000000000000000000000000000' as `0x${string}`;

  // Insert CLOB Trade entity
  await context.db.insert(clobTrades).values({
    id: tradeId,
    takerOrderId:
      '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
    makerOrderId:
      '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
    taker,
    maker,
    baseToken,
    baseTokenId,
    quoteToken,
    price,
    amount,
    quoteAmount,
    timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });

  // Insert TradeExecuted event
  await context.db.insert(tradeExecutedEvents).values({
    id: eventId,
    tradeId,
    taker,
    maker,
    baseToken,
    baseTokenId,
    price,
    amount,
    quoteAmount,
    timestamp,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update user trading stats for both parties
  await updateDiamondUserTradingStats(
    context,
    taker,
    event.block.timestamp,
    'tradeAsTaker',
    quoteAmount,
  );
  await updateDiamondUserTradingStats(
    context,
    maker,
    event.block.timestamp,
    'tradeAsMaker',
    quoteAmount,
  );
});

/**
 * Handle PoolCreated event from Diamond CLOBFacet
 */
ponder.on('Diamond:PoolCreated', async ({ event, context }) => {
  const { poolId, baseToken, baseTokenId, quoteToken } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert pool entity
  await context.db
    .insert(clobPools)
    .values({
      id: poolId,
      baseToken,
      baseTokenId,
      quoteToken,
      baseReserve: 0n,
      quoteReserve: 0n,
      totalLpTokens: 0n,
      isActive: true,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Insert PoolCreated event
  await context.db.insert(poolCreatedEvents).values({
    id: eventId,
    poolId,
    baseToken,
    baseTokenId,
    quoteToken,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle LiquidityAdded event from Diamond CLOBFacet
 */
ponder.on('Diamond:LiquidityAdded', async ({ event, context }) => {
  const { poolId, provider, baseAmount, quoteAmount, lpTokensMinted } =
    event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
  const positionId = `${poolId}-${provider.toLowerCase()}`;

  // Update pool reserves
  const pool = await context.db.find(clobPools, { id: poolId });
  if (pool) {
    await context.db.update(clobPools, { id: poolId }).set({
      baseReserve: pool.baseReserve + baseAmount,
      quoteReserve: pool.quoteReserve + quoteAmount,
      totalLpTokens: pool.totalLpTokens + lpTokensMinted,
      updatedAt: event.block.timestamp,
    });
  }

  // Update or create liquidity position
  const position = await context.db.find(clobLiquidityPositions, {
    id: positionId,
  });
  if (position) {
    await context.db.update(clobLiquidityPositions, { id: positionId }).set({
      lpTokens: position.lpTokens + lpTokensMinted,
      updatedAt: event.block.timestamp,
    });
  } else {
    await context.db
      .insert(clobLiquidityPositions)
      .values({
        id: positionId,
        poolId,
        provider,
        lpTokens: lpTokensMinted,
        depositedAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      })
      .onConflictDoNothing();
  }

  // Insert LiquidityAdded event
  await context.db.insert(liquidityAddedEvents).values({
    id: eventId,
    poolId,
    provider,
    baseAmount,
    quoteAmount,
    lpTokensMinted,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle LiquidityRemoved event from Diamond CLOBFacet
 */
ponder.on('Diamond:LiquidityRemoved', async ({ event, context }) => {
  const { poolId, provider, baseAmount, quoteAmount, lpTokensBurned } =
    event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
  const positionId = `${poolId}-${provider.toLowerCase()}`;

  // Update pool reserves
  const pool = await context.db.find(clobPools, { id: poolId });
  if (pool) {
    await context.db.update(clobPools, { id: poolId }).set({
      baseReserve: pool.baseReserve - baseAmount,
      quoteReserve: pool.quoteReserve - quoteAmount,
      totalLpTokens: pool.totalLpTokens - lpTokensBurned,
      updatedAt: event.block.timestamp,
    });
  }

  // Update liquidity position
  const position = await context.db.find(clobLiquidityPositions, {
    id: positionId,
  });
  if (position) {
    await context.db.update(clobLiquidityPositions, { id: positionId }).set({
      lpTokens: position.lpTokens - lpTokensBurned,
      updatedAt: event.block.timestamp,
    });
  }

  // Insert LiquidityRemoved event
  await context.db.insert(liquidityRemovedEvents).values({
    id: eventId,
    poolId,
    provider,
    baseAmount,
    quoteAmount,
    lpTokensBurned,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle FeesCollected event from Diamond CLOBFacet
 */
ponder.on('Diamond:FeesCollected', async ({ event, context }) => {
  const { tradeId, takerFeeAmount, makerFeeAmount, lpFeeAmount } = event.args;

  console.log(
    `[Diamond] FeesCollected for trade ${tradeId}: taker=${takerFeeAmount}, maker=${makerFeeAmount}, lp=${lpFeeAmount}`,
  );
});

// =============================================================================
// DIAMOND CLOB V2 HANDLERS - Production CLOB with MEV protection
// =============================================================================

/**
 * Handle OrderCreated event from Diamond CLOBFacetV2
 * V2 event with timeInForce and expiry support
 */
ponder.on(
  'Diamond:OrderCreated(bytes32 indexed orderId, bytes32 indexed marketId, address indexed maker, uint256 price, uint256 amount, bool isBuy, uint8 orderType, uint8 timeInForce, uint256 expiry, uint256 nonce)',
  async ({ event, context }) => {
    const {
      orderId,
      marketId,
      maker,
      price,
      amount,
      isBuy,
      orderType,
      timeInForce,
      expiry,
      nonce,
    } = event.args;
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

    console.log('[Diamond:OrderCreated V2] Processing order:', {
      orderId,
      marketId,
      maker,
      price: price.toString(),
      amount: amount.toString(),
      isBuy,
      orderType,
      timeInForce,
      expiry: expiry.toString(),
      nonce: nonce.toString(),
    });

    // Insert CLOB Order entity with V2 fields
    await context.db
      .insert(clobOrders)
      .values({
        id: orderId,
        maker,
        baseToken:
          '0x0000000000000000000000000000000000000000' as `0x${string}`, // Will be updated by OrderPlacedWithTokens
        baseTokenId: 0n,
        quoteToken:
          '0x0000000000000000000000000000000000000000' as `0x${string}`,
        price,
        amount,
        filledAmount: 0n,
        remainingAmount: amount,
        isBuy,
        orderType,
        status: 0, // Open
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoUpdate({
        // Update with V2 data if order already exists
        price,
        amount,
        isBuy,
        orderType,
        updatedAt: event.block.timestamp,
      });

    // Update user trading stats
    await updateDiamondUserTradingStats(
      context,
      maker,
      event.block.timestamp,
      'orderPlaced',
    );
  },
);

/**
 * Handle OrderFilled event from Diamond CLOBFacetV2
 * Tracks cumulative fills for partial order execution
 */
ponder.on('Diamond:OrderFilled', async ({ event, context }) => {
  const {
    orderId,
    tradeId,
    fillAmount,
    fillPrice,
    remainingAmount,
    cumulativeFilled,
  } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  console.log('[Diamond:OrderFilled] Processing fill:', {
    orderId,
    tradeId,
    fillAmount: fillAmount.toString(),
    fillPrice: fillPrice.toString(),
    remainingAmount: remainingAmount.toString(),
    cumulativeFilled: cumulativeFilled.toString(),
  });

  // Update order with new fill data
  const order = await context.db.find(clobOrders, { id: orderId });
  if (order) {
    const newStatus = remainingAmount === 0n ? 2 : 1; // Filled or PartialFill

    await context.db.update(clobOrders, { id: orderId }).set({
      filledAmount: cumulativeFilled,
      remainingAmount,
      status: newStatus,
      updatedAt: event.block.timestamp,
    });

    // Update user stats if order is fully filled
    if (newStatus === 2) {
      await updateDiamondUserTradingStats(
        context,
        order.maker,
        event.block.timestamp,
        'orderFilled',
      );
    }
  }
});

/**
 * Handle OrderExpired event from Diamond CLOBFacetV2
 * For GTD (Good Till Date) orders that have expired
 */
ponder.on('Diamond:OrderExpired', async ({ event, context }) => {
  const { orderId, expiredAt } = event.args;

  console.log('[Diamond:OrderExpired] Order expired:', {
    orderId,
    expiredAt: expiredAt.toString(),
  });

  // Update order status to expired (4)
  await context.db.update(clobOrders, { id: orderId }).set({
    status: 4, // Expired
    remainingAmount: 0n,
    updatedAt: event.block.timestamp,
  });
});

/**
 * Handle TradeExecutedV2 event from Diamond CLOBFacetV2
 * V2 event with fees and takerIsBuy tracking
 */
ponder.on('Diamond:TradeExecutedV2', async ({ event, context }) => {
  const {
    tradeId,
    takerOrderId,
    makerOrderId,
    taker,
    maker,
    marketId,
    price,
    amount,
    quoteAmount,
    takerFee,
    makerFee,
    timestamp,
    takerIsBuy,
  } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  console.log('[Diamond:TradeExecutedV2] Processing trade:', {
    tradeId,
    taker,
    maker,
    price: price.toString(),
    amount: amount.toString(),
    takerFee: takerFee.toString(),
    makerFee: makerFee.toString(),
    takerIsBuy,
  });

  // Insert CLOB Trade entity with V2 fields
  await context.db.insert(clobTrades).values({
    id: tradeId,
    takerOrderId,
    makerOrderId,
    taker,
    maker,
    baseToken: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Will be resolved from order
    baseTokenId: 0n,
    quoteToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    price,
    amount,
    quoteAmount,
    timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
  });

  // Insert TradeExecuted event
  await context.db.insert(tradeExecutedEvents).values({
    id: eventId,
    tradeId,
    taker,
    maker,
    baseToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    baseTokenId: 0n,
    price,
    amount,
    quoteAmount,
    timestamp,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update user trading stats for both parties with fees
  await updateDiamondUserTradingStats(
    context,
    taker,
    event.block.timestamp,
    'tradeAsTaker',
    quoteAmount,
  );
  await updateDiamondUserTradingStats(
    context,
    maker,
    event.block.timestamp,
    'tradeAsMaker',
    quoteAmount,
  );

  // Update fee totals
  const takerStats = await context.db.find(userTradingStats, { id: taker });
  if (takerStats) {
    await context.db.update(userTradingStats, { id: taker }).set({
      totalFeesPaid: takerStats.totalFeesPaid + takerFee,
    });
  }

  const makerStats = await context.db.find(userTradingStats, { id: maker });
  if (makerStats) {
    await context.db.update(userTradingStats, { id: maker }).set({
      totalFeesPaid: makerStats.totalFeesPaid + makerFee,
    });
  }
});

/**
 * Handle OrderCommitted event from Diamond CLOBFacetV2
 * MEV protection - tracks order commitments
 */
ponder.on('Diamond:OrderCommitted', async ({ event, context }) => {
  const { commitmentId, committer, commitBlock } = event.args;

  console.log('[Diamond:OrderCommitted] New commitment:', {
    commitmentId,
    committer,
    commitBlock: commitBlock.toString(),
  });

  // Log commitment for tracking (could add to a commitments table if needed)
  console.log(
    `[Diamond] OrderCommitted: ${commitmentId} by ${committer} at block ${commitBlock}`,
  );
});

/**
 * Handle OrderRevealed event from Diamond CLOBFacetV2
 * MEV protection - tracks order reveals
 */
ponder.on('Diamond:OrderRevealed', async ({ event, context }) => {
  const { commitmentId, orderId, maker } = event.args;

  console.log('[Diamond:OrderRevealed] Commitment revealed:', {
    commitmentId,
    orderId,
    maker,
  });

  console.log(
    `[Diamond] OrderRevealed: commitment ${commitmentId} -> order ${orderId} by ${maker}`,
  );
});

/**
 * Handle CircuitBreakerTripped event from Diamond CLOBFacetV2
 */
ponder.on('Diamond:CircuitBreakerTripped', async ({ event, context }) => {
  const {
    marketId,
    triggerPrice,
    previousPrice,
    changePercent,
    cooldownUntil,
  } = event.args;

  console.log('[Diamond:CircuitBreakerTripped] Circuit breaker activated:', {
    marketId,
    triggerPrice: triggerPrice.toString(),
    previousPrice: previousPrice.toString(),
    changePercent: changePercent.toString(),
    cooldownUntil: cooldownUntil.toString(),
  });
});

/**
 * Handle CircuitBreakerReset event from Diamond CLOBFacetV2
 */
ponder.on('Diamond:CircuitBreakerReset', async ({ event, context }) => {
  const { marketId, resetAt } = event.args;

  console.log('[Diamond:CircuitBreakerReset] Circuit breaker reset:', {
    marketId,
    resetAt: resetAt.toString(),
  });
});

/**
 * Handle MarketDepthChanged event from Diamond CLOBFacetV2
 * Updates market data with best bid/ask
 */
ponder.on('Diamond:MarketDepthChanged', async ({ event, context }) => {
  const { marketId, bestBid, bestBidSize, bestAsk, bestAskSize, spread } =
    event.args;

  console.log('[Diamond:MarketDepthChanged] Market depth updated:', {
    marketId,
    bestBid: bestBid.toString(),
    bestBidSize: bestBidSize.toString(),
    bestAsk: bestAsk.toString(),
    bestAskSize: bestAskSize.toString(),
    spread: spread.toString(),
  });

  // Update market data with best bid/ask
  const existing = await context.db.find(marketData, {
    id: marketId as string,
  });
  if (existing) {
    await context.db.update(marketData, { id: marketId as string }).set({
      bestBidPrice: bestBid,
      bestBidAmount: bestBidSize,
      bestAskPrice: bestAsk,
      bestAskAmount: bestAskSize,
      updatedAt: event.block.timestamp,
    });
  }
});

/**
 * Handle MarketCreated event from Diamond CLOBFacetV2
 */
ponder.on('Diamond:MarketCreated', async ({ event, context }) => {
  const { marketId, baseToken, baseTokenId, quoteToken } = event.args;

  console.log('[Diamond:MarketCreated] New market created:', {
    marketId,
    baseToken,
    baseTokenId: baseTokenId.toString(),
    quoteToken,
  });

  // Create market data entry
  const marketDataId = `${baseToken}-${baseTokenId.toString()}-${quoteToken}`;
  await context.db
    .insert(marketData)
    .values({
      id: marketDataId,
      baseToken,
      baseTokenId,
      quoteToken,
      bestBidPrice: 0n,
      bestBidAmount: 0n,
      bestAskPrice: 0n,
      bestAskAmount: 0n,
      lastTradePrice: 0n,
      volume24h: 0n,
      tradeCount24h: 0n,
      openOrderCount: 0n,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoNothing();
});

/**
 * Handle EmergencyWithdrawal event from Diamond CLOBFacetV2
 */
ponder.on('Diamond:EmergencyWithdrawal', async ({ event, context }) => {
  const { user, orderId, token, amount } = event.args;

  console.log('[Diamond:EmergencyWithdrawal] Emergency withdrawal:', {
    user,
    orderId,
    token,
    amount: amount.toString(),
  });
});

/**
 * Handle GlobalPause event from Diamond CLOBAdminFacet
 */
ponder.on('Diamond:GlobalPause', async ({ event, context }) => {
  const { paused } = event.args;

  console.log(`[Diamond:GlobalPause] System ${paused ? 'PAUSED' : 'UNPAUSED'}`);
});

/**
 * Handle MarketPaused event from Diamond CLOBAdminFacet
 */
ponder.on('Diamond:MarketPaused', async ({ event, context }) => {
  const { marketId } = event.args;

  console.log(`[Diamond:MarketPaused] Market ${marketId} paused`);
});

/**
 * Handle MarketUnpaused event from Diamond CLOBAdminFacet
 */
ponder.on('Diamond:MarketUnpaused', async ({ event, context }) => {
  const { marketId } = event.args;

  console.log(`[Diamond:MarketUnpaused] Market ${marketId} unpaused`);
});

/**
 * Handle FeesUpdated event from Diamond CLOBAdminFacet
 */
ponder.on('Diamond:FeesUpdated', async ({ event, context }) => {
  const { takerFeeBps, makerFeeBps, lpFeeBps } = event.args;

  console.log('[Diamond:FeesUpdated] Fee configuration updated:', {
    takerFeeBps,
    makerFeeBps,
    lpFeeBps,
  });
});

/**
 * Handle CircuitBreakerConfigured event from Diamond CLOBAdminFacet
 */
ponder.on('Diamond:CircuitBreakerConfigured', async ({ event, context }) => {
  const { marketId, priceChangeThreshold, cooldownPeriod, isEnabled } =
    event.args;

  console.log(
    '[Diamond:CircuitBreakerConfigured] Circuit breaker configured:',
    {
      marketId,
      priceChangeThreshold: priceChangeThreshold.toString(),
      cooldownPeriod: cooldownPeriod.toString(),
      isEnabled,
    },
  );
});

// =============================================================================
// DIAMOND STAKING HANDLERS - Staking events from Diamond StakingFacet
// =============================================================================

/**
 * Handle Staked event from Diamond StakingFacet
 */
ponder.on('Diamond:Staked', async ({ event, context }) => {
  const { user, amount } = event.args;

  console.log(`[Diamond] Staked by ${user}, amount: ${amount}`);
});

/**
 * Handle Withdrawn event from Diamond StakingFacet
 */
ponder.on('Diamond:Withdrawn', async ({ event, context }) => {
  const { user, amount } = event.args;

  console.log(`[Diamond] Withdrawn by ${user}, amount: ${amount}`);
});

/**
 * Handle RewardsClaimed event from Diamond StakingFacet
 */
ponder.on('Diamond:RewardsClaimed', async ({ event, context }) => {
  const { user, amount } = event.args;

  console.log(`[Diamond] RewardsClaimed by ${user}, amount: ${amount}`);
});

/**
 * Handle RewardRateUpdated event from Diamond StakingFacet
 */
ponder.on('Diamond:RewardRateUpdated', async ({ event, context }) => {
  const { oldRate, newRate } = event.args;

  console.log(`[Diamond] RewardRateUpdated from ${oldRate} to ${newRate}`);
});

// =============================================================================
// DIAMOND OWNERSHIP HANDLERS
// =============================================================================

/**
 * Handle OwnershipTransferred event from Diamond
 */
ponder.on('Diamond:OwnershipTransferred', async ({ event, context }) => {
  const { previousOwner, newOwner } = event.args;

  console.log(
    `[Diamond] OwnershipTransferred from ${previousOwner} to ${newOwner}`,
  );
});

/**
 * Handle DiamondCut event from Diamond
 */
ponder.on('Diamond:DiamondCut', async ({ event, context }) => {
  const { _diamondCut, _init, _calldata } = event.args;

  console.log(
    `[Diamond] DiamondCut executed with ${_diamondCut.length} facet changes`,
  );
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Update user trading statistics for Diamond CLOB
 */
async function updateDiamondUserTradingStats(
  context: any,
  user: `0x${string}`,
  timestamp: bigint,
  action: string,
  volume?: bigint,
) {
  const stats = await context.db.find(userTradingStats, { id: user });

  if (stats) {
    const update: any = {
      lastTradeAt: timestamp,
      updatedAt: timestamp,
    };

    switch (action) {
      case 'orderPlaced':
        update.totalOrdersPlaced = stats.totalOrdersPlaced + 1n;
        break;
      case 'orderFilled':
        update.totalOrdersFilled = stats.totalOrdersFilled + 1n;
        break;
      case 'orderCancelled':
        update.totalOrdersCancelled = stats.totalOrdersCancelled + 1n;
        break;
      case 'tradeAsMaker':
        update.totalTradesAsMaker = stats.totalTradesAsMaker + 1n;
        if (volume) update.totalVolumeQuote = stats.totalVolumeQuote + volume;
        break;
      case 'tradeAsTaker':
        update.totalTradesAsTaker = stats.totalTradesAsTaker + 1n;
        if (volume) update.totalVolumeQuote = stats.totalVolumeQuote + volume;
        break;
    }

    await context.db.update(userTradingStats, { id: user }).set(update);
  } else {
    await context.db
      .insert(userTradingStats)
      .values({
        id: user,
        user,
        totalOrdersPlaced: action === 'orderPlaced' ? 1n : 0n,
        totalOrdersFilled: action === 'orderFilled' ? 1n : 0n,
        totalOrdersCancelled: action === 'orderCancelled' ? 1n : 0n,
        totalTradesAsMaker: action === 'tradeAsMaker' ? 1n : 0n,
        totalTradesAsTaker: action === 'tradeAsTaker' ? 1n : 0n,
        totalVolumeQuote: volume ?? 0n,
        totalFeesPaid: 0n,
        firstTradeAt: timestamp,
        lastTradeAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoNothing();
  }
}

/**
 * Update market data aggregation for Diamond CLOB
 */
async function updateMarketData(
  context: any,
  baseToken: `0x${string}`,
  baseTokenId: bigint,
  quoteToken: `0x${string}`,
  timestamp: bigint,
) {
  const marketId = `${baseToken}-${baseTokenId.toString()}-${quoteToken}`;

  const existing = await context.db.find(marketData, { id: marketId });
  if (!existing) {
    await context.db
      .insert(marketData)
      .values({
        id: marketId,
        baseToken,
        baseTokenId,
        quoteToken,
        bestBidPrice: 0n,
        bestBidAmount: 0n,
        bestAskPrice: 0n,
        bestAskAmount: 0n,
        lastTradePrice: 0n,
        volume24h: 0n,
        tradeCount24h: 0n,
        openOrderCount: 1n,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoNothing();
  } else {
    // Handle case where existing record might not have openOrderCount (schema migration)
    const currentCount = existing.openOrderCount ?? 0n;
    await context.db.update(marketData, { id: marketId }).set({
      openOrderCount: BigInt(currentCount) + 1n,
      updatedAt: timestamp,
    });
  }
}
