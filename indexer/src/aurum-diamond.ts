import { ponder } from '@/generated';
import {
  nodes,
  nodeAssets,
  nodeTokenBalances,
  nodeRegisteredEvents,
  nodeOwnershipTransferredEvents,
  nodeStatusUpdatedEvents,
  supportedAssetAddedEvents,
  tokensMintedToNodeEvents,
  tokensDepositedToNodeEvents,
  tokensWithdrawnFromNodeEvents,
  tokensTransferredBetweenNodesEvents,
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
import { DiamondNodeData, ZERO_ADDRESS, ZERO_BYTES32 } from './types';
import {
  safeSub,
  logger,
  eventId as makeEventId,
  nodeBalanceId,
  positionId as makePositionId,
} from './utils';

// Create logger for this module
const log = logger('Diamond');

// =============================================================================
// DIAMOND NODE HANDLERS - All node events come from the Diamond proxy
// =============================================================================

/**
 * Handle NodeRegistered event from Diamond
 */
ponder.on('Diamond:NodeRegistered', async ({ event, context }) => {
  const { nodeHash, owner, nodeType } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

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
    // Type the result properly - viem returns tuple as readonly array
    const typedNode = node as unknown as DiamondNodeData;
    locationData = {
      addressName: typedNode.addressName || '',
      lat: typedNode.lat || '0',
      lng: typedNode.lng || '0',
    };
    status = typedNode.active ? 'Active' : 'Inactive';
  } catch (e) {
    log.warn(`Failed to get node data for ${nodeHash}`, e);
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
  const { nodeHash } = event.args;

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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);
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
  log.info(`SupportedAssetsUpdated for node ${nodeHash}`, {
    count: count.toString(),
  });
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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Get current owner for event record
  const existingNode = await context.db.find(nodes, { id: node });
  const oldOwner = existingNode?.owner || ZERO_ADDRESS;

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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

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
  log.info(`NodeCapacityUpdated for node ${nodeHash}`, {
    quantitiesCount: quantities.length,
  });
});

/**
 * Handle ClobApprovalGranted event from Diamond
 */
ponder.on('Diamond:ClobApprovalGranted', async ({ event, context }) => {
  const { nodeHash, clobAddress } = event.args;
  log.info(`ClobApprovalGranted for node ${nodeHash}`, { clobAddress });
});

/**
 * Handle ClobApprovalRevoked event from Diamond
 */
ponder.on('Diamond:ClobApprovalRevoked', async ({ event, context }) => {
  const { nodeHash, clobAddress } = event.args;
  log.info(`ClobApprovalRevoked for node ${nodeHash}`, { clobAddress });
});

// =============================================================================
// DIAMOND TOKEN INVENTORY HANDLERS - Track actual tradable balances
// These events update nodeTokenBalances which is the authoritative source
// for what a node can actually sell (as opposed to nodeAssets.capacity which
// is just metadata/configuration).
// =============================================================================

/**
 * Handle TokensMintedToNode event from Diamond NodesFacet
 * This is emitted when creditNodeTokens() is called after minting tokens
 */
ponder.on('Diamond:TokensMintedToNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, minter } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);
  const balanceId = nodeBalanceId(nodeHash, tokenId);

  log.debug('TokensMintedToNode processing', {
    nodeHash,
    tokenId: tokenId.toString(),
    amount: amount.toString(),
    minter,
  });

  // Update or create node token balance
  const existingBalance = await context.db.find(nodeTokenBalances, {
    id: balanceId,
  });

  if (existingBalance) {
    await context.db.update(nodeTokenBalances, { id: balanceId }).set({
      balance: existingBalance.balance + amount,
      lastUpdatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  } else {
    await context.db.insert(nodeTokenBalances).values({
      id: balanceId,
      nodeHash: nodeHash,
      tokenId: tokenId,
      balance: amount,
      firstCreditedAt: event.block.timestamp,
      lastUpdatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  }

  // Insert event record
  await context.db.insert(tokensMintedToNodeEvents).values({
    id: eventId,
    nodeHash: nodeHash,
    tokenId: tokenId,
    amount: amount,
    minter: minter,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle TokensDepositedToNode event from Diamond NodesFacet
 * This is emitted when depositTokensToNode() is called
 */
ponder.on('Diamond:TokensDepositedToNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, depositor } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);
  const balanceId = nodeBalanceId(nodeHash, tokenId);

  log.debug('TokensDepositedToNode processing', {
    nodeHash,
    tokenId: tokenId.toString(),
    amount: amount.toString(),
    depositor,
  });

  // Update or create node token balance
  const existingBalance = await context.db.find(nodeTokenBalances, {
    id: balanceId,
  });

  if (existingBalance) {
    await context.db.update(nodeTokenBalances, { id: balanceId }).set({
      balance: existingBalance.balance + amount,
      lastUpdatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  } else {
    await context.db.insert(nodeTokenBalances).values({
      id: balanceId,
      nodeHash: nodeHash,
      tokenId: tokenId,
      balance: amount,
      firstCreditedAt: event.block.timestamp,
      lastUpdatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  }

  // Insert event record
  await context.db.insert(tokensDepositedToNodeEvents).values({
    id: eventId,
    nodeHash: nodeHash,
    tokenId: tokenId,
    amount: amount,
    depositor: depositor,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle TokensWithdrawnFromNode event from Diamond NodesFacet
 * This is emitted when withdrawTokensFromNode() is called
 */
ponder.on('Diamond:TokensWithdrawnFromNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, recipient } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);
  const balanceId = nodeBalanceId(nodeHash, tokenId);

  log.debug('TokensWithdrawnFromNode processing', {
    nodeHash,
    tokenId: tokenId.toString(),
    amount: amount.toString(),
    recipient,
  });

  // Update node token balance (decrease) with underflow protection
  const existingBalance = await context.db.find(nodeTokenBalances, {
    id: balanceId,
  });

  if (existingBalance) {
    const newBalance = safeSub(existingBalance.balance, amount);

    await context.db.update(nodeTokenBalances, { id: balanceId }).set({
      balance: newBalance,
      lastUpdatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  } else {
    // This shouldn't happen, but handle gracefully
    log.warn(`No existing balance for ${balanceId} during withdrawal`);
  }

  // Insert event record
  await context.db.insert(tokensWithdrawnFromNodeEvents).values({
    id: eventId,
    nodeHash: nodeHash,
    tokenId: tokenId,
    amount: amount,
    recipient: recipient,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle TokensTransferredBetweenNodes event from Diamond NodesFacet
 * This is emitted when transferTokensBetweenNodes() is called
 */
ponder.on(
  'Diamond:TokensTransferredBetweenNodes',
  async ({ event, context }) => {
    const { fromNode, toNode, tokenId, amount } = event.args;
    const eventId = makeEventId(event.transaction.hash, event.log.logIndex);
    const fromBalanceId = nodeBalanceId(fromNode, tokenId);
    const toBalanceId = nodeBalanceId(toNode, tokenId);

    log.debug('TokensTransferredBetweenNodes processing', {
      fromNode,
      toNode,
      tokenId: tokenId.toString(),
      amount: amount.toString(),
    });

    // Decrease from node balance with underflow protection
    const fromBalance = await context.db.find(nodeTokenBalances, {
      id: fromBalanceId,
    });
    if (fromBalance) {
      const newBalance = safeSub(fromBalance.balance, amount);

      await context.db.update(nodeTokenBalances, { id: fromBalanceId }).set({
        balance: newBalance,
        lastUpdatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });
    }

    // Increase to node balance
    const toBalance = await context.db.find(nodeTokenBalances, {
      id: toBalanceId,
    });
    if (toBalance) {
      await context.db.update(nodeTokenBalances, { id: toBalanceId }).set({
        balance: toBalance.balance + amount,
        lastUpdatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });
    } else {
      await context.db.insert(nodeTokenBalances).values({
        id: toBalanceId,
        nodeHash: toNode,
        tokenId: tokenId,
        balance: amount,
        firstCreditedAt: event.block.timestamp,
        lastUpdatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });
    }

    // Insert event record
    await context.db.insert(tokensTransferredBetweenNodesEvents).values({
      id: eventId,
      fromNode: fromNode,
      toNode: toNode,
      tokenId: tokenId,
      amount: amount,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    });
  },
);

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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

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
  log.info(`BountyPaid for order ${unifiedOrderId}`, {
    amount: amount.toString(),
  });
});

/**
 * Handle FeeRecipientUpdated event from Diamond BridgeFacet
 */
ponder.on('Diamond:FeeRecipientUpdated', async ({ event, context }) => {
  const { oldRecipient, newRecipient } = event.args;
  log.info(`FeeRecipientUpdated from ${oldRecipient} to ${newRecipient}`);
});

/**
 * Handle NodeSellOrderPlaced event from Diamond NodesFacet
 * This event is emitted when a node places a sell order via placeSellOrderFromNode()
 * We use this to update the CLOB order with the correct token addresses
 */
ponder.on(
  'Diamond:NodeSellOrderPlaced(bytes32 indexed nodeHash, uint256 indexed tokenId, address quoteToken, uint256 price, uint256 amount, bytes32 orderId)',
  async ({ event, context }) => {
    const { nodeHash, tokenId, quoteToken, price, amount, orderId } =
      event.args;

    log.debug('NodeSellOrderPlaced processing', {
      nodeHash,
      tokenId: tokenId.toString(),
      quoteToken,
      price: price.toString(),
      amount: amount.toString(),
      orderId,
    });

    // Get the AuraAsset address (baseToken) from chain-constants
    // This is the ERC1155 contract that holds the tokenized assets
    // Import: NEXT_PUBLIC_AURA_ASSET_ADDRESS from chain-constants
    const baseToken = '0x1235E39477752713902bCE541Fc02ADeb6FF465b'; // NEXT_PUBLIC_AURA_ASSET_ADDRESS

    // Update the CLOB order with the correct token addresses
    // The order was already created by OrderCreated event with zero addresses
    const existingOrder = await context.db.find(clobOrders, { id: orderId });

    if (existingOrder) {
      await context.db.update(clobOrders, { id: orderId }).set({
        baseToken: baseToken.toLowerCase() as `0x${string}`,
        baseTokenId: tokenId,
        quoteToken: quoteToken.toLowerCase() as `0x${string}`,
        updatedAt: event.block.timestamp,
      });

      log.info('Updated CLOB order with token info from NodeSellOrderPlaced', {
        orderId,
        baseToken,
        baseTokenId: tokenId.toString(),
        quoteToken,
      });
    } else {
      // Order doesn't exist yet - create it
      // This can happen if NodeSellOrderPlaced is processed before OrderCreated
      await context.db
        .insert(clobOrders)
        .values({
          id: orderId,
          maker: ZERO_ADDRESS, // Will be updated by OrderCreated
          baseToken: baseToken.toLowerCase() as `0x${string}`,
          baseTokenId: tokenId,
          quoteToken: quoteToken.toLowerCase() as `0x${string}`,
          price,
          amount,
          filledAmount: 0n,
          remainingAmount: amount,
          isBuy: false, // Node sell orders are always sells
          orderType: 0, // Limit
          status: 0, // Open
          createdAt: event.block.timestamp,
          updatedAt: event.block.timestamp,
          blockNumber: event.block.number,
          transactionHash: event.transaction.hash,
        })
        .onConflictDoUpdate({
          baseToken: baseToken.toLowerCase() as `0x${string}`,
          baseTokenId: tokenId,
          quoteToken: quoteToken.toLowerCase() as `0x${string}`,
          updatedAt: event.block.timestamp,
        });

      log.info('Created CLOB order from NodeSellOrderPlaced', {
        orderId,
        baseToken,
        baseTokenId: tokenId.toString(),
        quoteToken,
      });
    }
  },
);

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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Get market info to determine tokens
  let baseToken = ZERO_ADDRESS;
  let baseTokenId = 0n;
  let quoteToken = ZERO_ADDRESS;

  try {
    const market = await context.client.readContract({
      abi: context.contracts.Diamond.abi,
      address: context.contracts.Diamond.address,
      functionName: 'getMarket',
      args: [marketId],
    });
    // Market returns strings for tokens, would need to resolve to addresses
  } catch (e) {
    log.warn(`Failed to get market data for ${marketId}`, e);
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

  log.debug('OrderPlacedWithTokens processing', {
    orderId,
    maker,
    baseToken,
    baseTokenId: baseTokenId.toString(),
    quoteToken,
    price: price.toString(),
    amount: amount.toString(),
    isBuy,
    orderType,
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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Update maker order with underflow protection
  const makerOrder = await context.db.find(clobOrders, { id: makerOrderId });
  if (makerOrder) {
    const newFilledAmount = makerOrder.filledAmount + fillAmount;
    const newRemainingAmount = safeSub(makerOrder.amount, newFilledAmount);
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
    const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

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
 * Handle TradeExecuted event from OrderMatchingFacet
 * This is the simple version with order IDs (takerOrderId, makerOrderId)
 * Signature: TradeExecuted(bytes32 indexed tradeId, bytes32 indexed takerOrderId, bytes32 indexed makerOrderId, uint256 price, uint256 amount, uint256 quoteAmount)
 */
ponder.on(
  'Diamond:TradeExecuted(bytes32 indexed tradeId, bytes32 indexed takerOrderId, bytes32 indexed makerOrderId, uint256 price, uint256 amount, uint256 quoteAmount)',
  async ({ event, context }) => {
    const { tradeId, takerOrderId, makerOrderId, price, amount, quoteAmount } =
      event.args;
    const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

    log.info('TradeExecuted (OrderMatchingFacet) processing', {
      tradeId,
      takerOrderId,
      makerOrderId,
      price: price.toString(),
      amount: amount.toString(),
      quoteAmount: quoteAmount.toString(),
    });

    // Decode token info from transaction input (same as OrderCreated)
    const txInput = event.transaction.input;
    const decodedTokens = decodeTokensFromInput(txInput);

    const baseToken = decodedTokens?.baseToken ?? ZERO_ADDRESS;
    const baseTokenId = decodedTokens?.baseTokenId ?? 0n;
    const quoteToken = decodedTokens?.quoteToken ?? ZERO_ADDRESS;

    // NOTE: The event naming is confusing - in the contract:
    // - takerOrderId is the RESTING order (the maker order that was already on the book)
    // - makerOrderId is the INCOMING order (the taker order that initiated the trade)
    // This is backwards from typical terminology, so we swap them here for clarity
    const restingOrderId = takerOrderId; // The order that was on the book (maker)
    const incomingOrderId = makerOrderId; // The order that initiated the trade (taker)

    // Insert CLOB Trade entity
    await context.db
      .insert(clobTrades)
      .values({
        id: tradeId,
        takerOrderId: incomingOrderId, // The order that initiated the trade
        makerOrderId: restingOrderId, // The order that was on the book
        taker: event.transaction.from, // Taker is the transaction sender
        maker: ZERO_ADDRESS, // We don't have maker address in this event
        baseToken,
        baseTokenId,
        quoteToken,
        price,
        amount,
        quoteAmount,
        timestamp: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();

    // Update the incoming/taker order (market order that initiated the trade)
    // For IOC market orders, they are fully filled or cancelled
    const incomingOrder = await context.db.find(clobOrders, {
      id: incomingOrderId,
    });
    if (incomingOrder) {
      const newFilledAmount =
        BigInt(incomingOrder.filledAmount?.toString() ?? '0') + amount;
      const newRemainingAmount =
        BigInt(incomingOrder.amount?.toString() ?? '0') - newFilledAmount;
      const newStatus = newRemainingAmount <= 0n ? 2 : 1; // 2=Filled, 1=PartiallyFilled

      await context.db.update(clobOrders, { id: incomingOrderId }).set({
        filledAmount: newFilledAmount,
        remainingAmount: newRemainingAmount > 0n ? newRemainingAmount : 0n,
        status: newStatus,
        updatedAt: event.block.timestamp,
      });
    }

    // Update the resting/maker order (the order that was on the book)
    const restingOrder = await context.db.find(clobOrders, {
      id: restingOrderId,
    });
    if (restingOrder) {
      const newFilledAmount =
        BigInt(restingOrder.filledAmount?.toString() ?? '0') + amount;
      const newRemainingAmount =
        BigInt(restingOrder.amount?.toString() ?? '0') - newFilledAmount;
      const newStatus = newRemainingAmount <= 0n ? 2 : 1; // 2=Filled, 1=PartiallyFilled

      await context.db.update(clobOrders, { id: restingOrderId }).set({
        filledAmount: newFilledAmount,
        remainingAmount: newRemainingAmount > 0n ? newRemainingAmount : 0n,
        status: newStatus,
        updatedAt: event.block.timestamp,
      });

      log.info('Updated resting order', {
        orderId: restingOrderId,
        newFilledAmount: newFilledAmount.toString(),
        newRemainingAmount: newRemainingAmount.toString(),
        newStatus,
      });
    }

    // Insert TradeExecuted event
    await context.db.insert(tradeExecutedEvents).values({
      id: eventId,
      tradeId,
      taker: event.transaction.from,
      maker: ZERO_ADDRESS,
      baseToken,
      baseTokenId,
      price,
      amount,
      quoteAmount,
      timestamp: event.block.timestamp,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    });

    log.info('TradeExecuted processed successfully', {
      tradeId,
      takerOrderId,
      makerOrderId,
    });
  },
);

/**
 * Handle TradeExecuted event from Diamond CLOBFacet (legacy format)
 * This is the old version with taker/maker addresses
 */
ponder.on(
  'Diamond:TradeExecuted(bytes32 indexed tradeId, address indexed taker, address indexed maker, bytes32 marketId, uint256 price, uint256 amount, uint256 quoteAmount, uint256 timestamp)',
  async ({ event, context }) => {
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
    const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

    // Get market info
    const baseToken = ZERO_ADDRESS;
    const baseTokenId = 0n;
    const quoteToken = ZERO_ADDRESS;

    // Insert CLOB Trade entity
    await context.db
      .insert(clobTrades)
      .values({
        id: tradeId,
        takerOrderId: ZERO_BYTES32,
        makerOrderId: ZERO_BYTES32,
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
      })
      .onConflictDoNothing();

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
  },
);

/**
 * Handle PoolCreated event from Diamond CLOBFacet
 */
ponder.on('Diamond:PoolCreated', async ({ event, context }) => {
  const { poolId, baseToken, baseTokenId, quoteToken } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);
  const positionId = makePositionId(poolId, provider);

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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);
  const positionId = makePositionId(poolId, provider);

  // Update pool reserves with underflow protection
  const pool = await context.db.find(clobPools, { id: poolId });
  if (pool) {
    await context.db.update(clobPools, { id: poolId }).set({
      baseReserve: safeSub(pool.baseReserve, baseAmount),
      quoteReserve: safeSub(pool.quoteReserve, quoteAmount),
      totalLpTokens: safeSub(pool.totalLpTokens, lpTokensBurned),
      updatedAt: event.block.timestamp,
    });
  }

  // Update liquidity position with underflow protection
  const position = await context.db.find(clobLiquidityPositions, {
    id: positionId,
  });
  if (position) {
    await context.db.update(clobLiquidityPositions, { id: positionId }).set({
      lpTokens: safeSub(position.lpTokens, lpTokensBurned),
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
  log.info(`FeesCollected for trade ${tradeId}`, {
    takerFee: takerFeeAmount.toString(),
    makerFee: makerFeeAmount.toString(),
    lpFee: lpFeeAmount.toString(),
  });
});

// =============================================================================
// DIAMOND CLOB V2 HANDLERS - Production CLOB with MEV protection
// =============================================================================

/**
 * Decode token addresses from transaction input for CLOB order functions.
 * Supports: placeBuyOrder, placeSellOrder, placeOrder, placeLimitOrder
 * Function signatures:
 * - 0xe463f6e5: placeBuyOrder(address baseToken, uint256 baseTokenId, address quoteToken, uint96 price, uint96 amount)
 * - 0x5ba77869: placeLimitOrder(address baseToken, uint256 baseTokenId, address quoteToken, uint96 price, uint96 amount, bool isBuy)
 * - Other order functions follow similar patterns
 */
function decodeTokensFromInput(input: string): {
  baseToken: `0x${string}`;
  baseTokenId: bigint;
  quoteToken: `0x${string}`;
} | null {
  // Minimum length: 4 bytes selector + 3 params * 32 bytes = 100 bytes = 200 hex chars + 2 for 0x
  if (!input || input.length < 202) {
    return null;
  }

  try {
    // Skip the function selector (first 4 bytes = 8 hex chars after 0x)
    const data = input.slice(10);

    // Standard ABI encoding for address,uint256,address:
    // Param 1 (address baseToken): bytes 0-31, address is right-padded in last 20 bytes
    // Param 2 (uint256 baseTokenId): bytes 32-63
    // Param 3 (address quoteToken): bytes 64-95, address is right-padded in last 20 bytes

    // Extract baseToken (last 20 bytes of first 32-byte word)
    const baseTokenHex = data.slice(24, 64); // chars 24-64 = bytes 12-32 of first word
    const baseToken = `0x${baseTokenHex}`.toLowerCase() as `0x${string}`;

    // Extract baseTokenId (full 32-byte word)
    const baseTokenIdHex = data.slice(64, 128); // chars 64-128 = second 32-byte word
    const baseTokenId = BigInt(`0x${baseTokenIdHex}`);

    // Extract quoteToken (last 20 bytes of third 32-byte word)
    const quoteTokenHex = data.slice(152, 192); // chars 152-192 = bytes 12-32 of third word
    const quoteToken = `0x${quoteTokenHex}`.toLowerCase() as `0x${string}`;

    // Validate addresses are non-zero
    if (
      baseToken === ZERO_ADDRESS ||
      quoteToken === ZERO_ADDRESS ||
      !baseToken.startsWith('0x') ||
      !quoteToken.startsWith('0x')
    ) {
      return null;
    }

    return { baseToken, baseTokenId, quoteToken };
  } catch (e) {
    log.warn('Failed to decode tokens from input', {
      input: input.slice(0, 50),
      error: e,
    });
    return null;
  }
}

/**
 * Handle OrderCreated event from Diamond CLOBFacetV2
 * V2 event with timeInForce and expiry support
 *
 * Since the deployed OrderRouterFacet doesn't emit OrderPlacedWithTokens,
 * we decode token addresses directly from the transaction input.
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
    const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

    // Decode token addresses from transaction input
    const txInput = event.transaction.input;
    const decodedTokens = decodeTokensFromInput(txInput);

    let baseToken = ZERO_ADDRESS;
    let baseTokenId = 0n;
    let quoteToken = ZERO_ADDRESS;

    if (decodedTokens) {
      baseToken = decodedTokens.baseToken;
      baseTokenId = decodedTokens.baseTokenId;
      quoteToken = decodedTokens.quoteToken;
      log.debug('Decoded tokens from transaction input', {
        orderId,
        baseToken,
        baseTokenId: baseTokenId.toString(),
        quoteToken,
      });
    } else {
      log.warn('Could not decode tokens from transaction input', {
        orderId,
        txInput: txInput.slice(0, 50),
      });
    }

    log.debug('OrderCreated V2 processing', {
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
      baseToken,
      baseTokenId: baseTokenId.toString(),
      quoteToken,
    });

    // Insert CLOB Order entity with V2 fields and decoded tokens
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
        // Update with V2 data if order already exists (e.g., from NodeSellOrderPlaced)
        price,
        amount,
        isBuy,
        orderType,
        updatedAt: event.block.timestamp,
        // Only update tokens if we have valid data
        ...(decodedTokens
          ? {
              baseToken,
              baseTokenId,
              quoteToken,
            }
          : {}),
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

  log.debug('OrderFilled processing', {
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

  log.debug('OrderExpired processing', {
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
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  log.debug('TradeExecutedV2 processing', {
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
    baseToken: ZERO_ADDRESS, // Will be resolved from order
    baseTokenId: 0n,
    quoteToken: ZERO_ADDRESS,
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
    baseToken: ZERO_ADDRESS,
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
  log.info(`OrderCommitted: ${commitmentId} by ${committer}`, {
    commitBlock: commitBlock.toString(),
  });
});

/**
 * Handle OrderRevealed event from Diamond CLOBFacetV2
 * MEV protection - tracks order reveals
 */
ponder.on('Diamond:OrderRevealed', async ({ event, context }) => {
  const { commitmentId, orderId, maker } = event.args;
  log.info(`OrderRevealed: commitment ${commitmentId} -> order ${orderId}`, {
    maker,
  });
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

  log.warn('CircuitBreakerTripped', {
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
  log.info('CircuitBreakerReset', { marketId, resetAt: resetAt.toString() });
});

/**
 * Handle MarketDepthChanged event from Diamond CLOBFacetV2
 * Updates market data with best bid/ask
 */
ponder.on('Diamond:MarketDepthChanged', async ({ event, context }) => {
  const { marketId, bestBid, bestBidSize, bestAsk, bestAskSize, spread } =
    event.args;

  log.debug('MarketDepthChanged', {
    marketId,
    bestBid: bestBid.toString(),
    bestBidSize: bestBidSize.toString(),
    bestAsk: bestAsk.toString(),
    bestAskSize: bestAskSize.toString(),
    spread: spread.toString(),
  });

  // Update market data with best bid/ask - marketId is bytes32
  const marketIdStr = marketId as string;
  const existing = await context.db.find(marketData, { id: marketIdStr });
  if (existing) {
    await context.db.update(marketData, { id: marketIdStr }).set({
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

  log.info('MarketCreated', {
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
  log.warn('EmergencyWithdrawal', {
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
  log.warn(`System ${paused ? 'PAUSED' : 'UNPAUSED'}`);
});

/**
 * Handle MarketPaused event from Diamond CLOBAdminFacet
 */
ponder.on('Diamond:MarketPaused', async ({ event, context }) => {
  const { marketId } = event.args;
  log.info(`Market ${marketId} paused`);
});

/**
 * Handle MarketUnpaused event from Diamond CLOBAdminFacet
 */
ponder.on('Diamond:MarketUnpaused', async ({ event, context }) => {
  const { marketId } = event.args;
  log.info(`Market ${marketId} unpaused`);
});

/**
 * Handle FeesUpdated event from Diamond CLOBAdminFacet
 */
ponder.on('Diamond:FeesUpdated', async ({ event, context }) => {
  const { takerFeeBps, makerFeeBps, lpFeeBps } = event.args;
  log.info('FeesUpdated', { takerFeeBps, makerFeeBps, lpFeeBps });
});

/**
 * Handle CircuitBreakerConfigured event from Diamond CLOBAdminFacet
 */
ponder.on('Diamond:CircuitBreakerConfigured', async ({ event, context }) => {
  const { marketId, priceChangeThreshold, cooldownPeriod, isEnabled } =
    event.args;
  log.info('CircuitBreakerConfigured', {
    marketId,
    priceChangeThreshold: priceChangeThreshold.toString(),
    cooldownPeriod: cooldownPeriod.toString(),
    isEnabled,
  });
});

// =============================================================================
// DIAMOND STAKING HANDLERS - Staking events from Diamond StakingFacet
// =============================================================================

/**
 * Handle Staked event from Diamond StakingFacet
 */
ponder.on('Diamond:Staked', async ({ event, context }) => {
  const { user, amount } = event.args;
  log.info(`Staked by ${user}`, { amount: amount.toString() });
});

/**
 * Handle Withdrawn event from Diamond StakingFacet
 */
ponder.on('Diamond:Withdrawn', async ({ event, context }) => {
  const { user, amount } = event.args;
  log.info(`Withdrawn by ${user}`, { amount: amount.toString() });
});

/**
 * Handle RewardsClaimed event from Diamond StakingFacet
 */
ponder.on('Diamond:RewardsClaimed', async ({ event, context }) => {
  const { user, amount } = event.args;
  log.info(`RewardsClaimed by ${user}`, { amount: amount.toString() });
});

/**
 * Handle RewardRateUpdated event from Diamond StakingFacet
 */
ponder.on('Diamond:RewardRateUpdated', async ({ event, context }) => {
  const { oldRate, newRate } = event.args;
  log.info(`RewardRateUpdated from ${oldRate} to ${newRate}`);
});

// =============================================================================
// DIAMOND OWNERSHIP HANDLERS
// =============================================================================

/**
 * Handle OwnershipTransferred event from Diamond
 */
ponder.on('Diamond:OwnershipTransferred', async ({ event, context }) => {
  const { previousOwner, newOwner } = event.args;
  log.info(`OwnershipTransferred from ${previousOwner} to ${newOwner}`);
});

/**
 * Handle DiamondCut event from Diamond
 */
ponder.on('Diamond:DiamondCut', async ({ event, context }) => {
  const { _diamondCut, _init, _calldata } = event.args;
  log.info(`DiamondCut executed with ${_diamondCut.length} facet changes`);
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Type for Ponder context
type PonderContext = {
  db: {
    find: <T>(table: unknown, query: { id: string }) => Promise<T | null>;
    insert: (table: unknown) => {
      values: (data: unknown) => {
        onConflictDoNothing: () => Promise<void>;
        onConflictDoUpdate: (data: unknown) => Promise<void>;
      };
    };
    update: (
      table: unknown,
      query: { id: string },
    ) => {
      set: (data: unknown) => Promise<void>;
    };
  };
};

// Type for user trading stats record
type UserTradingStatsRecord = {
  id: string;
  user: `0x${string}`;
  totalOrdersPlaced: bigint;
  totalOrdersFilled: bigint;
  totalOrdersCancelled: bigint;
  totalTradesAsMaker: bigint;
  totalTradesAsTaker: bigint;
  totalVolumeQuote: bigint;
  totalFeesPaid: bigint;
  firstTradeAt: bigint;
  lastTradeAt: bigint;
  updatedAt: bigint;
};

// Type for market data record
type MarketDataRecord = {
  id: string;
  baseToken: `0x${string}`;
  baseTokenId: bigint;
  quoteToken: `0x${string}`;
  bestBidPrice: bigint;
  bestBidAmount: bigint;
  bestAskPrice: bigint;
  bestAskAmount: bigint;
  lastTradePrice: bigint;
  volume24h: bigint;
  tradeCount24h: bigint;
  openOrderCount: bigint;
  createdAt: bigint;
  updatedAt: bigint;
};

/**
 * Update user trading statistics for Diamond CLOB
 */
async function updateDiamondUserTradingStats(
  context: PonderContext,
  user: `0x${string}`,
  timestamp: bigint,
  action: string,
  volume?: bigint,
): Promise<void> {
  const stats = await context.db.find<UserTradingStatsRecord>(
    userTradingStats,
    { id: user },
  );

  if (stats) {
    const update: Partial<UserTradingStatsRecord> = {
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
  context: PonderContext,
  baseToken: `0x${string}`,
  baseTokenId: bigint,
  quoteToken: `0x${string}`,
  timestamp: bigint,
): Promise<void> {
  const marketId = `${baseToken}-${baseTokenId.toString()}-${quoteToken}`;

  const existing = await context.db.find<MarketDataRecord>(marketData, {
    id: marketId,
  });
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
      openOrderCount: currentCount + 1n,
      updatedAt: timestamp,
    });
  }
}
