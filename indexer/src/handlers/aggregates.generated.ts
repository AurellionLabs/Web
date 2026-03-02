// Auto-generated aggregate handlers - DO NOT EDIT
// Generated at: 2026-03-02T05:05:48.552Z
//
// These handlers upsert/insert into aggregate tables whenever relevant events fire.
// Generated from EVENT_TO_AGGREGATE_MAPPING in scripts/generate-indexer.ts

import { ponder } from 'ponder:registry';
import { orders, journeys, assets } from 'ponder:schema';

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

  await context.db
    .insert(orders)
    .values({
      id: unifiedOrderId,
      buyer: buyer,
      seller: seller,
      token: token,
      token_id: tokenId,
      token_quantity: quantity,
      requested_token_quantity: quantity,
      price: price,
      tx_fee: BigInt(0),
      current_status: 0,
      created_at: BigInt(event.block.timestamp),
      updated_at: BigInt(event.block.timestamp),
      block_number: event.block.number,
      transaction_hash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:OrderSettled', async ({ event, context }) => {
  const { unifiedOrderId, seller, sellerAmount, driver, driverAmount } =
    event.args;

  await context.db.update(orders, { id: unifiedOrderId }).set({
    current_status: 4,
    updated_at: BigInt(event.block.timestamp),
    block_number: event.block.number,
    transaction_hash: event.transaction.hash,
  });
});

ponder.on('Diamond:BridgeOrderCancelled', async ({ event, context }) => {
  const { unifiedOrderId, previousStatus } = event.args;

  await context.db.update(orders, { id: unifiedOrderId }).set({
    current_status: 5,
    updated_at: BigInt(event.block.timestamp),
    block_number: event.block.number,
    transaction_hash: event.transaction.hash,
  });
});

ponder.on('Diamond:LogisticsOrderCreated', async ({ event, context }) => {
  const { unifiedOrderId, ausysOrderId, journeyIds, bounty, node } = event.args;

  await context.db
    .insert(journeys)
    .values({
      id: ausysOrderId,
      sender: node,
      receiver: node,
      current_status: 0,
      bounty: bounty,
      order_id: unifiedOrderId,
      created_at: BigInt(event.block.timestamp),
      updated_at: BigInt(event.block.timestamp),
      block_number: event.block.number,
      transaction_hash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:JourneyStatusUpdated', async ({ event, context }) => {
  const { unifiedOrderId, journeyId, phase } = event.args;

  await context.db.update(journeys, { id: journeyId }).set({
    current_status: Number(BigInt(phase)),
    order_id: unifiedOrderId,
    updated_at: BigInt(event.block.timestamp),
    block_number: event.block.number,
    transaction_hash: event.transaction.hash,
  });
});

ponder.on('Diamond:MintedAsset', async ({ event, context }) => {
  const { account, hash, tokenId, name, assetClass, className } = event.args;

  await context.db
    .insert(assets)
    .values({
      id: hash,
      hash: hash,
      token_id: tokenId,
      name: name,
      asset_class: assetClass,
      class_name: className,
      account: account,
      created_at: BigInt(event.block.timestamp),
      updated_at: BigInt(event.block.timestamp),
      block_number: event.block.number,
      transaction_hash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      hash: hash,
      token_id: tokenId,
      name: name,
      asset_class: assetClass,
      class_name: className,
      account: account,
      created_at: BigInt(event.block.timestamp),
      updated_at: BigInt(event.block.timestamp),
      block_number: event.block.number,
      transaction_hash: event.transaction.hash,
    });
});
