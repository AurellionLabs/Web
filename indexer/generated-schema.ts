// Auto-generated Ponder Schema - DO NOT EDIT
// Generated at: 2026-01-08T21:02:23.731Z
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

export const nodeAssets = onchainTable(
  'node_assets',
  (t) => ({
    id: t.text().primaryKey(),
    node_id: t.hex().notNull(),
    token: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    price: t.bigint().notNull(),
    capacity: t.bigint().notNull(),
    balance: t.bigint().notNull(),
    created_at: t.bigint().notNull(),
    updated_at: t.bigint().notNull(),
  }),
  (table) => ({
    nodeIdIdx: index().on(table.node_id),
    tokenIdx: index().on(table.token),
  }),
);

export const clobOrders = onchainTable(
  'clob_orders',
  (t) => ({
    id: t.hex().primaryKey(),
    maker: t.hex().notNull(),
    market_id: t.hex().notNull(),
    base_token: t.hex().notNull(),
    base_token_id: t.bigint().notNull(),
    quote_token: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    filled_amount: t.bigint().notNull(),
    remaining_amount: t.bigint().notNull(),
    is_buy: t.boolean().notNull(),
    order_type: t.integer().notNull(),
    time_in_force: t.integer(),
    status: t.integer().notNull(),
    created_at: t.bigint().notNull(),
    updated_at: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    makerIdx: index().on(table.maker),
    marketIdIdx: index().on(table.market_id),
    statusIdx: index().on(table.status),
    baseTokenIdx: index().on(table.base_token),
  }),
);

export const clobTrades = onchainTable(
  'clob_trades',
  (t) => ({
    id: t.hex().primaryKey(),
    taker_order_id: t.hex().notNull(),
    maker_order_id: t.hex().notNull(),
    taker: t.hex().notNull(),
    maker: t.hex().notNull(),
    market_id: t.hex().notNull(),
    price: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    quote_amount: t.bigint().notNull(),
    taker_fee: t.bigint(),
    maker_fee: t.bigint(),
    taker_is_buy: t.boolean(),
    timestamp: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    takerIdx: index().on(table.taker),
    makerIdx: index().on(table.maker),
    marketIdIdx: index().on(table.market_id),
    takerOrderIdIdx: index().on(table.taker_order_id),
    makerOrderIdIdx: index().on(table.maker_order_id),
  }),
);

export const unifiedOrders = onchainTable(
  'unified_orders',
  (t) => ({
    id: t.hex().primaryKey(),
    buyer: t.hex().notNull(),
    seller: t.hex().notNull(),
    token: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    quantity: t.bigint().notNull(),
    price: t.bigint().notNull(),
    status: t.integer().notNull(),
    created_at: t.bigint().notNull(),
    updated_at: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    buyerIdx: index().on(table.buyer),
    sellerIdx: index().on(table.seller),
    statusIdx: index().on(table.status),
  }),
);

export const stakes = onchainTable(
  'stakes',
  (t) => ({
    id: t.text().primaryKey(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    rewards_claimed: t.bigint().notNull(),
    created_at: t.bigint().notNull(),
    updated_at: t.bigint().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
  }),
);

export const clobApprovalGrantedEvents = onchainTable(
  'clob_approval_granted_events',
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

export const clobApprovalRevokedEvents = onchainTable(
  'clob_approval_revoked_events',
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

export const initializedEvents = onchainTable('initialized_events', (t) => ({
  id: t.text().primaryKey(),
  version: t.bigint().notNull(),
  block_number: t.bigint().notNull(),
  block_timestamp: t.bigint().notNull(),
  transaction_hash: t.hex().notNull(),
}));

export const nodeCapacityUpdatedEvents = onchainTable(
  'node_capacity_updated_events',
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

export const nodeDeactivatedEvents = onchainTable(
  'node_deactivated_events',
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

export const nodeRegisteredEvents = onchainTable(
  'node_registered_events',
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

export const nodeSellOrderPlacedEvents = onchainTable(
  'node_sell_order_placed_events',
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

export const nodeUpdatedEvents = onchainTable(
  'node_updated_events',
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

export const supportedAssetAddedEvents = onchainTable(
  'supported_asset_added_events',
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

export const supportedAssetsUpdatedEvents = onchainTable(
  'supported_assets_updated_events',
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

export const tokensDepositedToNodeEvents = onchainTable(
  'tokens_deposited_to_node_events',
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

export const tokensMintedToNodeEvents = onchainTable(
  'tokens_minted_to_node_events',
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

export const tokensTransferredBetweenNodesEvents = onchainTable(
  'tokens_transferred_between_nodes_events',
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

export const tokensWithdrawnFromNodeEvents = onchainTable(
  'tokens_withdrawn_from_node_events',
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

export const updateLocationEvents = onchainTable(
  'update_location_events',
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

export const updateOwnerEvents = onchainTable(
  'update_owner_events',
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

export const updateStatusEvents = onchainTable(
  'update_status_events',
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

export const marketCreatedEvents = onchainTable(
  'market_created_events',
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

export const orderCancelledEvents = onchainTable(
  'order_cancelled_events',
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

export const orderCreatedEvents = onchainTable(
  'order_created_events',
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

export const orderExpiredEvents = onchainTable(
  'order_expired_events',
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

export const orderFilledEvents = onchainTable(
  'order_filled_events',
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

export const orderPlacedWithTokensEvents = onchainTable(
  'order_placed_with_tokens_events',
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

export const tradeExecutedEvents = onchainTable(
  'trade_executed_events',
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

export const tradeExecutedEvents = onchainTable(
  'trade_executed_events',
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

export const orderRoutedEvents = onchainTable(
  'order_routed_events',
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

export const bountyPaidEvents = onchainTable(
  'bounty_paid_events',
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

export const feeRecipientUpdatedEvents = onchainTable(
  'fee_recipient_updated_events',
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

export const journeyStatusUpdatedEvents = onchainTable(
  'journey_status_updated_events',
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

export const logisticsOrderCreatedEvents = onchainTable(
  'logistics_order_created_events',
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

export const orderCancelledEvents = onchainTable(
  'order_cancelled_events',
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

export const orderSettledEvents = onchainTable(
  'order_settled_events',
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

export const tradeMatchedEvents = onchainTable(
  'trade_matched_events',
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

export const unifiedOrderCreatedEvents = onchainTable(
  'unified_order_created_events',
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

export const rewardRateUpdatedEvents = onchainTable(
  'reward_rate_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    old_rate: t.bigint().notNull(),
    new_rate: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const rewardsClaimedEvents = onchainTable(
  'rewards_claimed_events',
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

export const stakedEvents = onchainTable(
  'staked_events',
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

export const withdrawnEvents = onchainTable(
  'withdrawn_events',
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

export const circuitBreakerConfiguredEvents = onchainTable(
  'circuit_breaker_configured_events',
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

export const circuitBreakerResetEvents = onchainTable(
  'circuit_breaker_reset_events',
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

export const circuitBreakerTrippedEvents = onchainTable(
  'circuit_breaker_tripped_events',
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

export const emergencyActionCancelledEvents = onchainTable(
  'emergency_action_cancelled_events',
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

export const emergencyActionExecutedEvents = onchainTable(
  'emergency_action_executed_events',
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

export const emergencyActionInitiatedEvents = onchainTable(
  'emergency_action_initiated_events',
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

export const emergencyWithdrawalEvents = onchainTable(
  'emergency_withdrawal_events',
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

export const feesUpdatedEvents = onchainTable('fees_updated_events', (t) => ({
  id: t.text().primaryKey(),
  taker_fee_bps: t.bigint().notNull(),
  maker_fee_bps: t.bigint().notNull(),
  lp_fee_bps: t.bigint().notNull(),
  block_number: t.bigint().notNull(),
  block_timestamp: t.bigint().notNull(),
  transaction_hash: t.hex().notNull(),
}));

export const globalPauseEvents = onchainTable('global_pause_events', (t) => ({
  id: t.text().primaryKey(),
  paused: t.boolean().notNull(),
  block_number: t.bigint().notNull(),
  block_timestamp: t.bigint().notNull(),
  transaction_hash: t.hex().notNull(),
}));

export const mEVProtectionUpdatedEvents = onchainTable(
  'm_e_v_protection_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    min_reveal_delay: t.bigint().notNull(),
    commitment_threshold: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const marketPausedEvents = onchainTable(
  'market_paused_events',
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

export const marketUnpausedEvents = onchainTable(
  'market_unpaused_events',
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

export const rateLimitsUpdatedEvents = onchainTable(
  'rate_limits_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    max_orders_per_block: t.bigint().notNull(),
    max_volume_per_block: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const diamondCutEvents = onchainTable('diamond_cut_events', (t) => ({
  id: t.text().primaryKey(),
  diamond_cut: t.text().notNull(),
  init: t.hex().notNull(),
  calldata: t.hex().notNull(),
  block_number: t.bigint().notNull(),
  block_timestamp: t.bigint().notNull(),
  transaction_hash: t.hex().notNull(),
}));

export const ownershipTransferredEvents = onchainTable(
  'ownership_transferred_events',
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
  nodeAssets,
  clobOrders,
  clobTrades,
  unifiedOrders,
  stakes,
  clobApprovalGrantedEvents,
  clobApprovalRevokedEvents,
  initializedEvents,
  nodeCapacityUpdatedEvents,
  nodeDeactivatedEvents,
  nodeRegisteredEvents,
  nodeSellOrderPlacedEvents,
  nodeUpdatedEvents,
  supportedAssetAddedEvents,
  supportedAssetsUpdatedEvents,
  tokensDepositedToNodeEvents,
  tokensMintedToNodeEvents,
  tokensTransferredBetweenNodesEvents,
  tokensWithdrawnFromNodeEvents,
  updateLocationEvents,
  updateOwnerEvents,
  updateStatusEvents,
  marketCreatedEvents,
  orderCancelledEvents,
  orderCreatedEvents,
  orderExpiredEvents,
  orderFilledEvents,
  orderPlacedWithTokensEvents,
  tradeExecutedEvents,
  tradeExecutedEvents,
  orderRoutedEvents,
  bountyPaidEvents,
  feeRecipientUpdatedEvents,
  journeyStatusUpdatedEvents,
  logisticsOrderCreatedEvents,
  orderCancelledEvents,
  orderSettledEvents,
  tradeMatchedEvents,
  unifiedOrderCreatedEvents,
  rewardRateUpdatedEvents,
  rewardsClaimedEvents,
  stakedEvents,
  withdrawnEvents,
  circuitBreakerConfiguredEvents,
  circuitBreakerResetEvents,
  circuitBreakerTrippedEvents,
  emergencyActionCancelledEvents,
  emergencyActionExecutedEvents,
  emergencyActionInitiatedEvents,
  emergencyWithdrawalEvents,
  feesUpdatedEvents,
  globalPauseEvents,
  mEVProtectionUpdatedEvents,
  marketPausedEvents,
  marketUnpausedEvents,
  rateLimitsUpdatedEvents,
  diamondCutEvents,
  ownershipTransferredEvents,
};
