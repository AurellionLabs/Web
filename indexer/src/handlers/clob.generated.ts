// Auto-generated handler for clob domain - Raw event storage only
// Generated at: 2026-01-17T00:31:46.783Z
//
// Dumb indexer pattern: Store raw events, aggregate in repository layer
// Events from: CLOBFacetV2, OrderMatchingFacet, OrderRouterFacet

import { ponder } from '@/generated';

// Import event tables (auto-generated from ABI)
import { cLOBOrderCancelled_8b47Events } from '../../generated-schema';
import { cLOBOrderFilled_2d54Events } from '../../generated-schema';
import { cLOBTradeExecuted_57e6Events } from '../../generated-schema';
import { marketCreatedB59eEvents } from '../../generated-schema';
import { orderCreated_43feEvents } from '../../generated-schema';
import { orderExpiredB558Events } from '../../generated-schema';
import { orderPlacedWithTokensE764Events } from '../../generated-schema';
import { ausysOrderFilled_3e2eEvents } from '../../generated-schema';
import { matchingOrderCancelled_6f7dEvents } from '../../generated-schema';
import { tradeExecuted_4692Events } from '../../generated-schema';
import { orderRouted_1382Events } from '../../generated-schema';
import { routerOrderCancelled_8f11Events } from '../../generated-schema';
import { routerOrderCreated_7398Events } from '../../generated-schema';
import { routerOrderPlaced_0e2eEvents } from '../../generated-schema';
import { routerTradeExecuted_5493Events } from '../../generated-schema';

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

  // Insert raw event into event table
  await context.db.insert(cLOBOrderCancelled_8b47Events).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(cLOBOrderFilled_2d54Events).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(cLOBTradeExecuted_57e6Events).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(marketCreatedB59eEvents).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(orderCreated_43feEvents).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(orderExpiredB558Events).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(orderPlacedWithTokensE764Events).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(ausysOrderFilled_3e2eEvents).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(matchingOrderCancelled_6f7dEvents).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(tradeExecuted_4692Events).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(orderRouted_1382Events).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(routerOrderCancelled_8f11Events).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(routerOrderCreated_7398Events).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(routerOrderPlaced_0e2eEvents).values({
    id,
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

  // Insert raw event into event table
  await context.db.insert(routerTradeExecuted_5493Events).values({
    id,
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
