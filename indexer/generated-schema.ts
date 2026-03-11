// Auto-generated Ponder Schema - DO NOT EDIT
// Generated at: 2026-03-10T19:30:30.103Z
//
// This schema is derived from Diamond facet events.
// Regenerate with: npm run generate:indexer

import { onchainTable, index } from 'ponder';

export const assets = onchainTable(
  'assets',
  (t) => ({
    id: t.text().primaryKey(),
    hash: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    name: t.text().notNull(),
    asset_class: t.text().notNull(),
    class_name: t.text().notNull(),
    account: t.hex().notNull(),
    created_at: t.bigint().notNull(),
    updated_at: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    tokenIdIdx: index().on(table.token_id),
    accountIdx: index().on(table.account),
    assetClass_classNameIdx: index().on(table.asset_class, table.class_name),
  }),
);

export const orders = onchainTable(
  'orders',
  (t) => ({
    id: t.text().primaryKey(),
    buyer: t.hex().notNull(),
    seller: t.hex().notNull(),
    token: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    token_quantity: t.bigint().notNull(),
    requested_token_quantity: t.bigint().notNull(),
    price: t.bigint().notNull(),
    tx_fee: t.bigint().notNull(),
    current_status: t.integer().notNull(),
    start_location_lat: t.text(),
    start_location_lng: t.text(),
    end_location_lat: t.text(),
    end_location_lng: t.text(),
    start_name: t.text(),
    end_name: t.text(),
    nodes: t.text(),
    created_at: t.bigint().notNull(),
    updated_at: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    buyerIdx: index().on(table.buyer),
    sellerIdx: index().on(table.seller),
    currentStatusIdx: index().on(table.current_status),
  }),
);

export const journeys = onchainTable(
  'journeys',
  (t) => ({
    id: t.text().primaryKey(),
    sender: t.hex().notNull(),
    receiver: t.hex().notNull(),
    driver: t.hex(),
    current_status: t.integer().notNull(),
    bounty: t.bigint().notNull(),
    journey_start: t.bigint(),
    journey_end: t.bigint(),
    eta: t.bigint(),
    start_location_lat: t.text(),
    start_location_lng: t.text(),
    end_location_lat: t.text(),
    end_location_lng: t.text(),
    start_name: t.text(),
    end_name: t.text(),
    order_id: t.hex().notNull(),
    created_at: t.bigint().notNull(),
    updated_at: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    senderIdx: index().on(table.sender),
    receiverIdx: index().on(table.receiver),
    driverIdx: index().on(table.driver),
    currentStatusIdx: index().on(table.current_status),
    orderIdIdx: index().on(table.order_id),
    currentStatus_createdAtIdx: index().on(
      table.current_status,
      table.created_at,
    ),
  }),
);

export const diamondClobApprovalGrantedEvents = onchainTable(
  'diamond_clob_approval_granted_events',
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

export const diamondClobApprovalRevokedEvents = onchainTable(
  'diamond_clob_approval_revoked_events',
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

export const diamondInitializedEvents = onchainTable(
  'diamond_initialized_events',
  (t) => ({
    id: t.text().primaryKey(),
    version: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const diamondNodeAdminRevokedEvents = onchainTable(
  'diamond_node_admin_revoked_events',
  (t) => ({
    id: t.text().primaryKey(),
    admin: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    adminIdx: index().on(table.admin),
  }),
);

export const diamondNodeAdminSetEvents = onchainTable(
  'diamond_node_admin_set_events',
  (t) => ({
    id: t.text().primaryKey(),
    admin: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    adminIdx: index().on(table.admin),
  }),
);

export const diamondNodeCapacityUpdatedEvents = onchainTable(
  'diamond_node_capacity_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    quantities: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
  }),
);

export const diamondNodeDeactivatedEvents = onchainTable(
  'diamond_node_deactivated_events',
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

export const diamondNodeRegisteredEvents = onchainTable(
  'diamond_node_registered_events',
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

export const diamondNodeRegistrarUpdatedEvents = onchainTable(
  'diamond_node_registrar_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    registrar: t.hex().notNull(),
    enabled: t.boolean().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    registrarIdx: index().on(table.registrar),
  }),
);

export const diamondNodeSellOrderPlacedEvents = onchainTable(
  'diamond_node_sell_order_placed_events',
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

export const diamondNodeUpdatedEvents = onchainTable(
  'diamond_node_updated_events',
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

export const diamondSupportedAssetAddedEvents = onchainTable(
  'diamond_supported_asset_added_events',
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

export const diamondSupportedAssetsUpdatedEvents = onchainTable(
  'diamond_supported_assets_updated_events',
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

export const diamondSupportingDocumentAddedEvents = onchainTable(
  'diamond_supporting_document_added_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    url: t.text().notNull(),
    title: t.text().notNull(),
    description: t.text().notNull(),
    document_type: t.text().notNull(),
    is_frozen: t.boolean().notNull(),
    timestamp: t.bigint().notNull(),
    added_by: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
    timestampIdx: index().on(table.timestamp),
    addedByIdx: index().on(table.added_by),
  }),
);

export const diamondSupportingDocumentRemovedEvents = onchainTable(
  'diamond_supporting_document_removed_events',
  (t) => ({
    id: t.text().primaryKey(),
    node_hash: t.hex().notNull(),
    url: t.text().notNull(),
    timestamp: t.bigint().notNull(),
    removed_by: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeHashIdx: index().on(table.node_hash),
    timestampIdx: index().on(table.timestamp),
    removedByIdx: index().on(table.removed_by),
  }),
);

export const diamondTokensDepositedToNodeEvents = onchainTable(
  'diamond_tokens_deposited_to_node_events',
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

export const diamondTokensMintedToNodeEvents = onchainTable(
  'diamond_tokens_minted_to_node_events',
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

export const diamondTokensTransferredBetweenNodesEvents = onchainTable(
  'diamond_tokens_transferred_between_nodes_events',
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

export const diamondTokensWithdrawnFromNodeEvents = onchainTable(
  'diamond_tokens_withdrawn_from_node_events',
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

export const diamondUpdateLocationEvents = onchainTable(
  'diamond_update_location_events',
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

export const diamondUpdateOwnerEvents = onchainTable(
  'diamond_update_owner_events',
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

export const diamondUpdateStatusEvents = onchainTable(
  'diamond_update_status_events',
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

export const diamondCLOBOrderCancelledEvents = onchainTable(
  'diamond_c_l_o_b_order_cancelled_events',
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

export const diamondCLOBOrderFilledEvents = onchainTable(
  'diamond_c_l_o_b_order_filled_events',
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

export const diamondCLOBTradeExecutedEvents = onchainTable(
  'diamond_c_l_o_b_trade_executed_events',
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

export const diamondMarketCreatedEvents = onchainTable(
  'diamond_market_created_events',
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

export const diamondOrderCreatedEvents = onchainTable(
  'diamond_order_created_events',
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

export const diamondOrderExpiredEvents = onchainTable(
  'diamond_order_expired_events',
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

export const diamondOrderPlacedWithTokensEvents = onchainTable(
  'diamond_order_placed_with_tokens_events',
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

export const diamondRouterOrderPlacedEvents = onchainTable(
  'diamond_router_order_placed_events',
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

export const diamondBountyPaidEvents = onchainTable(
  'diamond_bounty_paid_events',
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

export const diamondBridgeFeeRecipientUpdatedEvents = onchainTable(
  'diamond_bridge_fee_recipient_updated_events',
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

export const diamondBridgeOrderCancelledEvents = onchainTable(
  'diamond_bridge_order_cancelled_events',
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

export const diamondFundsEscrowedEvents = onchainTable(
  'diamond_funds_escrowed_events',
  (t) => ({
    id: t.text().primaryKey(),
    buyer: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    buyerIdx: index().on(table.buyer),
  }),
);

export const diamondFundsRefundedEvents = onchainTable(
  'diamond_funds_refunded_events',
  (t) => ({
    id: t.text().primaryKey(),
    recipient: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    recipientIdx: index().on(table.recipient),
  }),
);

export const diamondJourneyDriverAssignedEvents = onchainTable(
  'diamond_journey_driver_assigned_events',
  (t) => ({
    id: t.text().primaryKey(),
    unified_order_id: t.hex().notNull(),
    journey_id: t.hex().notNull(),
    driver: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    unifiedOrderIdIdx: index().on(table.unified_order_id),
    journeyIdIdx: index().on(table.journey_id),
    driverIdx: index().on(table.driver),
  }),
);

export const diamondJourneyStatusUpdatedEvents = onchainTable(
  'diamond_journey_status_updated_events',
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

export const diamondLogisticsOrderCreatedEvents = onchainTable(
  'diamond_logistics_order_created_events',
  (t) => ({
    id: t.text().primaryKey(),
    unified_order_id: t.hex().notNull(),
    ausys_order_id: t.hex().notNull(),
    journey_ids: t.text().notNull(),
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

export const diamondOrderSettledEvents = onchainTable(
  'diamond_order_settled_events',
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

export const diamondTradeMatchedEvents = onchainTable(
  'diamond_trade_matched_events',
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

export const diamondUnifiedOrderCreatedEvents = onchainTable(
  'diamond_unified_order_created_events',
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

export const diamondCollateralReturnedEvents = onchainTable(
  'diamond_collateral_returned_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    operator: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
    operatorIdx: index().on(table.operator),
  }),
);

export const diamondCommodityStakedEvents = onchainTable(
  'diamond_commodity_staked_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    staker: t.hex().notNull(),
    amount: t.bigint().notNull(),
    total_staked: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
    stakerIdx: index().on(table.staker),
  }),
);

export const diamondCommodityUnstakedEvents = onchainTable(
  'diamond_commodity_unstaked_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    staker: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
    stakerIdx: index().on(table.staker),
  }),
);

export const diamondConfigUpdatedEvents = onchainTable(
  'diamond_config_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    param: t.text().notNull(),
    old_value: t.bigint().notNull(),
    new_value: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    paramIdx: index().on(table.param),
  }),
);

export const diamondCustodyProofSubmittedEvents = onchainTable(
  'diamond_custody_proof_submitted_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    document_uri: t.text().notNull(),
    proof_type: t.text().notNull(),
    submitter: t.hex().notNull(),
    timestamp: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const diamondDeliveryConfirmedEvents = onchainTable(
  'diamond_delivery_confirmed_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    delivered_amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const diamondDeliveryStartedEvents = onchainTable(
  'diamond_delivery_started_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    journey_id: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const diamondInsuranceUpdatedEvents = onchainTable(
  'diamond_insurance_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    is_insured: t.boolean().notNull(),
    document_uri: t.text().notNull(),
    coverage_amount: t.bigint().notNull(),
    expiry_date: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const diamondOpportunityCancelledEvents = onchainTable(
  'diamond_opportunity_cancelled_events',
  (t) => ({
    id: t.text().primaryKey(),
    event_id: t.hex().notNull(),
    reason: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    eventIdIdx: index().on(table.event_id),
  }),
);

export const diamondOpportunityCompletedEvents = onchainTable(
  'diamond_opportunity_completed_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    total_proceeds: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const diamondOpportunityCreatedEvents = onchainTable(
  'diamond_opportunity_created_events',
  (t) => ({
    id: t.text().primaryKey(),
    event_id: t.hex().notNull(),
    operator: t.hex().notNull(),
    input_token: t.hex().notNull(),
    input_token_id: t.bigint().notNull(),
    target_amount: t.bigint().notNull(),
    promised_yield_bps: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    eventIdIdx: index().on(table.event_id),
    operatorIdx: index().on(table.operator),
  }),
);

export const diamondOpportunityFundedEvents = onchainTable(
  'diamond_opportunity_funded_events',
  (t) => ({
    id: t.text().primaryKey(),
    event_id: t.hex().notNull(),
    total_staked: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    eventIdIdx: index().on(table.event_id),
  }),
);

export const diamondProcessingCompletedEvents = onchainTable(
  'diamond_processing_completed_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    output_amount: t.bigint().notNull(),
    output_token_id: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const diamondProcessingStartedEvents = onchainTable(
  'diamond_processing_started_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const diamondProfitDistributedEvents = onchainTable(
  'diamond_profit_distributed_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    staker: t.hex().notNull(),
    staked_amount: t.bigint().notNull(),
    profit_share: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
    stakerIdx: index().on(table.staker),
  }),
);

export const diamondSaleProceedsRecordedEvents = onchainTable(
  'diamond_sale_proceeds_recorded_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    proceeds: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const diamondTokenizationProofSubmittedEvents = onchainTable(
  'diamond_tokenization_proof_submitted_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    document_uri: t.text().notNull(),
    submitter: t.hex().notNull(),
    timestamp: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const diamondCircuitBreakerConfiguredEvents = onchainTable(
  'diamond_circuit_breaker_configured_events',
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

export const diamondCircuitBreakerResetEvents = onchainTable(
  'diamond_circuit_breaker_reset_events',
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

export const diamondCircuitBreakerTrippedEvents = onchainTable(
  'diamond_circuit_breaker_tripped_events',
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

export const diamondFeeRecipientUpdatedEvents = onchainTable(
  'diamond_fee_recipient_updated_events',
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

export const diamondFeesUpdatedEvents = onchainTable(
  'diamond_fees_updated_events',
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

export const diamondGlobalPauseEvents = onchainTable(
  'diamond_global_pause_events',
  (t) => ({
    id: t.text().primaryKey(),
    paused: t.boolean().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const diamondMEVProtectionUpdatedEvents = onchainTable(
  'diamond_m_e_v_protection_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    min_reveal_delay: t.bigint().notNull(),
    commitment_threshold: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const diamondMarketPausedEvents = onchainTable(
  'diamond_market_paused_events',
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

export const diamondMarketUnpausedEvents = onchainTable(
  'diamond_market_unpaused_events',
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

export const diamondRateLimitsUpdatedEvents = onchainTable(
  'diamond_rate_limits_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    max_orders_per_block: t.bigint().notNull(),
    max_volume_per_block: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const diamondOrderCommittedEvents = onchainTable(
  'diamond_order_committed_events',
  (t) => ({
    id: t.text().primaryKey(),
    commitment_id: t.hex().notNull(),
    committer: t.hex().notNull(),
    commit_block: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    commitmentIdIdx: index().on(table.commitment_id),
    committerIdx: index().on(table.committer),
  }),
);

export const diamondOrderRevealedEvents = onchainTable(
  'diamond_order_revealed_events',
  (t) => ({
    id: t.text().primaryKey(),
    commitment_id: t.hex().notNull(),
    order_id: t.hex().notNull(),
    maker: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    commitmentIdIdx: index().on(table.commitment_id),
    orderIdIdx: index().on(table.order_id),
    makerIdx: index().on(table.maker),
  }),
);

export const diamondAuSysAdminRevokedEvents = onchainTable(
  'diamond_au_sys_admin_revoked_events',
  (t) => ({
    id: t.text().primaryKey(),
    admin: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    adminIdx: index().on(table.admin),
  }),
);

export const diamondAuSysAdminSetEvents = onchainTable(
  'diamond_au_sys_admin_set_events',
  (t) => ({
    id: t.text().primaryKey(),
    admin: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    adminIdx: index().on(table.admin),
  }),
);

export const diamondAuSysJourneyStatusUpdatedEvents = onchainTable(
  'diamond_au_sys_journey_status_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    journey_id: t.hex().notNull(),
    new_status: t.bigint().notNull(),
    sender: t.hex().notNull(),
    receiver: t.hex().notNull(),
    driver: t.hex().notNull(),
    bounty: t.bigint().notNull(),
    e_t_a: t.bigint().notNull(),
    journey_start: t.bigint().notNull(),
    journey_end: t.bigint().notNull(),
    start_lat: t.text().notNull(),
    start_lng: t.text().notNull(),
    end_lat: t.text().notNull(),
    end_lng: t.text().notNull(),
    start_name: t.text().notNull(),
    end_name: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    journeyIdIdx: index().on(table.journey_id),
    newStatusIdx: index().on(table.new_status),
  }),
);

export const diamondAuSysOrderCreatedEvents = onchainTable(
  'diamond_au_sys_order_created_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    buyer: t.hex().notNull(),
    seller: t.hex().notNull(),
    token: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    token_quantity: t.bigint().notNull(),
    price: t.bigint().notNull(),
    tx_fee: t.bigint().notNull(),
    current_status: t.bigint().notNull(),
    nodes: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    buyerIdx: index().on(table.buyer),
    sellerIdx: index().on(table.seller),
  }),
);

export const diamondAuSysOrderSettledEvents = onchainTable(
  'diamond_au_sys_order_settled_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
  }),
);

export const diamondAuSysOrderStatusUpdatedEvents = onchainTable(
  'diamond_au_sys_order_status_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    new_status: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
  }),
);

export const diamondDriverAssignedEvents = onchainTable(
  'diamond_driver_assigned_events',
  (t) => ({
    id: t.text().primaryKey(),
    journey_id: t.hex().notNull(),
    driver: t.hex().notNull(),
    sender: t.hex().notNull(),
    receiver: t.hex().notNull(),
    bounty: t.bigint().notNull(),
    e_t_a: t.bigint().notNull(),
    start_lat: t.text().notNull(),
    start_lng: t.text().notNull(),
    end_lat: t.text().notNull(),
    end_lng: t.text().notNull(),
    start_name: t.text().notNull(),
    end_name: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    journeyIdIdx: index().on(table.journey_id),
    driverIdx: index().on(table.driver),
  }),
);

export const diamondEmitSigEvents = onchainTable(
  'diamond_emit_sig_events',
  (t) => ({
    id: t.text().primaryKey(),
    user: t.hex().notNull(),
    event_id: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    eventIdIdx: index().on(table.event_id),
  }),
);

export const diamondJourneyCanceledEvents = onchainTable(
  'diamond_journey_canceled_events',
  (t) => ({
    id: t.text().primaryKey(),
    journey_id: t.hex().notNull(),
    sender: t.hex().notNull(),
    receiver: t.hex().notNull(),
    driver: t.hex().notNull(),
    refunded_amount: t.bigint().notNull(),
    bounty: t.bigint().notNull(),
    start_lat: t.text().notNull(),
    start_lng: t.text().notNull(),
    end_lat: t.text().notNull(),
    end_lng: t.text().notNull(),
    start_name: t.text().notNull(),
    end_name: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    journeyIdIdx: index().on(table.journey_id),
    senderIdx: index().on(table.sender),
  }),
);

export const diamondJourneyCreatedEvents = onchainTable(
  'diamond_journey_created_events',
  (t) => ({
    id: t.text().primaryKey(),
    journey_id: t.hex().notNull(),
    sender: t.hex().notNull(),
    receiver: t.hex().notNull(),
    driver: t.hex().notNull(),
    bounty: t.bigint().notNull(),
    e_t_a: t.bigint().notNull(),
    order_id: t.hex().notNull(),
    start_lat: t.text().notNull(),
    start_lng: t.text().notNull(),
    end_lat: t.text().notNull(),
    end_lng: t.text().notNull(),
    start_name: t.text().notNull(),
    end_name: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    journeyIdIdx: index().on(table.journey_id),
    senderIdx: index().on(table.sender),
    receiverIdx: index().on(table.receiver),
  }),
);

export const diamondNodeFeeBpsUpdatedEvents = onchainTable(
  'diamond_node_fee_bps_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    old_bps: t.bigint().notNull(),
    new_bps: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const diamondNodeFeeDistributedEvents = onchainTable(
  'diamond_node_fee_distributed_events',
  (t) => ({
    id: t.text().primaryKey(),
    node: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    nodeIdx: index().on(table.node),
  }),
);

export const diamondOrderQuantityCorrectedEvents = onchainTable(
  'diamond_order_quantity_corrected_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    old_quantity: t.bigint().notNull(),
    new_quantity: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
  }),
);

export const diamondP2POfferAcceptedEvents = onchainTable(
  'diamond_p2_p_offer_accepted_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    acceptor: t.hex().notNull(),
    is_seller_initiated: t.boolean().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    acceptorIdx: index().on(table.acceptor),
  }),
);

export const diamondP2POfferCanceledEvents = onchainTable(
  'diamond_p2_p_offer_canceled_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    creator: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    creatorIdx: index().on(table.creator),
  }),
);

export const diamondP2POfferCreatedEvents = onchainTable(
  'diamond_p2_p_offer_created_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    creator: t.hex().notNull(),
    is_seller_initiated: t.boolean().notNull(),
    token: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    token_quantity: t.bigint().notNull(),
    price: t.bigint().notNull(),
    target_counterparty: t.hex().notNull(),
    expires_at: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    creatorIdx: index().on(table.creator),
  }),
);

export const diamondSellerPaidEvents = onchainTable(
  'diamond_seller_paid_events',
  (t) => ({
    id: t.text().primaryKey(),
    seller: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    sellerIdx: index().on(table.seller),
  }),
);

export const diamondTokenDestinationPendingEvents = onchainTable(
  'diamond_token_destination_pending_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    buyer: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    quantity: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
    buyerIdx: index().on(table.buyer),
  }),
);

export const diamondTokenDestinationSelectedEvents = onchainTable(
  'diamond_token_destination_selected_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    destination: t.hex().notNull(),
    node_id: t.hex().notNull(),
    burned: t.boolean().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
  }),
);

export const diamondTreasuryFeeAccruedEvents = onchainTable(
  'diamond_treasury_fee_accrued_events',
  (t) => ({
    id: t.text().primaryKey(),
    order_id: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    orderIdIdx: index().on(table.order_id),
  }),
);

export const diamondTreasuryFeeBpsUpdatedEvents = onchainTable(
  'diamond_treasury_fee_bps_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    old_bps: t.bigint().notNull(),
    new_bps: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const diamondTreasuryFeeClaimedEvents = onchainTable(
  'diamond_treasury_fee_claimed_events',
  (t) => ({
    id: t.text().primaryKey(),
    to: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    toIdx: index().on(table.to),
  }),
);

export const diamondApprovalForAllEvents = onchainTable(
  'diamond_approval_for_all_events',
  (t) => ({
    id: t.text().primaryKey(),
    account: t.hex().notNull(),
    operator: t.hex().notNull(),
    approved: t.boolean().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    accountIdx: index().on(table.account),
    operatorIdx: index().on(table.operator),
  }),
);

export const diamondAssetAttributeAddedEvents = onchainTable(
  'diamond_asset_attribute_added_events',
  (t) => ({
    id: t.text().primaryKey(),
    hash: t.hex().notNull(),
    attribute_index: t.bigint().notNull(),
    name: t.text().notNull(),
    values: t.text().notNull(),
    description: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    hashIdx: index().on(table.hash),
    attributeIndexIdx: index().on(table.attribute_index),
  }),
);

export const diamondCustodyEstablishedEvents = onchainTable(
  'diamond_custody_established_events',
  (t) => ({
    id: t.text().primaryKey(),
    token_id: t.bigint().notNull(),
    custodian: t.hex().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    tokenIdIdx: index().on(table.token_id),
    custodianIdx: index().on(table.custodian),
  }),
);

export const diamondCustodyReleasedEvents = onchainTable(
  'diamond_custody_released_events',
  (t) => ({
    id: t.text().primaryKey(),
    token_id: t.bigint().notNull(),
    custodian: t.hex().notNull(),
    amount: t.bigint().notNull(),
    redeemer: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    tokenIdIdx: index().on(table.token_id),
    custodianIdx: index().on(table.custodian),
    redeemerIdx: index().on(table.redeemer),
  }),
);

export const diamondMintedAssetEvents = onchainTable(
  'diamond_minted_asset_events',
  (t) => ({
    id: t.text().primaryKey(),
    account: t.hex().notNull(),
    hash: t.hex().notNull(),
    token_id: t.bigint().notNull(),
    name: t.text().notNull(),
    asset_class: t.text().notNull(),
    class_name: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    accountIdx: index().on(table.account),
    hashIdx: index().on(table.hash),
    tokenIdIdx: index().on(table.token_id),
  }),
);

export const diamondSupportedClassAddedEvents = onchainTable(
  'diamond_supported_class_added_events',
  (t) => ({
    id: t.text().primaryKey(),
    class_name_hash: t.hex().notNull(),
    class_name: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    classNameHashIdx: index().on(table.class_name_hash),
  }),
);

export const diamondSupportedClassRemovedEvents = onchainTable(
  'diamond_supported_class_removed_events',
  (t) => ({
    id: t.text().primaryKey(),
    class_name_hash: t.hex().notNull(),
    class_name: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    classNameHashIdx: index().on(table.class_name_hash),
  }),
);

export const diamondTransferBatchEvents = onchainTable(
  'diamond_transfer_batch_events',
  (t) => ({
    id: t.text().primaryKey(),
    operator: t.hex().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    ids: t.text().notNull(),
    values: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    operatorIdx: index().on(table.operator),
    fromIdx: index().on(table.from),
    toIdx: index().on(table.to),
  }),
);

export const diamondTransferSingleEvents = onchainTable(
  'diamond_transfer_single_events',
  (t) => ({
    id: t.text().primaryKey(),
    operator: t.hex().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    event_id: t.bigint().notNull(),
    value: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    operatorIdx: index().on(table.operator),
    fromIdx: index().on(table.from),
    toIdx: index().on(table.to),
  }),
);

export const diamondURIEvents = onchainTable(
  'diamond_u_r_i_events',
  (t) => ({
    id: t.text().primaryKey(),
    value: t.text().notNull(),
    event_id: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    eventIdIdx: index().on(table.event_id),
  }),
);

// Export all tables
export const tables = {
  assets,
  orders,
  journeys,
  diamondClobApprovalGrantedEvents,
  diamondClobApprovalRevokedEvents,
  diamondInitializedEvents,
  diamondNodeAdminRevokedEvents,
  diamondNodeAdminSetEvents,
  diamondNodeCapacityUpdatedEvents,
  diamondNodeDeactivatedEvents,
  diamondNodeRegisteredEvents,
  diamondNodeRegistrarUpdatedEvents,
  diamondNodeSellOrderPlacedEvents,
  diamondNodeUpdatedEvents,
  diamondSupportedAssetAddedEvents,
  diamondSupportedAssetsUpdatedEvents,
  diamondSupportingDocumentAddedEvents,
  diamondSupportingDocumentRemovedEvents,
  diamondTokensDepositedToNodeEvents,
  diamondTokensMintedToNodeEvents,
  diamondTokensTransferredBetweenNodesEvents,
  diamondTokensWithdrawnFromNodeEvents,
  diamondUpdateLocationEvents,
  diamondUpdateOwnerEvents,
  diamondUpdateStatusEvents,
  diamondCLOBOrderCancelledEvents,
  diamondCLOBOrderFilledEvents,
  diamondCLOBTradeExecutedEvents,
  diamondMarketCreatedEvents,
  diamondOrderCreatedEvents,
  diamondOrderExpiredEvents,
  diamondOrderPlacedWithTokensEvents,
  diamondRouterOrderPlacedEvents,
  diamondBountyPaidEvents,
  diamondBridgeFeeRecipientUpdatedEvents,
  diamondBridgeOrderCancelledEvents,
  diamondFundsEscrowedEvents,
  diamondFundsRefundedEvents,
  diamondJourneyDriverAssignedEvents,
  diamondJourneyStatusUpdatedEvents,
  diamondLogisticsOrderCreatedEvents,
  diamondOrderSettledEvents,
  diamondTradeMatchedEvents,
  diamondUnifiedOrderCreatedEvents,
  diamondCollateralReturnedEvents,
  diamondCommodityStakedEvents,
  diamondCommodityUnstakedEvents,
  diamondConfigUpdatedEvents,
  diamondCustodyProofSubmittedEvents,
  diamondDeliveryConfirmedEvents,
  diamondDeliveryStartedEvents,
  diamondInsuranceUpdatedEvents,
  diamondOpportunityCancelledEvents,
  diamondOpportunityCompletedEvents,
  diamondOpportunityCreatedEvents,
  diamondOpportunityFundedEvents,
  diamondProcessingCompletedEvents,
  diamondProcessingStartedEvents,
  diamondProfitDistributedEvents,
  diamondSaleProceedsRecordedEvents,
  diamondTokenizationProofSubmittedEvents,
  diamondCircuitBreakerConfiguredEvents,
  diamondCircuitBreakerResetEvents,
  diamondCircuitBreakerTrippedEvents,
  diamondFeeRecipientUpdatedEvents,
  diamondFeesUpdatedEvents,
  diamondGlobalPauseEvents,
  diamondMEVProtectionUpdatedEvents,
  diamondMarketPausedEvents,
  diamondMarketUnpausedEvents,
  diamondRateLimitsUpdatedEvents,
  diamondOrderCommittedEvents,
  diamondOrderRevealedEvents,
  diamondAuSysAdminRevokedEvents,
  diamondAuSysAdminSetEvents,
  diamondAuSysJourneyStatusUpdatedEvents,
  diamondAuSysOrderCreatedEvents,
  diamondAuSysOrderSettledEvents,
  diamondAuSysOrderStatusUpdatedEvents,
  diamondDriverAssignedEvents,
  diamondEmitSigEvents,
  diamondJourneyCanceledEvents,
  diamondJourneyCreatedEvents,
  diamondNodeFeeBpsUpdatedEvents,
  diamondNodeFeeDistributedEvents,
  diamondOrderQuantityCorrectedEvents,
  diamondP2POfferAcceptedEvents,
  diamondP2POfferCanceledEvents,
  diamondP2POfferCreatedEvents,
  diamondSellerPaidEvents,
  diamondTokenDestinationPendingEvents,
  diamondTokenDestinationSelectedEvents,
  diamondTreasuryFeeAccruedEvents,
  diamondTreasuryFeeBpsUpdatedEvents,
  diamondTreasuryFeeClaimedEvents,
  diamondApprovalForAllEvents,
  diamondAssetAttributeAddedEvents,
  diamondCustodyEstablishedEvents,
  diamondCustodyReleasedEvents,
  diamondMintedAssetEvents,
  diamondSupportedClassAddedEvents,
  diamondSupportedClassRemovedEvents,
  diamondTransferBatchEvents,
  diamondTransferSingleEvents,
  diamondURIEvents,
};
