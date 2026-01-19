// Auto-generated Ponder Schema - DO NOT EDIT
// Generated at: 2026-01-19T23:20:26.154Z
// 
// This schema is derived from Diamond facet events.
// Regenerate with: npm run generate:indexer

import { onchainTable, index } from '@ponder/core';

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
  })
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
  })
);

export const diamondInitializedEvents = onchainTable(
  'diamond_initialized_events',
  (t) => ({
    id: t.text().primaryKey(),
    version: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  })
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
  })
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
  })
);

export const diamondNodeCapacityUpdatedEvents = onchainTable(
  'diamond_node_capacity_updated_events',
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
);

export const diamondAusysOrderFilledEvents = onchainTable(
  'diamond_ausys_order_filled_events',
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
  })
);

export const diamondMatchingOrderCancelledEvents = onchainTable(
  'diamond_matching_order_cancelled_events',
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
  })
);

export const diamondTradeExecutedEvents = onchainTable(
  'diamond_trade_executed_events',
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
  })
);

export const diamondOrderRoutedEvents = onchainTable(
  'diamond_order_routed_events',
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
  })
);

export const diamondRouterOrderCancelledEvents = onchainTable(
  'diamond_router_order_cancelled_events',
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
  })
);

export const diamondRouterOrderCreatedEvents = onchainTable(
  'diamond_router_order_created_events',
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
  })
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
  })
);

export const diamondRouterTradeExecutedEvents = onchainTable(
  'diamond_router_trade_executed_events',
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
  })
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
  })
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
  })
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
  })
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
  })
);

export const diamondLogisticsOrderCreatedEvents = onchainTable(
  'diamond_logistics_order_created_events',
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
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
  })
);

export const diamondOperatorApprovedEvents = onchainTable(
  'diamond_operator_approved_events',
  (t) => ({
    id: t.text().primaryKey(),
    operator: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    operatorIdx: index().on(table.operator),
  })
);

export const diamondOperatorReputationUpdatedEvents = onchainTable(
  'diamond_operator_reputation_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    operator: t.hex().notNull(),
    old_reputation: t.bigint().notNull(),
    new_reputation: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    operatorIdx: index().on(table.operator),
  })
);

export const diamondOperatorRevokedEvents = onchainTable(
  'diamond_operator_revoked_events',
  (t) => ({
    id: t.text().primaryKey(),
    operator: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    operatorIdx: index().on(table.operator),
  })
);

export const diamondOperatorSlashedEvents = onchainTable(
  'diamond_operator_slashed_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    operator: t.hex().notNull(),
    collateral_token: t.hex().notNull(),
    collateral_token_id: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
    operatorIdx: index().on(table.operator),
  })
);

export const diamondOperatorStatsUpdatedEvents = onchainTable(
  'diamond_operator_stats_updated_events',
  (t) => ({
    id: t.text().primaryKey(),
    operator: t.hex().notNull(),
    successful_ops: t.bigint().notNull(),
    total_value_processed: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    operatorIdx: index().on(table.operator),
  })
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
  })
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
  })
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
  })
);

export const diamondEmergencyActionCancelledEvents = onchainTable(
  'diamond_emergency_action_cancelled_events',
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
  })
);

export const diamondEmergencyActionExecutedEvents = onchainTable(
  'diamond_emergency_action_executed_events',
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
  })
);

export const diamondEmergencyActionInitiatedEvents = onchainTable(
  'diamond_emergency_action_initiated_events',
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
  })
);

export const diamondEmergencyWithdrawalEvents = onchainTable(
  'diamond_emergency_withdrawal_events',
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
  })
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
  })
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
  })
);

export const diamondGlobalPauseEvents = onchainTable(
  'diamond_global_pause_events',
  (t) => ({
    id: t.text().primaryKey(),
    paused: t.boolean().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  })
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
  })
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
  })
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
  })
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
  })
);

export const diamondDiamondCutEvents = onchainTable(
  'diamond_diamond_cut_events',
  (t) => ({
    id: t.text().primaryKey(),
    diamond_cut: t.text().notNull(),
    init: t.hex().notNull(),
    calldata: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  })
);

export const diamondOwnershipTransferredEvents = onchainTable(
  'diamond_ownership_transferred_events',
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
  })
);

// Export all tables
export const tables = {
  diamondClobApprovalGrantedEvents,
  diamondClobApprovalRevokedEvents,
  diamondInitializedEvents,
  diamondNodeAdminRevokedEvents,
  diamondNodeAdminSetEvents,
  diamondNodeCapacityUpdatedEvents,
  diamondNodeDeactivatedEvents,
  diamondNodeRegisteredEvents,
  diamondNodeSellOrderPlacedEvents,
  diamondNodeUpdatedEvents,
  diamondSupportedAssetAddedEvents,
  diamondSupportedAssetsUpdatedEvents,
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
  diamondAusysOrderFilledEvents,
  diamondMatchingOrderCancelledEvents,
  diamondTradeExecutedEvents,
  diamondOrderRoutedEvents,
  diamondRouterOrderCancelledEvents,
  diamondRouterOrderCreatedEvents,
  diamondRouterOrderPlacedEvents,
  diamondRouterTradeExecutedEvents,
  diamondBountyPaidEvents,
  diamondBridgeFeeRecipientUpdatedEvents,
  diamondBridgeOrderCancelledEvents,
  diamondJourneyStatusUpdatedEvents,
  diamondLogisticsOrderCreatedEvents,
  diamondOrderSettledEvents,
  diamondTradeMatchedEvents,
  diamondUnifiedOrderCreatedEvents,
  diamondCollateralReturnedEvents,
  diamondCommodityStakedEvents,
  diamondCommodityUnstakedEvents,
  diamondConfigUpdatedEvents,
  diamondDeliveryConfirmedEvents,
  diamondDeliveryStartedEvents,
  diamondOpportunityCancelledEvents,
  diamondOpportunityCompletedEvents,
  diamondOpportunityCreatedEvents,
  diamondOpportunityFundedEvents,
  diamondProcessingCompletedEvents,
  diamondProcessingStartedEvents,
  diamondProfitDistributedEvents,
  diamondSaleProceedsRecordedEvents,
  diamondOperatorApprovedEvents,
  diamondOperatorReputationUpdatedEvents,
  diamondOperatorRevokedEvents,
  diamondOperatorSlashedEvents,
  diamondOperatorStatsUpdatedEvents,
  diamondCircuitBreakerConfiguredEvents,
  diamondCircuitBreakerResetEvents,
  diamondCircuitBreakerTrippedEvents,
  diamondEmergencyActionCancelledEvents,
  diamondEmergencyActionExecutedEvents,
  diamondEmergencyActionInitiatedEvents,
  diamondEmergencyWithdrawalEvents,
  diamondFeeRecipientUpdatedEvents,
  diamondFeesUpdatedEvents,
  diamondGlobalPauseEvents,
  diamondMEVProtectionUpdatedEvents,
  diamondMarketPausedEvents,
  diamondMarketUnpausedEvents,
  diamondRateLimitsUpdatedEvents,
  diamondDiamondCutEvents,
  diamondOwnershipTransferredEvents,
};
