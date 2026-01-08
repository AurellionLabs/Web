/**
 * CLOB Handler
 *
 * Handles all CLOB-related events from CLOBFacetV2 and OrderMatchingFacet.
 *
 * Events with multiple versions require full signatures:
 * - TradeExecuted: V2 (13 params with fees) vs Matching (6 params)
 * - OrderCancelled: CLOB (4 params with reason) vs Bridge (2 params)
 */

import { ponder } from '@/generated';
import {
  clobOrders,
  clobTrades,
  orderPlacedEvents,
  orderCancelledEvents,
  tradeExecutedEvents,
  marketData,
  userTradingStats,
} from '../../ponder.schema';

// ============================================================================
// CONSTANTS
// ============================================================================

const OrderStatus = {
  Open: 0,
  PartialFill: 1,
  Filled: 2,
  Cancelled: 3,
  Expired: 4,
} as const;

const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as `0x${string}`;

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// ============================================================================
// ORDER CREATION - Simple event name (only one version)
// ============================================================================

ponder.on('Diamond:OrderCreated', async ({ event, context }) => {
  const { orderId, marketId, maker, price, amount, isBuy, orderType } =
    event.args;

  console.log(`[clob] OrderCreated: ${orderId}`);

  await context.db
    .insert(clobOrders)
    .values({
      id: orderId,
      maker,
      marketId,
      baseToken: ZERO_ADDRESS,
      baseTokenId: 0n,
      quoteToken: ZERO_ADDRESS,
      price,
      amount,
      filledAmount: 0n,
      remainingAmount: amount,
      isBuy,
      orderType,
      status: OrderStatus.Open,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      price,
      amount,
      isBuy,
      orderType,
      updatedAt: event.block.timestamp,
    });
});

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
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[clob] OrderPlacedWithTokens: ${orderId}`);

  const marketId = `${baseToken.toLowerCase()}-${baseTokenId}-${quoteToken.toLowerCase()}`;

  await context.db
    .insert(clobOrders)
    .values({
      id: orderId,
      maker,
      marketId: marketId as `0x${string}`,
      baseToken,
      baseTokenId,
      quoteToken,
      price,
      amount,
      filledAmount: 0n,
      remainingAmount: amount,
      isBuy,
      orderType,
      status: OrderStatus.Open,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      baseToken,
      baseTokenId,
      quoteToken,
      price,
      amount,
      updatedAt: event.block.timestamp,
    });

  await context.db
    .insert(orderPlacedEvents)
    .values({
      id,
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
});

// ============================================================================
// ORDER FILLS - Simple event name
// ============================================================================

ponder.on('Diamond:OrderFilled', async ({ event, context }) => {
  const { orderId, fillAmount, remainingAmount, cumulativeFilled } = event.args;

  console.log(`[clob] OrderFilled: ${orderId}, remaining: ${remainingAmount}`);

  const newStatus =
    remainingAmount === 0n ? OrderStatus.Filled : OrderStatus.PartialFill;

  await context.db.update(clobOrders, { id: orderId }).set({
    filledAmount: cumulativeFilled,
    remainingAmount,
    status: newStatus,
    updatedAt: event.block.timestamp,
  });
});

// ============================================================================
// TRADE EXECUTION - Full signatures needed (2 versions)
// ============================================================================

// V2: Full trade with fees (13 params)
ponder.on(
  'Diamond:TradeExecuted(bytes32 indexed tradeId, bytes32 indexed takerOrderId, bytes32 indexed makerOrderId, address taker, address maker, bytes32 marketId, uint256 price, uint256 amount, uint256 quoteAmount, uint256 takerFee, uint256 makerFee, uint256 timestamp, bool takerIsBuy)',
  async ({ event, context }) => {
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
    const id = eventId(event.transaction.hash, event.log.logIndex);

    console.log(`[clob] TradeExecuted V2: ${tradeId}`);

    const takerOrder = await context.db.find(clobOrders, { id: takerOrderId });

    await context.db
      .insert(clobTrades)
      .values({
        id: tradeId,
        takerOrderId,
        makerOrderId,
        taker,
        maker,
        marketId,
        baseToken: takerOrder?.baseToken ?? ZERO_ADDRESS,
        baseTokenId: takerOrder?.baseTokenId ?? 0n,
        quoteToken: takerOrder?.quoteToken ?? ZERO_ADDRESS,
        price,
        amount,
        quoteAmount,
        takerFee,
        makerFee,
        takerIsBuy,
        timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();

    await context.db
      .insert(tradeExecutedEvents)
      .values({
        id,
        tradeId,
        taker,
        maker,
        price,
        amount,
        quoteAmount,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();
  },
);

// Matching: Simple trade without fees (6 params)
ponder.on(
  'Diamond:TradeExecuted(bytes32 indexed tradeId, bytes32 indexed takerOrderId, bytes32 indexed makerOrderId, uint256 price, uint256 amount, uint256 quoteAmount)',
  async ({ event, context }) => {
    const { tradeId, takerOrderId, makerOrderId, price, amount, quoteAmount } =
      event.args;

    console.log(`[clob] TradeExecuted Matching: ${tradeId}`);

    const takerOrder = await context.db.find(clobOrders, { id: takerOrderId });
    const makerOrder = await context.db.find(clobOrders, { id: makerOrderId });

    await context.db
      .insert(clobTrades)
      .values({
        id: tradeId,
        takerOrderId,
        makerOrderId,
        taker: takerOrder?.maker ?? ZERO_ADDRESS,
        maker: makerOrder?.maker ?? ZERO_ADDRESS,
        marketId: takerOrder?.marketId ?? (ZERO_ADDRESS as `0x${string}`),
        baseToken: takerOrder?.baseToken ?? ZERO_ADDRESS,
        baseTokenId: takerOrder?.baseTokenId ?? 0n,
        quoteToken: takerOrder?.quoteToken ?? ZERO_ADDRESS,
        price,
        amount,
        quoteAmount,
        takerFee: 0n,
        makerFee: 0n,
        takerIsBuy: takerOrder?.isBuy ?? true,
        timestamp: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();
  },
);

// ============================================================================
// ORDER CANCELLATION - Full signature needed (2 versions)
// ============================================================================

// CLOB: With reason code (4 params)
ponder.on(
  'Diamond:OrderCancelled(bytes32 indexed orderId, address indexed maker, uint256 remainingAmount, uint8 reason)',
  async ({ event, context }) => {
    const { orderId, maker, remainingAmount, reason } = event.args;
    const id = eventId(event.transaction.hash, event.log.logIndex);

    console.log(`[clob] OrderCancelled: ${orderId}, reason: ${reason}`);

    await context.db.update(clobOrders, { id: orderId }).set({
      status: OrderStatus.Cancelled,
      remainingAmount: 0n,
      updatedAt: event.block.timestamp,
    });

    await context.db
      .insert(orderCancelledEvents)
      .values({
        id,
        orderId,
        maker,
        remainingAmount,
        reason,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();
  },
);

// ============================================================================
// ORDER EXPIRY
// ============================================================================

ponder.on('Diamond:OrderExpired', async ({ event, context }) => {
  const { orderId } = event.args;

  console.log(`[clob] OrderExpired: ${orderId}`);

  await context.db.update(clobOrders, { id: orderId }).set({
    status: OrderStatus.Expired,
    remainingAmount: 0n,
    updatedAt: event.block.timestamp,
  });
});

// ============================================================================
// MARKET MANAGEMENT
// ============================================================================

ponder.on('Diamond:MarketCreated', async ({ event, context }) => {
  const { marketId, baseToken, baseTokenId, quoteToken } = event.args;

  console.log(`[clob] MarketCreated: ${marketId}`);

  await context.db
    .insert(marketData)
    .values({
      id: marketId,
      baseToken,
      baseTokenId,
      quoteToken,
      lastPrice: 0n,
      volume24h: 0n,
      high24h: 0n,
      low24h: 0n,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoNothing();
});
