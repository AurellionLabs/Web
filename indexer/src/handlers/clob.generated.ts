// Auto-generated handler for clob domain
// Generated at: 2026-03-06T16:33:32.571Z
//
// Inline aggregate writes: raw event insert + aggregate table upsert in ONE ponder.on() handler.
// This avoids the Ponder 0.16 restriction: only one ponder.on() per event name is allowed.
// Events from: CLOBFacetV2, OrderRouterFacet

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
  diamondRouterOrderPlacedEvents,
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

  // Raw event insert
  await context.db.insert(diamondCLOBOrderCancelledEvents).values({
    id: id,
    order_id: orderId,
    maker: maker,
    remaining_amount: remainingAmount,
    reason: BigInt(reason),
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

  // Raw event insert
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

  // Raw event insert
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

  // Raw event insert
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

  // Raw event insert
  await context.db.insert(diamondOrderCreatedEvents).values({
    id: id,
    order_id: orderId,
    market_id: marketId,
    maker: maker,
    price: price,
    amount: amount,
    is_buy: isBuy,
    order_type: BigInt(orderType),
    time_in_force: BigInt(timeInForce),
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

  // Raw event insert
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

  // Raw event insert
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
    order_type: BigInt(orderType),
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

// =============================================================================
// OrderRouterFacet Events
// =============================================================================

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

  // Raw event insert
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
    order_type: BigInt(orderType),
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
