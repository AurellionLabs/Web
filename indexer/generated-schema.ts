// Auto-generated Ponder Schema - DO NOT EDIT
// Generated at: 2026-01-13T11:36:16.812Z
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
};
