import { ponder } from '@/generated';
import {
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
// CLOB EVENT HANDLERS - Central Limit Order Book
// =============================================================================

/**
 * Handle OrderPlaced event
 */
ponder.on('CLOB:OrderPlaced', async ({ event, context }) => {
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
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert CLOB Order entity
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

  // Insert OrderPlaced event
  await context.db.insert(orderPlacedEvents).values({
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
  });

  // Update user trading stats
  await updateUserTradingStats(
    context,
    maker,
    event.block.timestamp,
    'orderPlaced',
  );

  // Update market data
  await updateMarketData(
    context,
    baseToken,
    baseTokenId,
    quoteToken,
    event.block.timestamp,
  );
});

/**
 * Handle OrderMatched event
 */
ponder.on('CLOB:OrderMatched', async ({ event, context }) => {
  const {
    takerOrderId,
    makerOrderId,
    tradeId,
    fillAmount,
    fillPrice,
    quoteAmount,
  } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

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
 * Handle OrderCancelled event
 */
ponder.on('CLOB:OrderCancelled', async ({ event, context }) => {
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
  await updateUserTradingStats(
    context,
    maker,
    event.block.timestamp,
    'orderCancelled',
  );
});

/**
 * Handle OrderUpdated event
 */
ponder.on('CLOB:OrderUpdated', async ({ event, context }) => {
  const { orderId, newStatus, filledAmount, remainingAmount } = event.args;

  // Update CLOB Order entity
  await context.db.update(clobOrders, { id: orderId }).set({
    status: newStatus,
    filledAmount,
    remainingAmount,
    updatedAt: event.block.timestamp,
  });

  // If order is fully filled, update user stats
  if (newStatus === 2) {
    // Filled
    const order = await context.db.find(clobOrders, { id: orderId });
    if (order) {
      await updateUserTradingStats(
        context,
        order.maker,
        event.block.timestamp,
        'orderFilled',
      );
    }
  }
});

/**
 * Handle TradeExecuted event
 */
ponder.on('CLOB:TradeExecuted', async ({ event, context }) => {
  const {
    tradeId,
    taker,
    maker,
    baseToken,
    baseTokenId,
    price,
    amount,
    quoteAmount,
    timestamp,
  } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Get quote token from the taker order if possible
  // For now, we'll need to determine it from the order
  let quoteToken =
    '0x0000000000000000000000000000000000000000' as `0x${string}`;

  // Insert CLOB Trade entity
  await context.db.insert(clobTrades).values({
    id: tradeId,
    takerOrderId:
      '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`, // Would need to track
    makerOrderId:
      '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`, // Would need to track
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
  await updateUserTradingStats(
    context,
    taker,
    event.block.timestamp,
    'tradeAsTaker',
    quoteAmount,
  );
  await updateUserTradingStats(
    context,
    maker,
    event.block.timestamp,
    'tradeAsMaker',
    quoteAmount,
  );

  // Update market data with last trade price
  await updateMarketDataWithTrade(
    context,
    baseToken,
    baseTokenId,
    quoteToken,
    price,
    quoteAmount,
    event.block.timestamp,
  );
});

/**
 * Handle LiquidityAdded event
 */
ponder.on('CLOB:LiquidityAdded', async ({ event, context }) => {
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
 * Handle LiquidityRemoved event
 */
ponder.on('CLOB:LiquidityRemoved', async ({ event, context }) => {
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
 * Handle PoolCreated event
 */
ponder.on('CLOB:PoolCreated', async ({ event, context }) => {
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

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Update user trading statistics
 */
async function updateUserTradingStats(
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
 * Update market data aggregation
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
        updatedAt: timestamp,
      })
      .onConflictDoNothing();
  } else {
    await context.db.update(marketData, { id: marketId }).set({
      updatedAt: timestamp,
    });
  }
}

/**
 * Update market data with trade info
 */
async function updateMarketDataWithTrade(
  context: any,
  baseToken: `0x${string}`,
  baseTokenId: bigint,
  quoteToken: `0x${string}`,
  price: bigint,
  quoteAmount: bigint,
  timestamp: bigint,
) {
  const marketId = `${baseToken}-${baseTokenId.toString()}-${quoteToken}`;

  const existing = await context.db.find(marketData, { id: marketId });
  if (existing) {
    await context.db.update(marketData, { id: marketId }).set({
      lastTradePrice: price,
      volume24h: existing.volume24h + quoteAmount,
      tradeCount24h: existing.tradeCount24h + 1n,
      updatedAt: timestamp,
    });
  } else {
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
        lastTradePrice: price,
        volume24h: quoteAmount,
        tradeCount24h: 1n,
        updatedAt: timestamp,
      })
      .onConflictDoNothing();
  }
}
