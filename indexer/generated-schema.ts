// Auto-generated Ponder Schema - DO NOT EDIT
// Generated at: 2026-01-13T22:55:31.503Z
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

export const orderCancelledE3bbEvents = onchainTable(
  'order_cancelled_e3bb_events',
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

export const commodityStakedDbd4Events = onchainTable(
  'commodity_staked_dbd4_events',
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

export const commodityUnstaked_24b4Events = onchainTable(
  'commodity_unstaked_24b4_events',
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

export const deliveryConfirmed_1c0fEvents = onchainTable(
  'delivery_confirmed_1c0f_events',
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

export const deliveryStartedEc8dEvents = onchainTable(
  'delivery_started_ec8d_events',
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

export const operatorApprovedF338Events = onchainTable(
  'operator_approved_f338_events',
  (t) => ({
    id: t.text().primaryKey(),
    operator: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    operatorIdx: index().on(table.operator),
  }),
);

export const operatorRevokedA5f3Events = onchainTable(
  'operator_revoked_a5f3_events',
  (t) => ({
    id: t.text().primaryKey(),
    operator: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    operatorIdx: index().on(table.operator),
  }),
);

export const operatorSlashed_4674Events = onchainTable(
  'operator_slashed_4674_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    operator: t.hex().notNull(),
    slashed_amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
    operatorIdx: index().on(table.operator),
  }),
);

export const opportunityCancelledD395Events = onchainTable(
  'opportunity_cancelled_d395_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    reason: t.text().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const opportunityCreated_1e5cEvents = onchainTable(
  'opportunity_created_1e5c_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
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
    opportunityIdIdx: index().on(table.opportunity_id),
    operatorIdx: index().on(table.operator),
  }),
);

export const opportunityFundedEf29Events = onchainTable(
  'opportunity_funded_ef29_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    total_amount: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
  }),
);

export const paused_62e7Events = onchainTable('paused_62e7_events', (t) => ({
  id: t.text().primaryKey(),
  account: t.hex().notNull(),
  block_number: t.bigint().notNull(),
  block_timestamp: t.bigint().notNull(),
  transaction_hash: t.hex().notNull(),
}));

export const processingCompleted_85eeEvents = onchainTable(
  'processing_completed_85ee_events',
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

export const processingStartedCc01Events = onchainTable(
  'processing_started_cc01_events',
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

export const profitDistributed_275dEvents = onchainTable(
  'profit_distributed_275d_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    staker: t.hex().notNull(),
    principal: t.bigint().notNull(),
    profit: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
    stakerIdx: index().on(table.staker),
  }),
);

export const saleOrderCreatedFd82Events = onchainTable(
  'sale_order_created_fd82_events',
  (t) => ({
    id: t.text().primaryKey(),
    opportunity_id: t.hex().notNull(),
    clob_order_id: t.hex().notNull(),
    amount: t.bigint().notNull(),
    price: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    opportunityIdIdx: index().on(table.opportunity_id),
    clobOrderIdIdx: index().on(table.clob_order_id),
  }),
);

export const unpaused_5db9Events = onchainTable(
  'unpaused_5db9_events',
  (t) => ({
    id: t.text().primaryKey(),
    account: t.hex().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
);

export const approvalForAll_1730Events = onchainTable(
  'approval_for_all_1730_events',
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

export const assetAttributeAddedEe76Events = onchainTable(
  'asset_attribute_added_ee76_events',
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

export const mintedAssetDa6fEvents = onchainTable(
  'minted_asset_da6f_events',
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

export const transferBatch_4a39Events = onchainTable(
  'transfer_batch_4a39_events',
  (t) => ({
    id: t.text().primaryKey(),
    operator: t.hex().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    ids: t.bigint().notNull(),
    values: t.bigint().notNull(),
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

export const transferSingleC3d5Events = onchainTable(
  'transfer_single_c3d5_events',
  (t) => ({
    id: t.text().primaryKey(),
    operator: t.hex().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    id: t.bigint().notNull(),
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

export const uRI_6bb7Events = onchainTable(
  'u_r_i_6bb7_events',
  (t) => ({
    id: t.text().primaryKey(),
    value: t.text().notNull(),
    id: t.bigint().notNull(),
    block_number: t.bigint().notNull(),
    block_timestamp: t.bigint().notNull(),
    transaction_hash: t.hex().notNull(),
  }),
  (table) => ({
    idIdx: index().on(table.id),
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
  bountyPaid_8e7bEvents,
  feeRecipientUpdatedAaebEvents,
  journeyStatusUpdatedF7daEvents,
  logisticsOrderCreated_9c83Events,
  orderCancelledE3bbEvents,
  orderSettledE726Events,
  tradeMatched_51d0Events,
  unifiedOrderCreatedC8b6Events,
  rewardRateUpdatedC390Events,
  rewardsClaimedFc30Events,
  staked_9e71Events,
  withdrawn_7084Events,
  diamondCutE785Events,
  ownershipTransferred_8be0Events,
  commodityStakedDbd4Events,
  commodityUnstaked_24b4Events,
  deliveryConfirmed_1c0fEvents,
  deliveryStartedEc8dEvents,
  operatorApprovedF338Events,
  operatorRevokedA5f3Events,
  operatorSlashed_4674Events,
  opportunityCancelledD395Events,
  opportunityCreated_1e5cEvents,
  opportunityFundedEf29Events,
  paused_62e7Events,
  processingCompleted_85eeEvents,
  processingStartedCc01Events,
  profitDistributed_275dEvents,
  saleOrderCreatedFd82Events,
  unpaused_5db9Events,
  approvalForAll_1730Events,
  assetAttributeAddedEe76Events,
  mintedAssetDa6fEvents,
  transferBatch_4a39Events,
  transferSingleC3d5Events,
  uRI_6bb7Events,
};
