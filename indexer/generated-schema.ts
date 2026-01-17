// Auto-generated Ponder Schema - DO NOT EDIT
// Generated at: 2026-01-16T23:56:51.264Z
//
// This schema is derived from Diamond facet events.
// Regenerate with: npm run generate:indexer

import { onchainTable, index } from '@ponder/core';

export const nodes = onchainTable(
  'nodes',
  (t) => ({
    id: t.hex().primaryKey(),
    owner: t.hex().notNull(),
    node_type: t.text().notNull(),
    status: t.text().notNull(),
    address_name: t.text(),
    lat: t.text(),
    lng: t.text(),
    created_at: t.bigint().notNull(),
    updated_at: t.bigint().notNull(),
  }),
  (table) => ({
    ownerIdx: index().on(table.owner),
    statusIdx: index().on(table.status),
  }),
);

export const clobApprovalGrantedD512Events = onchainTable(
  'clob_approval_granted_d512_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    clob_address: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
    clobAddressIdx: index().on(table.clob_address),
  }),
);

export const clobApprovalRevokedBdd4Events = onchainTable(
  'clob_approval_revoked_bdd4_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    clob_address: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
    clobAddressIdx: index().on(table.clob_address),
  }),
);

export const initializedC7f5Events = onchainTable(
  'initialized_c7f5_events',
  (t) => ({
    id: t.text().primaryKey(),
    version: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const nodeCapacityUpdated_0ba8Events = onchainTable(
  'node_capacity_updated_0ba8_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    quantities: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
  }),
);

export const nodeDeactivated_62b3Events = onchainTable(
  'node_deactivated_62b3_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
  }),
);

export const nodeRegistered_8326Events = onchainTable(
  'node_registered_8326_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    owner: t.hex().notNull(),
    node_type: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
    ownerIdx: index().on(table.owner),
  }),
);

export const nodeSellOrderPlaced_3de5Events = onchainTable(
  'node_sell_order_placed_3de5_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    quote_token: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    order_id: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
    tokenIdIdx: index().on(table.token_id),
  }),
);

export const nodeUpdated_9c97Events = onchainTable(
  'node_updated_9c97_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    node_type: t.text().notNull(),
    capacity: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
  }),
);

export const supportedAssetAdded_9f0aEvents = onchainTable(
  'supported_asset_added_9f0a_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    token: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    price: t.bigint().notNull(),
    capacity: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
  }),
);

export const supportedAssetsUpdated_1af7Events = onchainTable(
  'supported_assets_updated_1af7_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    count: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
  }),
);

export const tokensDepositedToNode_9d99Events = onchainTable(
  'tokens_deposited_to_node_9d99_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    depositor: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
    tokenIdIdx: index().on(table.token_id),
    depositorIdx: index().on(table.depositor),
  }),
);

export const tokensMintedToNode_1177Events = onchainTable(
  'tokens_minted_to_node_1177_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    minter: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
    tokenIdIdx: index().on(table.token_id),
    minterIdx: index().on(table.minter),
  }),
);

export const tokensTransferredBetweenNodes_5ceeEvents = onchainTable(
  'tokens_transferred_between_nodes_5cee_events',
  (t) => ({
    id: t.text().primaryKey(),
    from_node: t.hex().notNull(),
    to_node: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    fromNodeIdx: index().on(table.from_node),
    toNodeIdx: index().on(table.to_node),
    tokenIdIdx: index().on(table.token_id),
  }),
);

export const tokensWithdrawnFromNode_5994Events = onchainTable(
  'tokens_withdrawn_from_node_5994_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    recipient: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
    tokenIdIdx: index().on(table.token_id),
    recipientIdx: index().on(table.recipient),
  }),
);

export const updateLocation_6d4fEvents = onchainTable(
  'update_location_6d4f_events',
  (t) => ({
    id: t.text().primaryKey(),
    address_name: t.text().notNull(),
    lat: t.text().notNull(),
    lng: t.text().notNull(),
    node: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    addressNameIdx: index().on(table.address_name),
    nodeIdx: index().on(table.node),
  }),
);

export const updateOwnerEa9dEvents = onchainTable(
  'update_owner_ea9d_events',
  (t) => ({
    id: t.text().primaryKey(),
    owner: t.hex().notNull(),
    node: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    ownerIdx: index().on(table.owner),
    nodeIdx: index().on(table.node),
  }),
);

export const updateStatusCf4eEvents = onchainTable(
  'update_status_cf4e_events',
  (t) => ({
    id: t.text().primaryKey(),
    status: t.hex().notNull(),
    node: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    statusIdx: index().on(table.status),
    nodeIdx: index().on(table.node),
  }),
);

export const cLOBOrderCancelled_8b47Events = onchainTable(
  'c_l_o_b_order_cancelled_8b47_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    maker: t.hex().notNull(),
    remaining_amount: t.bigint().notNull(),
    reason: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    makerIdx: index().on(table.maker),
  }),
);

export const cLOBOrderFilled_2d54Events = onchainTable(
  'c_l_o_b_order_filled_2d54_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    trade_id: t.hex().notNull(),
    fill_amount: t.bigint().notNull(),
    fill_price: t.bigint().notNull(),
    remaining_amount: t.bigint().notNull(),
    cumulative_filled: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    tradeIdIdx: index().on(table.trade_id),
  }),
);

export const cLOBTradeExecuted_57e6Events = onchainTable(
  'c_l_o_b_trade_executed_57e6_events',
  (t) => ({
    id: t.text().primaryKey(),
    trade_id: t.hex().notNull(),
    taker_order_id: t.hex().notNull(),
    maker_order_id: t.hex().notNull(),
    taker: t.hex().notNull(),
    maker: t.hex().notNull(),
    market_id: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    quote_amount: t.bigint().notNull(),
    taker_fee: t.bigint().notNull(),
    maker_fee: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    taker_is_buy: t.boolean().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    tradeIdIdx: index().on(table.trade_id),
    takerOrderIdIdx: index().on(table.taker_order_id),
    makerOrderIdIdx: index().on(table.maker_order_id),
  }),
);

export const marketCreatedB59eEvents = onchainTable(
  'market_created_b59e_events',
  (t) => ({
    id: t.text().primaryKey(),
    market_id: t.hex().notNull(),
    base_token: t.hex().notNull(),
    base_token_id: t.bigint().notNull(),
    quote_token: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    marketIdIdx: index().on(table.market_id),
    baseTokenIdx: index().on(table.base_token),
    quoteTokenIdx: index().on(table.quote_token),
  }),
);

export const orderCreated_43feEvents = onchainTable(
  'order_created_43fe_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    market_id: t.hex().notNull(),
    maker: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    is_buy: t.boolean().notNull(),
    order_type: t.bigint().notNull(),
    time_in_force: t.bigint().notNull(),
    expiry: t.bigint().notNull(),
    nonce: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    marketIdIdx: index().on(table.market_id),
    makerIdx: index().on(table.maker),
  }),
);

export const orderExpiredB558Events = onchainTable(
  'order_expired_b558_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    expired_at: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
  }),
);

export const orderPlacedWithTokensE764Events = onchainTable(
  'order_placed_with_tokens_e764_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    maker: t.hex().notNull(),
    base_token: t.hex().notNull(),
    base_token_id: t.bigint().notNull(),
    quote_token: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    is_buy: t.boolean().notNull(),
    order_type: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    makerIdx: index().on(table.maker),
    baseTokenIdx: index().on(table.base_token),
  }),
);

export const ausysOrderFilled_3e2eEvents = onchainTable(
  'ausys_order_filled_3e2e_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    trade_id: t.hex().notNull(),
    fill_amount: t.bigint().notNull(),
    fill_price: t.bigint().notNull(),
    remaining_amount: t.bigint().notNull(),
    cumulative_filled: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    tradeIdIdx: index().on(table.trade_id),
  }),
);

export const matchingOrderCancelled_6f7dEvents = onchainTable(
  'matching_order_cancelled_6f7d_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    maker: t.hex().notNull(),
    remaining_amount: t.bigint().notNull(),
    reason: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    makerIdx: index().on(table.maker),
  }),
);

export const tradeExecuted_4692Events = onchainTable(
  'trade_executed_4692_events',
  (t) => ({
    id: t.text().primaryKey(),
    trade_id: t.hex().notNull(),
    taker_order_id: t.hex().notNull(),
    maker_order_id: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    quote_amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    tradeIdIdx: index().on(table.trade_id),
    takerOrderIdIdx: index().on(table.taker_order_id),
    makerOrderIdIdx: index().on(table.maker_order_id),
  }),
);

export const orderRouted_1382Events = onchainTable(
  'order_routed_1382_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    maker: t.hex().notNull(),
    order_source: t.bigint().notNull(),
    is_buy: t.boolean().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    makerIdx: index().on(table.maker),
  }),
);

export const routerOrderCancelled_8f11Events = onchainTable(
  'router_order_cancelled_8f11_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    maker: t.hex().notNull(),
    remaining_amount: t.bigint().notNull(),
    reason: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    makerIdx: index().on(table.maker),
  }),
);

export const routerOrderCreated_7398Events = onchainTable(
  'router_order_created_7398_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    market_id: t.hex().notNull(),
    maker: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    is_buy: t.boolean().notNull(),
    order_type: t.bigint().notNull(),
    time_in_force: t.bigint().notNull(),
    expiry: t.bigint().notNull(),
    nonce: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    marketIdIdx: index().on(table.market_id),
    makerIdx: index().on(table.maker),
  }),
);

export const routerOrderPlaced_0e2eEvents = onchainTable(
  'router_order_placed_0e2e_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    maker: t.hex().notNull(),
    base_token: t.hex().notNull(),
    base_token_id: t.bigint().notNull(),
    quote_token: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    is_buy: t.boolean().notNull(),
    order_type: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    makerIdx: index().on(table.maker),
    baseTokenIdx: index().on(table.base_token),
  }),
);

export const routerTradeExecuted_5493Events = onchainTable(
  'router_trade_executed_5493_events',
  (t) => ({
    id: t.text().primaryKey(),
    trade_id: t.hex().notNull(),
    taker_order_id: t.hex().notNull(),
    maker_order_id: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    quote_amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    tradeIdIdx: index().on(table.trade_id),
    takerOrderIdIdx: index().on(table.taker_order_id),
    makerOrderIdIdx: index().on(table.maker_order_id),
  }),
);

export const bountyPaid_8e7bEvents = onchainTable(
  'bounty_paid_8e7b_events',
  (t) => ({
    id: t.text().primaryKey(),
    unified_order_id: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    unifiedOrderIdIdx: index().on(table.unified_order_id),
  }),
);

export const bridgeFeeRecipientUpdatedD240Events = onchainTable(
  'bridge_fee_recipient_updated_d240_events',
  (t) => ({
    id: t.text().primaryKey(),
    old_recipient: t.hex().notNull(),
    new_recipient: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    oldRecipientIdx: index().on(table.old_recipient),
    newRecipientIdx: index().on(table.new_recipient),
  }),
);

export const bridgeOrderCancelledFb63Events = onchainTable(
  'bridge_order_cancelled_fb63_events',
  (t) => ({
    id: t.text().primaryKey(),
    unified_order_id: t.hex().notNull(),
    previous_status: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    unifiedOrderIdIdx: index().on(table.unified_order_id),
  }),
);

export const journeyStatusUpdatedF7daEvents = onchainTable(
  'journey_status_updated_f7da_events',
  (t) => ({
    id: t.text().primaryKey(),
    unified_order_id: t.hex().notNull(),
    journey_id: t.hex().notNull(),
    phase: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    unifiedOrderIdIdx: index().on(table.unified_order_id),
    journeyIdIdx: index().on(table.journey_id),
  }),
);

export const logisticsOrderCreated_9c83Events = onchainTable(
  'logistics_order_created_9c83_events',
  (t) => ({
    id: t.text().primaryKey(),
    unified_order_id: t.hex().notNull(),
    ausys_order_id: t.hex().notNull(),
    journey_ids: t.hex().notNull(),
    bounty: t.bigint().notNull(),
    node: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    unifiedOrderIdIdx: index().on(table.unified_order_id),
  }),
);

export const orderSettledE726Events = onchainTable(
  'order_settled_e726_events',
  (t) => ({
    id: t.text().primaryKey(),
    unified_order_id: t.hex().notNull(),
    seller: t.hex().notNull(),
    seller_amount: t.bigint().notNull(),
    driver: t.hex().notNull(),
    driver_amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    unifiedOrderIdIdx: index().on(table.unified_order_id),
  }),
);

export const tradeMatched_51d0Events = onchainTable(
  'trade_matched_51d0_events',
  (t) => ({
    id: t.text().primaryKey(),
    unified_order_id: t.hex().notNull(),
    clob_trade_id: t.hex().notNull(),
    clob_order_id: t.hex().notNull(),
    maker: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    unifiedOrderIdIdx: index().on(table.unified_order_id),
  }),
);

export const unifiedOrderCreatedC8b6Events = onchainTable(
  'unified_order_created_c8b6_events',
  (t) => ({
    id: t.text().primaryKey(),
    unified_order_id: t.hex().notNull(),
    clob_order_id: t.hex().notNull(),
    buyer: t.hex().notNull(),
    seller: t.hex().notNull(),
    token: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    quantity: t.bigint().notNull(),
    price: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    unifiedOrderIdIdx: index().on(table.unified_order_id),
    clobOrderIdIdx: index().on(table.clob_order_id),
  }),
);

export const rewardRateUpdatedC390Events = onchainTable(
  'reward_rate_updated_c390_events',
  (t) => ({
    id: t.text().primaryKey(),
    old_rate: t.bigint().notNull(),
    new_rate: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const rewardsClaimedFc30Events = onchainTable(
  'rewards_claimed_fc30_events',
  (t) => ({
    id: t.text().primaryKey(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
  }),
);

export const staked_9e71Events = onchainTable(
  'staked_9e71_events',
  (t) => ({
    id: t.text().primaryKey(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
  }),
);

export const withdrawn_7084Events = onchainTable(
  'withdrawn_7084_events',
  (t) => ({
    id: t.text().primaryKey(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
  }),
);

export const circuitBreakerConfigured_5880Events = onchainTable(
  'circuit_breaker_configured_5880_events',
  (t) => ({
    id: t.text().primaryKey(),
    market_id: t.hex().notNull(),
    price_change_threshold: t.bigint().notNull(),
    cooldown_period: t.bigint().notNull(),
    is_enabled: t.boolean().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    marketIdIdx: index().on(table.market_id),
  }),
);

export const circuitBreakerResetBae5Events = onchainTable(
  'circuit_breaker_reset_bae5_events',
  (t) => ({
    id: t.text().primaryKey(),
    market_id: t.hex().notNull(),
    reset_at: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    marketIdIdx: index().on(table.market_id),
  }),
);

export const circuitBreakerTripped_5953Events = onchainTable(
  'circuit_breaker_tripped_5953_events',
  (t) => ({
    id: t.text().primaryKey(),
    market_id: t.hex().notNull(),
    trigger_price: t.bigint().notNull(),
    previous_price: t.bigint().notNull(),
    change_percent: t.bigint().notNull(),
    cooldown_until: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    marketIdIdx: index().on(table.market_id),
  }),
);

export const emergencyActionCancelled_248bEvents = onchainTable(
  'emergency_action_cancelled_248b_events',
  (t) => ({
    id: t.text().primaryKey(),
    action_id: t.hex().notNull(),
    canceller: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    actionIdIdx: index().on(table.action_id),
    cancellerIdx: index().on(table.canceller),
  }),
);

export const emergencyActionExecuted_4579Events = onchainTable(
  'emergency_action_executed_4579_events',
  (t) => ({
    id: t.text().primaryKey(),
    action_id: t.hex().notNull(),
    executor: t.hex().notNull(),
    token: t.hex().notNull(),
    recipient: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    actionIdIdx: index().on(table.action_id),
    executorIdx: index().on(table.executor),
  }),
);

export const emergencyActionInitiatedCa04Events = onchainTable(
  'emergency_action_initiated_ca04_events',
  (t) => ({
    id: t.text().primaryKey(),
    action_id: t.hex().notNull(),
    initiator: t.hex().notNull(),
    token: t.hex().notNull(),
    recipient: t.hex().notNull(),
    amount: t.bigint().notNull(),
    execute_after: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    actionIdIdx: index().on(table.action_id),
    initiatorIdx: index().on(table.initiator),
  }),
);

export const emergencyWithdrawalC0f6Events = onchainTable(
  'emergency_withdrawal_c0f6_events',
  (t) => ({
    id: t.text().primaryKey(),
    user: t.hex().notNull(),
    order_id: t.hex().notNull(),
    token: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    orderIdIdx: index().on(table.order_id),
  }),
);

export const feeRecipientUpdatedAaebEvents = onchainTable(
  'fee_recipient_updated_aaeb_events',
  (t) => ({
    id: t.text().primaryKey(),
    old_recipient: t.hex().notNull(),
    new_recipient: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    oldRecipientIdx: index().on(table.old_recipient),
    newRecipientIdx: index().on(table.new_recipient),
  }),
);

export const feesUpdatedB3efEvents = onchainTable(
  'fees_updated_b3ef_events',
  (t) => ({
    id: t.text().primaryKey(),
    taker_fee_bps: t.bigint().notNull(),
    maker_fee_bps: t.bigint().notNull(),
    lp_fee_bps: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const globalPauseA5feEvents = onchainTable(
  'global_pause_a5fe_events',
  (t) => ({
    id: t.text().primaryKey(),
    paused: t.boolean().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const mEVProtectionUpdated_096cEvents = onchainTable(
  'm_e_v_protection_updated_096c_events',
  (t) => ({
    id: t.text().primaryKey(),
    min_reveal_delay: t.bigint().notNull(),
    commitment_threshold: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const marketPaused_6136Events = onchainTable(
  'market_paused_6136_events',
  (t) => ({
    id: t.text().primaryKey(),
    market_id: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    marketIdIdx: index().on(table.market_id),
  }),
);

export const marketUnpausedB51dEvents = onchainTable(
  'market_unpaused_b51d_events',
  (t) => ({
    id: t.text().primaryKey(),
    market_id: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    marketIdIdx: index().on(table.market_id),
  }),
);

export const rateLimitsUpdated_6675Events = onchainTable(
  'rate_limits_updated_6675_events',
  (t) => ({
    id: t.text().primaryKey(),
    max_orders_per_block: t.bigint().notNull(),
    max_volume_per_block: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const diamondCutE785Events = onchainTable(
  'diamond_cut_e785_events',
  (t) => ({
    id: t.text().primaryKey(),
    diamond_cut: t.text().notNull(),
    init: t.hex().notNull(),
    calldata: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const ownershipTransferred_8be0Events = onchainTable(
  'ownership_transferred_8be0_events',
  (t) => ({
    id: t.text().primaryKey(),
    previous_owner: t.hex().notNull(),
    new_owner: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    previousOwnerIdx: index().on(table.previous_owner),
    newOwnerIdx: index().on(table.new_owner),
  }),
);

// Export all tables
export const tables = {
  nodes,
  clobApprovalGrantedD512Events,
  clobApprovalRevokedBdd4Events,
  initializedC7f5Events,
  nodeCapacityUpdated_0ba8Events,
  nodeDeactivated_62b3Events,
  nodeRegistered_8326Events,
  nodeSellOrderPlaced_3de5Events,
  nodeUpdated_9c97Events,
  supportedAssetAdded_9f0aEvents,
  supportedAssetsUpdated_1af7Events,
  tokensDepositedToNode_9d99Events,
  tokensMintedToNode_1177Events,
  tokensTransferredBetweenNodes_5ceeEvents,
  tokensWithdrawnFromNode_5994Events,
  updateLocation_6d4fEvents,
  updateOwnerEa9dEvents,
  updateStatusCf4eEvents,
  cLOBOrderCancelled_8b47Events,
  cLOBOrderFilled_2d54Events,
  cLOBTradeExecuted_57e6Events,
  marketCreatedB59eEvents,
  orderCreated_43feEvents,
  orderExpiredB558Events,
  orderPlacedWithTokensE764Events,
  ausysOrderFilled_3e2eEvents,
  matchingOrderCancelled_6f7dEvents,
  tradeExecuted_4692Events,
  orderRouted_1382Events,
  routerOrderCancelled_8f11Events,
  routerOrderCreated_7398Events,
  routerOrderPlaced_0e2eEvents,
  routerTradeExecuted_5493Events,
  bountyPaid_8e7bEvents,
  bridgeFeeRecipientUpdatedD240Events,
  bridgeOrderCancelledFb63Events,
  journeyStatusUpdatedF7daEvents,
  logisticsOrderCreated_9c83Events,
  orderSettledE726Events,
  tradeMatched_51d0Events,
  unifiedOrderCreatedC8b6Events,
  rewardRateUpdatedC390Events,
  rewardsClaimedFc30Events,
  staked_9e71Events,
  withdrawn_7084Events,
  circuitBreakerConfigured_5880Events,
  circuitBreakerResetBae5Events,
  circuitBreakerTripped_5953Events,
  emergencyActionCancelled_248bEvents,
  emergencyActionExecuted_4579Events,
  emergencyActionInitiatedCa04Events,
  emergencyWithdrawalC0f6Events,
  feeRecipientUpdatedAaebEvents,
  feesUpdatedB3efEvents,
  globalPauseA5feEvents,
  mEVProtectionUpdated_096cEvents,
  marketPaused_6136Events,
  marketUnpausedB51dEvents,
  rateLimitsUpdated_6675Events,
  diamondCutE785Events,
  ownershipTransferred_8be0Events,
};
