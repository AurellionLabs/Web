// Auto-generated handler for clob domain - Raw event storage only
// Generated at: 2026-02-17T21:53:30.135Z
//
// Pure Dumb Indexer: Store raw events only, NO aggregate tables
// All aggregation happens in frontend repository layer
// Events from: CLOBFacetV2, OrderMatchingFacet, OrderRouterFacet

import { ponder } from 'ponder:registry';

// Import event tables from generated schema
import {
  diamondCLOBOrderCancelledEvents,
  diamondCLOBOrderFilledEvents,
  diamondCLOBTradeExecutedEvents,
  diamondMarketCreatedEvents,
  diamondOrderCreatedEvents,
  diamondOrderExpiredEvents,
  diamondOrderPlacedWithTokensEvents,
  diamondAusysOrderFilledEvents,
  diamondMatchingOrderCancelledEvents,
  diamondTradeExecutedEvents,
  diamondOrderRoutedEvents,
  diamondRouterOrderCancelledEvents,
  diamondRouterOrderCreatedEvents,
  diamondRouterOrderPlacedEvents,
  diamondRouterTradeExecutedEvents,
} from 'ponder:schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// CLOBFacetV2 Events
// =============================================================================

/**
 * Handle CLOBOrderCancelled event from CLOBFacetV2
 * Signature: CLOBOrderCancelled(bytes32,address,uint256,uint8)
 * Hash: 0x8b4753f7
 */
ponder.on('Diamond:CLOBOrderCancelled', async ({ event, context }) => {
  const { orderId, maker, remainingAmount, reason } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondCLOBOrderCancelledEvents).values({
    id: id,
    order_id: orderId,
    maker: maker,
    remaining_amount: remainingAmount,
    reason: reason,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle CLOBOrderFilled event from CLOBFacetV2
 * Signature: CLOBOrderFilled(bytes32,bytes32,uint256,uint256,uint256,uint256)
 * Hash: 0x2d540948
 */
ponder.on('Diamond:CLOBOrderFilled', async ({ event, context }) => {
  const {
    orderId,
    tradeId,
    fillAmount,
    fillPrice,
    remainingAmount,
    cumulativeFilled,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondCLOBOrderFilledEvents).values({
    id: id,
    order_id: orderId,
    trade_id: tradeId,
    fill_amount: fillAmount,
    fill_price: fillPrice,
    remaining_amount: remainingAmount,
    cumulative_filled: cumulativeFilled,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle CLOBTradeExecuted event from CLOBFacetV2
 * Signature: CLOBTradeExecuted(bytes32,bytes32,bytes32,address,address,bytes32,uint256,uint256,uint256,uint256,uint256,uint256,bool)
 * Hash: 0x57e60214
 */
ponder.on('Diamond:CLOBTradeExecuted', async ({ event, context }) => {
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

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondCLOBTradeExecutedEvents).values({
    id: id,
    trade_id: tradeId,
    taker_order_id: takerOrderId,
    maker_order_id: makerOrderId,
    taker: taker,
    maker: maker,
    market_id: marketId,
    price: price,
    amount: amount,
    quote_amount: quoteAmount,
    taker_fee: takerFee,
    maker_fee: makerFee,
    timestamp: timestamp,
    taker_is_buy: takerIsBuy,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle MarketCreated event from CLOBFacetV2
 * Signature: MarketCreated(bytes32,address,uint256,address)
 * Hash: 0xb59e4751
 */
ponder.on('Diamond:MarketCreated', async ({ event, context }) => {
  const { marketId, baseToken, baseTokenId, quoteToken } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondMarketCreatedEvents).values({
    id: id,
    market_id: marketId,
    base_token: baseToken,
    base_token_id: baseTokenId,
    quote_token: quoteToken,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OrderCreated event from CLOBFacetV2
 * Signature: OrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)
 * Hash: 0x43fe20c0
 */
ponder.on('Diamond:OrderCreated', async ({ event, context }) => {
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
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOrderCreatedEvents).values({
    id: id,
    order_id: orderId,
    market_id: marketId,
    maker: maker,
    price: price,
    amount: amount,
    is_buy: isBuy,
    order_type: orderType,
    time_in_force: timeInForce,
    expiry: expiry,
    nonce: nonce,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OrderExpired event from CLOBFacetV2
 * Signature: OrderExpired(bytes32,uint256)
 * Hash: 0xb558d548
 */
ponder.on('Diamond:OrderExpired', async ({ event, context }) => {
  const { orderId, expiredAt } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOrderExpiredEvents).values({
    id: id,
    order_id: orderId,
    expired_at: expiredAt,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OrderPlacedWithTokens event from CLOBFacetV2
 * Signature: OrderPlacedWithTokens(bytes32,address,address,uint256,address,uint256,uint256,bool,uint8)
 * Hash: 0xe764a4f2
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
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOrderPlacedWithTokensEvents).values({
    id: id,
    order_id: orderId,
    maker: maker,
    base_token: baseToken,
    base_token_id: baseTokenId,
    quote_token: quoteToken,
    price: price,
    amount: amount,
    is_buy: isBuy,
    order_type: orderType,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

// =============================================================================
// OrderMatchingFacet Events
// =============================================================================

/**
 * Handle AusysOrderFilled event from OrderMatchingFacet
 * Signature: AusysOrderFilled(bytes32,bytes32,uint256,uint256,uint256,uint256)
 * Hash: 0x3e2e10ef
 */
ponder.on('Diamond:AusysOrderFilled', async ({ event, context }) => {
  const {
    orderId,
    tradeId,
    fillAmount,
    fillPrice,
    remainingAmount,
    cumulativeFilled,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondAusysOrderFilledEvents).values({
    id: id,
    order_id: orderId,
    trade_id: tradeId,
    fill_amount: fillAmount,
    fill_price: fillPrice,
    remaining_amount: remainingAmount,
    cumulative_filled: cumulativeFilled,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle MatchingOrderCancelled event from OrderMatchingFacet
 * Signature: MatchingOrderCancelled(bytes32,address,uint256,uint8)
 * Hash: 0x6f7d737d
 */
ponder.on('Diamond:MatchingOrderCancelled', async ({ event, context }) => {
  const { orderId, maker, remainingAmount, reason } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondMatchingOrderCancelledEvents).values({
    id: id,
    order_id: orderId,
    maker: maker,
    remaining_amount: remainingAmount,
    reason: reason,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TradeExecuted event from OrderMatchingFacet
 * Signature: TradeExecuted(bytes32,bytes32,bytes32,uint256,uint256,uint256)
 * Hash: 0x4692eb38
 */
ponder.on('Diamond:TradeExecuted', async ({ event, context }) => {
  const { tradeId, takerOrderId, makerOrderId, price, amount, quoteAmount } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondTradeExecutedEvents).values({
    id: id,
    trade_id: tradeId,
    taker_order_id: takerOrderId,
    maker_order_id: makerOrderId,
    price: price,
    amount: amount,
    quote_amount: quoteAmount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

// =============================================================================
// OrderRouterFacet Events
// =============================================================================

/**
 * Handle OrderRouted event from OrderRouterFacet
 * Signature: OrderRouted(bytes32,address,uint8,bool)
 * Hash: 0x138298a5
 */
ponder.on('Diamond:OrderRouted', async ({ event, context }) => {
  const { orderId, maker, orderSource, isBuy } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOrderRoutedEvents).values({
    id: id,
    order_id: orderId,
    maker: maker,
    order_source: orderSource,
    is_buy: isBuy,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle RouterOrderCancelled event from OrderRouterFacet
 * Signature: RouterOrderCancelled(bytes32,address,uint256,uint8)
 * Hash: 0x8f112c49
 */
ponder.on('Diamond:RouterOrderCancelled', async ({ event, context }) => {
  const { orderId, maker, remainingAmount, reason } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondRouterOrderCancelledEvents).values({
    id: id,
    order_id: orderId,
    maker: maker,
    remaining_amount: remainingAmount,
    reason: reason,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle RouterOrderCreated event from OrderRouterFacet
 * Signature: RouterOrderCreated(bytes32,bytes32,address,uint256,uint256,bool,uint8,uint8,uint256,uint256)
 * Hash: 0x7398300e
 */
ponder.on('Diamond:RouterOrderCreated', async ({ event, context }) => {
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
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondRouterOrderCreatedEvents).values({
    id: id,
    order_id: orderId,
    market_id: marketId,
    maker: maker,
    price: price,
    amount: amount,
    is_buy: isBuy,
    order_type: orderType,
    time_in_force: timeInForce,
    expiry: expiry,
    nonce: nonce,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle RouterOrderPlaced event from OrderRouterFacet
 * Signature: RouterOrderPlaced(bytes32,address,address,uint256,address,uint256,uint256,bool,uint8)
 * Hash: 0x0e2e2fa3
 */
ponder.on('Diamond:RouterOrderPlaced', async ({ event, context }) => {
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

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondRouterOrderPlacedEvents).values({
    id: id,
    order_id: orderId,
    maker: maker,
    base_token: baseToken,
    base_token_id: baseTokenId,
    quote_token: quoteToken,
    price: price,
    amount: amount,
    is_buy: isBuy,
    order_type: orderType,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle RouterTradeExecuted event from OrderRouterFacet
 * Signature: RouterTradeExecuted(bytes32,bytes32,bytes32,uint256,uint256,uint256)
 * Hash: 0x54931e7e
 */
ponder.on('Diamond:RouterTradeExecuted', async ({ event, context }) => {
  const { tradeId, takerOrderId, makerOrderId, price, amount, quoteAmount } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondRouterTradeExecutedEvents).values({
    id: id,
    trade_id: tradeId,
    taker_order_id: takerOrderId,
    maker_order_id: makerOrderId,
    price: price,
    amount: amount,
    quote_amount: quoteAmount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
