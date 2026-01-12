/**
 * CLOB Handler
 *
 * Handles all CLOB-related events from CLOBFacetV2 and OrderMatchingFacet.
 * Stores only raw blockchain events - repositories handle aggregation at query time.
 *
 * Events with multiple versions require full signatures:
 * - TradeExecuted: V2 (13 params with fees) vs Matching (6 params)
 * - OrderCancelled: CLOB (4 params with reason) vs Bridge (2 params)
 */

import { ponder } from '@/generated';
import {
  orderPlacedEvents,
  orderMatchedEvents,
  orderCancelledEvents,
  tradeExecutedEvents,
  liquidityAddedEvents,
  liquidityRemovedEvents,
  poolCreatedEvents,
} from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// ============================================================================
// ORDER CREATION - Store only raw event
// ============================================================================

ponder.on('Diamond:OrderCreated', async ({ event, context }) => {
  const { orderId, marketId, maker, price, amount, isBuy, orderType } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[clob] OrderCreated: ${orderId}`);

  await context.db
    .insert(orderPlacedEvents)
    .values({
      id,
      orderId,
      maker,
      baseToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      baseTokenId: 0n,
      quoteToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
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
// ORDER FILLS - Store only raw event
// ============================================================================

ponder.on('Diamond:OrderFilled', async ({ event, context }) => {
  const { orderId, fillAmount, remainingAmount, cumulativeFilled } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[clob] OrderFilled: ${orderId}, remaining: ${remainingAmount}`);

  await context.db
    .insert(orderMatchedEvents)
    .values({
      id,
      takerOrderId: orderId,
      makerOrderId:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      tradeId:
        '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      fillAmount,
      fillPrice: 0n,
      quoteAmount: 0n,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
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

    await context.db
      .insert(tradeExecutedEvents)
      .values({
        id,
        tradeId,
        takerOrderId,
        makerOrderId,
        taker,
        maker,
        baseToken:
          '0x0000000000000000000000000000000000000000' as `0x${string}`,
        baseTokenId: 0n,
        price,
        amount,
        quoteAmount,
        timestamp,
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
    const id = eventId(event.transaction.hash, event.log.logIndex);

    console.log(`[clob] TradeExecuted Matching: ${tradeId}`);

    await context.db
      .insert(tradeExecutedEvents)
      .values({
        id,
        tradeId,
        takerOrderId,
        makerOrderId,
        taker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        maker: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        baseToken:
          '0x0000000000000000000000000000000000000000' as `0x${string}`,
        baseTokenId: 0n,
        price,
        amount,
        quoteAmount,
        timestamp: event.block.timestamp,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
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

    await context.db
      .insert(orderCancelledEvents)
      .values({
        id,
        orderId,
        maker,
        remainingAmount,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();
  },
);

// ============================================================================
// ORDER EXPIRY - Store only raw event (would need to add orderExpiredEvents table)
// ============================================================================

// Note: OrderExpired events would need an orderExpiredEvents table if tracking is needed

// ============================================================================
// MARKET MANAGEMENT - Store only raw event
// ============================================================================

ponder.on('Diamond:MarketCreated', async ({ event, context }) => {
  const { marketId, baseToken, baseTokenId, quoteToken } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[clob] MarketCreated: ${marketId}`);

  await context.db
    .insert(poolCreatedEvents)
    .values({
      id,
      poolId: marketId,
      baseToken,
      baseTokenId,
      quoteToken,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// ============================================================================
// LIQUIDITY EVENTS - Store only raw events
// ============================================================================

ponder.on('Diamond:LiquidityAdded', async ({ event, context }) => {
  const { poolId, provider, baseAmount, quoteAmount, lpTokensMinted } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(
    `[clob] LiquidityAdded: ${lpTokensMinted} LP tokens to pool ${poolId}`,
  );

  await context.db
    .insert(liquidityAddedEvents)
    .values({
      id,
      poolId,
      provider,
      baseAmount,
      quoteAmount,
      lpTokensMinted,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:LiquidityRemoved', async ({ event, context }) => {
  const { poolId, provider, baseAmount, quoteAmount, lpTokensBurned } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(
    `[clob] LiquidityRemoved: ${lpTokensBurned} LP tokens from pool ${poolId}`,
  );

  await context.db
    .insert(liquidityRemovedEvents)
    .values({
      id,
      poolId,
      provider,
      baseAmount,
      quoteAmount,
      lpTokensBurned,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});
