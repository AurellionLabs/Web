// Auto-generated GraphQL types - DO NOT EDIT
// Generated at: 2026-02-04T23:17:32.252Z
//
// This file provides type-safe GraphQL query helpers for Ponder tables.
// All table names and field names are derived from the schema generator.
// Regenerate with: npm run generate:indexer

// ============================================================================
// TABLE NAME CONSTANTS
// ============================================================================
// Use these constants in GraphQL queries to ensure correct table names

export const TABLE_DIAMOND_CLOB_APPROVAL_GRANTED_EVENTS =
  'diamondClobApprovalGrantedEventss' as const;
export const TABLE_DIAMOND_CLOB_APPROVAL_REVOKED_EVENTS =
  'diamondClobApprovalRevokedEventss' as const;
export const TABLE_DIAMOND_INITIALIZED_EVENTS =
  'diamondInitializedEventss' as const;
export const TABLE_DIAMOND_NODE_ADMIN_REVOKED_EVENTS =
  'diamondNodeAdminRevokedEventss' as const;
export const TABLE_DIAMOND_NODE_ADMIN_SET_EVENTS =
  'diamondNodeAdminSetEventss' as const;
export const TABLE_DIAMOND_NODE_CAPACITY_UPDATED_EVENTS =
  'diamondNodeCapacityUpdatedEventss' as const;
export const TABLE_DIAMOND_NODE_DEACTIVATED_EVENTS =
  'diamondNodeDeactivatedEventss' as const;
export const TABLE_DIAMOND_NODE_REGISTERED_EVENTS =
  'diamondNodeRegisteredEventss' as const;
export const TABLE_DIAMOND_NODE_SELL_ORDER_PLACED_EVENTS =
  'diamondNodeSellOrderPlacedEventss' as const;
export const TABLE_DIAMOND_NODE_UPDATED_EVENTS =
  'diamondNodeUpdatedEventss' as const;
export const TABLE_DIAMOND_SUPPORTED_ASSET_ADDED_EVENTS =
  'diamondSupportedAssetAddedEventss' as const;
export const TABLE_DIAMOND_SUPPORTED_ASSETS_UPDATED_EVENTS =
  'diamondSupportedAssetsUpdatedEventss' as const;
export const TABLE_DIAMOND_SUPPORTING_DOCUMENT_ADDED_EVENTS =
  'diamondSupportingDocumentAddedEventss' as const;
export const TABLE_DIAMOND_SUPPORTING_DOCUMENT_REMOVED_EVENTS =
  'diamondSupportingDocumentRemovedEventss' as const;
export const TABLE_DIAMOND_TOKENS_DEPOSITED_TO_NODE_EVENTS =
  'diamondTokensDepositedToNodeEventss' as const;
export const TABLE_DIAMOND_TOKENS_MINTED_TO_NODE_EVENTS =
  'diamondTokensMintedToNodeEventss' as const;
export const TABLE_DIAMOND_TOKENS_TRANSFERRED_BETWEEN_NODES_EVENTS =
  'diamondTokensTransferredBetweenNodesEventss' as const;
export const TABLE_DIAMOND_TOKENS_WITHDRAWN_FROM_NODE_EVENTS =
  'diamondTokensWithdrawnFromNodeEventss' as const;
export const TABLE_DIAMOND_UPDATE_LOCATION_EVENTS =
  'diamondUpdateLocationEventss' as const;
export const TABLE_DIAMOND_UPDATE_OWNER_EVENTS =
  'diamondUpdateOwnerEventss' as const;
export const TABLE_DIAMOND_UPDATE_STATUS_EVENTS =
  'diamondUpdateStatusEventss' as const;
export const TABLE_DIAMOND_C_L_O_B_ORDER_CANCELLED_EVENTS =
  'diamondCLOBOrderCancelledEventss' as const;
export const TABLE_DIAMOND_C_L_O_B_ORDER_FILLED_EVENTS =
  'diamondCLOBOrderFilledEventss' as const;
export const TABLE_DIAMOND_C_L_O_B_TRADE_EXECUTED_EVENTS =
  'diamondCLOBTradeExecutedEventss' as const;
export const TABLE_DIAMOND_MARKET_CREATED_EVENTS =
  'diamondMarketCreatedEventss' as const;
export const TABLE_DIAMOND_ORDER_CREATED_EVENTS =
  'diamondOrderCreatedEventss' as const;
export const TABLE_DIAMOND_ORDER_EXPIRED_EVENTS =
  'diamondOrderExpiredEventss' as const;
export const TABLE_DIAMOND_ORDER_PLACED_WITH_TOKENS_EVENTS =
  'diamondOrderPlacedWithTokensEventss' as const;
export const TABLE_DIAMOND_AUSYS_ORDER_FILLED_EVENTS =
  'diamondAusysOrderFilledEventss' as const;
export const TABLE_DIAMOND_MATCHING_ORDER_CANCELLED_EVENTS =
  'diamondMatchingOrderCancelledEventss' as const;
export const TABLE_DIAMOND_TRADE_EXECUTED_EVENTS =
  'diamondTradeExecutedEventss' as const;
export const TABLE_DIAMOND_ORDER_ROUTED_EVENTS =
  'diamondOrderRoutedEventss' as const;
export const TABLE_DIAMOND_ROUTER_ORDER_CANCELLED_EVENTS =
  'diamondRouterOrderCancelledEventss' as const;
export const TABLE_DIAMOND_ROUTER_ORDER_CREATED_EVENTS =
  'diamondRouterOrderCreatedEventss' as const;
export const TABLE_DIAMOND_ROUTER_ORDER_PLACED_EVENTS =
  'diamondRouterOrderPlacedEventss' as const;
export const TABLE_DIAMOND_ROUTER_TRADE_EXECUTED_EVENTS =
  'diamondRouterTradeExecutedEventss' as const;
export const TABLE_DIAMOND_BOUNTY_PAID_EVENTS =
  'diamondBountyPaidEventss' as const;
export const TABLE_DIAMOND_BRIDGE_FEE_RECIPIENT_UPDATED_EVENTS =
  'diamondBridgeFeeRecipientUpdatedEventss' as const;
export const TABLE_DIAMOND_BRIDGE_ORDER_CANCELLED_EVENTS =
  'diamondBridgeOrderCancelledEventss' as const;
export const TABLE_DIAMOND_JOURNEY_STATUS_UPDATED_EVENTS =
  'diamondJourneyStatusUpdatedEventss' as const;
export const TABLE_DIAMOND_LOGISTICS_ORDER_CREATED_EVENTS =
  'diamondLogisticsOrderCreatedEventss' as const;
export const TABLE_DIAMOND_ORDER_SETTLED_EVENTS =
  'diamondOrderSettledEventss' as const;
export const TABLE_DIAMOND_TRADE_MATCHED_EVENTS =
  'diamondTradeMatchedEventss' as const;
export const TABLE_DIAMOND_UNIFIED_ORDER_CREATED_EVENTS =
  'diamondUnifiedOrderCreatedEventss' as const;
export const TABLE_DIAMOND_COLLATERAL_RETURNED_EVENTS =
  'diamondCollateralReturnedEventss' as const;
export const TABLE_DIAMOND_COMMODITY_STAKED_EVENTS =
  'diamondCommodityStakedEventss' as const;
export const TABLE_DIAMOND_COMMODITY_UNSTAKED_EVENTS =
  'diamondCommodityUnstakedEventss' as const;
export const TABLE_DIAMOND_CONFIG_UPDATED_EVENTS =
  'diamondConfigUpdatedEventss' as const;
export const TABLE_DIAMOND_CUSTODY_PROOF_SUBMITTED_EVENTS =
  'diamondCustodyProofSubmittedEventss' as const;
export const TABLE_DIAMOND_DELIVERY_CONFIRMED_EVENTS =
  'diamondDeliveryConfirmedEventss' as const;
export const TABLE_DIAMOND_DELIVERY_STARTED_EVENTS =
  'diamondDeliveryStartedEventss' as const;
export const TABLE_DIAMOND_INSURANCE_UPDATED_EVENTS =
  'diamondInsuranceUpdatedEventss' as const;
export const TABLE_DIAMOND_OPPORTUNITY_CANCELLED_EVENTS =
  'diamondOpportunityCancelledEventss' as const;
export const TABLE_DIAMOND_OPPORTUNITY_COMPLETED_EVENTS =
  'diamondOpportunityCompletedEventss' as const;
export const TABLE_DIAMOND_OPPORTUNITY_CREATED_EVENTS =
  'diamondOpportunityCreatedEventss' as const;
export const TABLE_DIAMOND_OPPORTUNITY_FUNDED_EVENTS =
  'diamondOpportunityFundedEventss' as const;
export const TABLE_DIAMOND_PROCESSING_COMPLETED_EVENTS =
  'diamondProcessingCompletedEventss' as const;
export const TABLE_DIAMOND_PROCESSING_STARTED_EVENTS =
  'diamondProcessingStartedEventss' as const;
export const TABLE_DIAMOND_PROFIT_DISTRIBUTED_EVENTS =
  'diamondProfitDistributedEventss' as const;
export const TABLE_DIAMOND_SALE_PROCEEDS_RECORDED_EVENTS =
  'diamondSaleProceedsRecordedEventss' as const;
export const TABLE_DIAMOND_TOKENIZATION_PROOF_SUBMITTED_EVENTS =
  'diamondTokenizationProofSubmittedEventss' as const;
export const TABLE_DIAMOND_OPERATOR_APPROVED_EVENTS =
  'diamondOperatorApprovedEventss' as const;
export const TABLE_DIAMOND_OPERATOR_REPUTATION_UPDATED_EVENTS =
  'diamondOperatorReputationUpdatedEventss' as const;
export const TABLE_DIAMOND_OPERATOR_REVOKED_EVENTS =
  'diamondOperatorRevokedEventss' as const;
export const TABLE_DIAMOND_OPERATOR_SLASHED_EVENTS =
  'diamondOperatorSlashedEventss' as const;
export const TABLE_DIAMOND_OPERATOR_STATS_UPDATED_EVENTS =
  'diamondOperatorStatsUpdatedEventss' as const;
export const TABLE_DIAMOND_CIRCUIT_BREAKER_CONFIGURED_EVENTS =
  'diamondCircuitBreakerConfiguredEventss' as const;
export const TABLE_DIAMOND_CIRCUIT_BREAKER_RESET_EVENTS =
  'diamondCircuitBreakerResetEventss' as const;
export const TABLE_DIAMOND_CIRCUIT_BREAKER_TRIPPED_EVENTS =
  'diamondCircuitBreakerTrippedEventss' as const;
export const TABLE_DIAMOND_EMERGENCY_ACTION_CANCELLED_EVENTS =
  'diamondEmergencyActionCancelledEventss' as const;
export const TABLE_DIAMOND_EMERGENCY_ACTION_EXECUTED_EVENTS =
  'diamondEmergencyActionExecutedEventss' as const;
export const TABLE_DIAMOND_EMERGENCY_ACTION_INITIATED_EVENTS =
  'diamondEmergencyActionInitiatedEventss' as const;
export const TABLE_DIAMOND_EMERGENCY_WITHDRAWAL_EVENTS =
  'diamondEmergencyWithdrawalEventss' as const;
export const TABLE_DIAMOND_FEE_RECIPIENT_UPDATED_EVENTS =
  'diamondFeeRecipientUpdatedEventss' as const;
export const TABLE_DIAMOND_FEES_UPDATED_EVENTS =
  'diamondFeesUpdatedEventss' as const;
export const TABLE_DIAMOND_GLOBAL_PAUSE_EVENTS =
  'diamondGlobalPauseEventss' as const;
export const TABLE_DIAMOND_M_E_V_PROTECTION_UPDATED_EVENTS =
  'diamondMEVProtectionUpdatedEventss' as const;
export const TABLE_DIAMOND_MARKET_PAUSED_EVENTS =
  'diamondMarketPausedEventss' as const;
export const TABLE_DIAMOND_MARKET_UNPAUSED_EVENTS =
  'diamondMarketUnpausedEventss' as const;
export const TABLE_DIAMOND_RATE_LIMITS_UPDATED_EVENTS =
  'diamondRateLimitsUpdatedEventss' as const;
export const TABLE_DIAMOND_DIAMOND_CUT_EVENTS =
  'diamondDiamondCutEventss' as const;
export const TABLE_DIAMOND_OWNERSHIP_TRANSFERRED_EVENTS =
  'diamondOwnershipTransferredEventss' as const;
export const TABLE_DIAMOND_AU_SYS_ADMIN_REVOKED_EVENTS =
  'diamondAuSysAdminRevokedEventss' as const;
export const TABLE_DIAMOND_AU_SYS_ADMIN_SET_EVENTS =
  'diamondAuSysAdminSetEventss' as const;
export const TABLE_DIAMOND_AU_SYS_JOURNEY_STATUS_UPDATED_EVENTS =
  'diamondAuSysJourneyStatusUpdatedEventss' as const;
export const TABLE_DIAMOND_AU_SYS_ORDER_CREATED_EVENTS =
  'diamondAuSysOrderCreatedEventss' as const;
export const TABLE_DIAMOND_AU_SYS_ORDER_SETTLED_EVENTS =
  'diamondAuSysOrderSettledEventss' as const;
export const TABLE_DIAMOND_AU_SYS_ORDER_STATUS_UPDATED_EVENTS =
  'diamondAuSysOrderStatusUpdatedEventss' as const;
export const TABLE_DIAMOND_DRIVER_ASSIGNED_EVENTS =
  'diamondDriverAssignedEventss' as const;
export const TABLE_DIAMOND_EMIT_SIG_EVENTS = 'diamondEmitSigEventss' as const;
export const TABLE_DIAMOND_FUNDS_ESCROWED_EVENTS =
  'diamondFundsEscrowedEventss' as const;
export const TABLE_DIAMOND_FUNDS_REFUNDED_EVENTS =
  'diamondFundsRefundedEventss' as const;
export const TABLE_DIAMOND_JOURNEY_CANCELED_EVENTS =
  'diamondJourneyCanceledEventss' as const;
export const TABLE_DIAMOND_JOURNEY_CREATED_EVENTS =
  'diamondJourneyCreatedEventss' as const;
export const TABLE_DIAMOND_NODE_FEE_DISTRIBUTED_EVENTS =
  'diamondNodeFeeDistributedEventss' as const;
export const TABLE_DIAMOND_P2_P_OFFER_ACCEPTED_EVENTS =
  'diamondP2POfferAcceptedEventss' as const;
export const TABLE_DIAMOND_P2_P_OFFER_CANCELED_EVENTS =
  'diamondP2POfferCanceledEventss' as const;
export const TABLE_DIAMOND_P2_P_OFFER_CREATED_EVENTS =
  'diamondP2POfferCreatedEventss' as const;
export const TABLE_DIAMOND_SELLER_PAID_EVENTS =
  'diamondSellerPaidEventss' as const;
export const TABLE_DIAMOND_APPROVAL_FOR_ALL_EVENTS =
  'diamondApprovalForAllEventss' as const;
export const TABLE_DIAMOND_ASSET_ATTRIBUTE_ADDED_EVENTS =
  'diamondAssetAttributeAddedEventss' as const;
export const TABLE_DIAMOND_CUSTODY_ESTABLISHED_EVENTS =
  'diamondCustodyEstablishedEventss' as const;
export const TABLE_DIAMOND_CUSTODY_RELEASED_EVENTS =
  'diamondCustodyReleasedEventss' as const;
export const TABLE_DIAMOND_MINTED_ASSET_EVENTS =
  'diamondMintedAssetEventss' as const;
export const TABLE_DIAMOND_SUPPORTED_CLASS_ADDED_EVENTS =
  'diamondSupportedClassAddedEventss' as const;
export const TABLE_DIAMOND_SUPPORTED_CLASS_REMOVED_EVENTS =
  'diamondSupportedClassRemovedEventss' as const;
export const TABLE_DIAMOND_TRANSFER_BATCH_EVENTS =
  'diamondTransferBatchEventss' as const;
export const TABLE_DIAMOND_TRANSFER_SINGLE_EVENTS =
  'diamondTransferSingleEventss' as const;
export const TABLE_DIAMOND_U_R_I_EVENTS = 'diamondURIEventss' as const;

// All valid table names for validation
export const VALID_TABLE_NAMES = [
  'diamondClobApprovalGrantedEventss',
  'diamondClobApprovalRevokedEventss',
  'diamondInitializedEventss',
  'diamondNodeAdminRevokedEventss',
  'diamondNodeAdminSetEventss',
  'diamondNodeCapacityUpdatedEventss',
  'diamondNodeDeactivatedEventss',
  'diamondNodeRegisteredEventss',
  'diamondNodeSellOrderPlacedEventss',
  'diamondNodeUpdatedEventss',
  'diamondSupportedAssetAddedEventss',
  'diamondSupportedAssetsUpdatedEventss',
  'diamondSupportingDocumentAddedEventss',
  'diamondSupportingDocumentRemovedEventss',
  'diamondTokensDepositedToNodeEventss',
  'diamondTokensMintedToNodeEventss',
  'diamondTokensTransferredBetweenNodesEventss',
  'diamondTokensWithdrawnFromNodeEventss',
  'diamondUpdateLocationEventss',
  'diamondUpdateOwnerEventss',
  'diamondUpdateStatusEventss',
  'diamondCLOBOrderCancelledEventss',
  'diamondCLOBOrderFilledEventss',
  'diamondCLOBTradeExecutedEventss',
  'diamondMarketCreatedEventss',
  'diamondOrderCreatedEventss',
  'diamondOrderExpiredEventss',
  'diamondOrderPlacedWithTokensEventss',
  'diamondAusysOrderFilledEventss',
  'diamondMatchingOrderCancelledEventss',
  'diamondTradeExecutedEventss',
  'diamondOrderRoutedEventss',
  'diamondRouterOrderCancelledEventss',
  'diamondRouterOrderCreatedEventss',
  'diamondRouterOrderPlacedEventss',
  'diamondRouterTradeExecutedEventss',
  'diamondBountyPaidEventss',
  'diamondBridgeFeeRecipientUpdatedEventss',
  'diamondBridgeOrderCancelledEventss',
  'diamondJourneyStatusUpdatedEventss',
  'diamondLogisticsOrderCreatedEventss',
  'diamondOrderSettledEventss',
  'diamondTradeMatchedEventss',
  'diamondUnifiedOrderCreatedEventss',
  'diamondCollateralReturnedEventss',
  'diamondCommodityStakedEventss',
  'diamondCommodityUnstakedEventss',
  'diamondConfigUpdatedEventss',
  'diamondCustodyProofSubmittedEventss',
  'diamondDeliveryConfirmedEventss',
  'diamondDeliveryStartedEventss',
  'diamondInsuranceUpdatedEventss',
  'diamondOpportunityCancelledEventss',
  'diamondOpportunityCompletedEventss',
  'diamondOpportunityCreatedEventss',
  'diamondOpportunityFundedEventss',
  'diamondProcessingCompletedEventss',
  'diamondProcessingStartedEventss',
  'diamondProfitDistributedEventss',
  'diamondSaleProceedsRecordedEventss',
  'diamondTokenizationProofSubmittedEventss',
  'diamondOperatorApprovedEventss',
  'diamondOperatorReputationUpdatedEventss',
  'diamondOperatorRevokedEventss',
  'diamondOperatorSlashedEventss',
  'diamondOperatorStatsUpdatedEventss',
  'diamondCircuitBreakerConfiguredEventss',
  'diamondCircuitBreakerResetEventss',
  'diamondCircuitBreakerTrippedEventss',
  'diamondEmergencyActionCancelledEventss',
  'diamondEmergencyActionExecutedEventss',
  'diamondEmergencyActionInitiatedEventss',
  'diamondEmergencyWithdrawalEventss',
  'diamondFeeRecipientUpdatedEventss',
  'diamondFeesUpdatedEventss',
  'diamondGlobalPauseEventss',
  'diamondMEVProtectionUpdatedEventss',
  'diamondMarketPausedEventss',
  'diamondMarketUnpausedEventss',
  'diamondRateLimitsUpdatedEventss',
  'diamondDiamondCutEventss',
  'diamondOwnershipTransferredEventss',
  'diamondAuSysAdminRevokedEventss',
  'diamondAuSysAdminSetEventss',
  'diamondAuSysJourneyStatusUpdatedEventss',
  'diamondAuSysOrderCreatedEventss',
  'diamondAuSysOrderSettledEventss',
  'diamondAuSysOrderStatusUpdatedEventss',
  'diamondDriverAssignedEventss',
  'diamondEmitSigEventss',
  'diamondFundsEscrowedEventss',
  'diamondFundsRefundedEventss',
  'diamondJourneyCanceledEventss',
  'diamondJourneyCreatedEventss',
  'diamondNodeFeeDistributedEventss',
  'diamondP2POfferAcceptedEventss',
  'diamondP2POfferCanceledEventss',
  'diamondP2POfferCreatedEventss',
  'diamondSellerPaidEventss',
  'diamondApprovalForAllEventss',
  'diamondAssetAttributeAddedEventss',
  'diamondCustodyEstablishedEventss',
  'diamondCustodyReleasedEventss',
  'diamondMintedAssetEventss',
  'diamondSupportedClassAddedEventss',
  'diamondSupportedClassRemovedEventss',
  'diamondTransferBatchEventss',
  'diamondTransferSingleEventss',
  'diamondURIEventss',
] as const;

export type ValidTableName = (typeof VALID_TABLE_NAMES)[number];

// ============================================================================
// EVENT RESPONSE TYPES
// ============================================================================
// These types match the exact field names returned by Ponder GraphQL

export interface diamondClobApprovalGrantedEvent {
  id: string;
  node_hash: string;
  clob_address: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondClobApprovalRevokedEvent {
  id: string;
  node_hash: string;
  clob_address: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondInitializedEvent {
  id: string;
  version: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondNodeAdminRevokedEvent {
  id: string;
  admin: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondNodeAdminSetEvent {
  id: string;
  admin: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondNodeCapacityUpdatedEvent {
  id: string;
  node_hash: string;
  quantities: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondNodeDeactivatedEvent {
  id: string;
  node_hash: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondNodeRegisteredEvent {
  id: string;
  node_hash: string;
  owner: string;
  node_type: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondNodeSellOrderPlacedEvent {
  id: string;
  node_hash: string;
  token_id: string;
  quote_token: string;
  price: string;
  amount: string;
  order_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondNodeUpdatedEvent {
  id: string;
  node_hash: string;
  node_type: string;
  capacity: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondSupportedAssetAddedEvent {
  id: string;
  node_hash: string;
  token: string;
  token_id: string;
  price: string;
  capacity: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondSupportedAssetsUpdatedEvent {
  id: string;
  node_hash: string;
  count: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondSupportingDocumentAddedEvent {
  id: string;
  node_hash: string;
  url: string;
  title: string;
  description: string;
  document_type: string;
  is_frozen: boolean;
  timestamp: string;
  added_by: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondSupportingDocumentRemovedEvent {
  id: string;
  node_hash: string;
  url: string;
  timestamp: string;
  removed_by: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondTokensDepositedToNodeEvent {
  id: string;
  node_hash: string;
  token_id: string;
  amount: string;
  depositor: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondTokensMintedToNodeEvent {
  id: string;
  node_hash: string;
  token_id: string;
  amount: string;
  minter: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondTokensTransferredBetweenNodesEvent {
  id: string;
  from_node: string;
  to_node: string;
  token_id: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondTokensWithdrawnFromNodeEvent {
  id: string;
  node_hash: string;
  token_id: string;
  amount: string;
  recipient: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondUpdateLocationEvent {
  id: string;
  address_name: string;
  lat: string;
  lng: string;
  node: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondUpdateOwnerEvent {
  id: string;
  owner: string;
  node: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondUpdateStatusEvent {
  id: string;
  status: string;
  node: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCLOBOrderCancelledEvent {
  id: string;
  order_id: string;
  maker: string;
  remaining_amount: string;
  reason: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCLOBOrderFilledEvent {
  id: string;
  order_id: string;
  trade_id: string;
  fill_amount: string;
  fill_price: string;
  remaining_amount: string;
  cumulative_filled: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCLOBTradeExecutedEvent {
  id: string;
  trade_id: string;
  taker_order_id: string;
  maker_order_id: string;
  taker: string;
  maker: string;
  market_id: string;
  price: string;
  amount: string;
  quote_amount: string;
  taker_fee: string;
  maker_fee: string;
  timestamp: string;
  taker_is_buy: boolean;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondMarketCreatedEvent {
  id: string;
  market_id: string;
  base_token: string;
  base_token_id: string;
  quote_token: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOrderCreatedEvent {
  id: string;
  order_id: string;
  market_id: string;
  maker: string;
  price: string;
  amount: string;
  is_buy: boolean;
  order_type: string;
  time_in_force: string;
  expiry: string;
  nonce: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOrderExpiredEvent {
  id: string;
  order_id: string;
  expired_at: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOrderPlacedWithTokensEvent {
  id: string;
  order_id: string;
  maker: string;
  base_token: string;
  base_token_id: string;
  quote_token: string;
  price: string;
  amount: string;
  is_buy: boolean;
  order_type: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondAusysOrderFilledEvent {
  id: string;
  order_id: string;
  trade_id: string;
  fill_amount: string;
  fill_price: string;
  remaining_amount: string;
  cumulative_filled: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondMatchingOrderCancelledEvent {
  id: string;
  order_id: string;
  maker: string;
  remaining_amount: string;
  reason: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondTradeExecutedEvent {
  id: string;
  trade_id: string;
  taker_order_id: string;
  maker_order_id: string;
  price: string;
  amount: string;
  quote_amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOrderRoutedEvent {
  id: string;
  order_id: string;
  maker: string;
  order_source: string;
  is_buy: boolean;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondRouterOrderCancelledEvent {
  id: string;
  order_id: string;
  maker: string;
  remaining_amount: string;
  reason: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondRouterOrderCreatedEvent {
  id: string;
  order_id: string;
  market_id: string;
  maker: string;
  price: string;
  amount: string;
  is_buy: boolean;
  order_type: string;
  time_in_force: string;
  expiry: string;
  nonce: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondRouterOrderPlacedEvent {
  id: string;
  order_id: string;
  maker: string;
  base_token: string;
  base_token_id: string;
  quote_token: string;
  price: string;
  amount: string;
  is_buy: boolean;
  order_type: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondRouterTradeExecutedEvent {
  id: string;
  trade_id: string;
  taker_order_id: string;
  maker_order_id: string;
  price: string;
  amount: string;
  quote_amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondBountyPaidEvent {
  id: string;
  unified_order_id: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondBridgeFeeRecipientUpdatedEvent {
  id: string;
  old_recipient: string;
  new_recipient: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondBridgeOrderCancelledEvent {
  id: string;
  unified_order_id: string;
  previous_status: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondJourneyStatusUpdatedEvent {
  id: string;
  unified_order_id: string;
  journey_id: string;
  phase: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondLogisticsOrderCreatedEvent {
  id: string;
  unified_order_id: string;
  ausys_order_id: string;
  journey_ids: string;
  bounty: string;
  node: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOrderSettledEvent {
  id: string;
  unified_order_id: string;
  seller: string;
  seller_amount: string;
  driver: string;
  driver_amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondTradeMatchedEvent {
  id: string;
  unified_order_id: string;
  clob_trade_id: string;
  clob_order_id: string;
  maker: string;
  price: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondUnifiedOrderCreatedEvent {
  id: string;
  unified_order_id: string;
  clob_order_id: string;
  buyer: string;
  seller: string;
  token: string;
  token_id: string;
  quantity: string;
  price: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCollateralReturnedEvent {
  id: string;
  opportunity_id: string;
  operator: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCommodityStakedEvent {
  id: string;
  opportunity_id: string;
  staker: string;
  amount: string;
  total_staked: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCommodityUnstakedEvent {
  id: string;
  opportunity_id: string;
  staker: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondConfigUpdatedEvent {
  id: string;
  param: string;
  old_value: string;
  new_value: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCustodyProofSubmittedEvent {
  id: string;
  opportunity_id: string;
  document_uri: string;
  proof_type: string;
  submitter: string;
  timestamp: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondDeliveryConfirmedEvent {
  id: string;
  opportunity_id: string;
  delivered_amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondDeliveryStartedEvent {
  id: string;
  opportunity_id: string;
  journey_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondInsuranceUpdatedEvent {
  id: string;
  opportunity_id: string;
  is_insured: boolean;
  document_uri: string;
  coverage_amount: string;
  expiry_date: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOpportunityCancelledEvent {
  id: string;
  event_id: string;
  reason: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOpportunityCompletedEvent {
  id: string;
  opportunity_id: string;
  total_proceeds: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOpportunityCreatedEvent {
  id: string;
  event_id: string;
  operator: string;
  input_token: string;
  input_token_id: string;
  target_amount: string;
  promised_yield_bps: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOpportunityFundedEvent {
  id: string;
  event_id: string;
  total_staked: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondProcessingCompletedEvent {
  id: string;
  opportunity_id: string;
  output_amount: string;
  output_token_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondProcessingStartedEvent {
  id: string;
  opportunity_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondProfitDistributedEvent {
  id: string;
  opportunity_id: string;
  staker: string;
  staked_amount: string;
  profit_share: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondSaleProceedsRecordedEvent {
  id: string;
  opportunity_id: string;
  proceeds: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondTokenizationProofSubmittedEvent {
  id: string;
  opportunity_id: string;
  document_uri: string;
  submitter: string;
  timestamp: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOperatorApprovedEvent {
  id: string;
  operator: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOperatorReputationUpdatedEvent {
  id: string;
  operator: string;
  old_reputation: string;
  new_reputation: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOperatorRevokedEvent {
  id: string;
  operator: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOperatorSlashedEvent {
  id: string;
  opportunity_id: string;
  operator: string;
  collateral_token: string;
  collateral_token_id: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOperatorStatsUpdatedEvent {
  id: string;
  operator: string;
  successful_ops: string;
  total_value_processed: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCircuitBreakerConfiguredEvent {
  id: string;
  market_id: string;
  price_change_threshold: string;
  cooldown_period: string;
  is_enabled: boolean;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCircuitBreakerResetEvent {
  id: string;
  market_id: string;
  reset_at: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCircuitBreakerTrippedEvent {
  id: string;
  market_id: string;
  trigger_price: string;
  previous_price: string;
  change_percent: string;
  cooldown_until: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondEmergencyActionCancelledEvent {
  id: string;
  action_id: string;
  canceller: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondEmergencyActionExecutedEvent {
  id: string;
  action_id: string;
  executor: string;
  token: string;
  recipient: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondEmergencyActionInitiatedEvent {
  id: string;
  action_id: string;
  initiator: string;
  token: string;
  recipient: string;
  amount: string;
  execute_after: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondEmergencyWithdrawalEvent {
  id: string;
  user: string;
  order_id: string;
  token: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondFeeRecipientUpdatedEvent {
  id: string;
  old_recipient: string;
  new_recipient: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondFeesUpdatedEvent {
  id: string;
  taker_fee_bps: string;
  maker_fee_bps: string;
  lp_fee_bps: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondGlobalPauseEvent {
  id: string;
  paused: boolean;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondMEVProtectionUpdatedEvent {
  id: string;
  min_reveal_delay: string;
  commitment_threshold: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondMarketPausedEvent {
  id: string;
  market_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondMarketUnpausedEvent {
  id: string;
  market_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondRateLimitsUpdatedEvent {
  id: string;
  max_orders_per_block: string;
  max_volume_per_block: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondDiamondCutEvent {
  id: string;
  diamond_cut: string[];
  init: string;
  calldata: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondOwnershipTransferredEvent {
  id: string;
  previous_owner: string;
  new_owner: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondAuSysAdminRevokedEvent {
  id: string;
  admin: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondAuSysAdminSetEvent {
  id: string;
  admin: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondAuSysJourneyStatusUpdatedEvent {
  id: string;
  journey_id: string;
  new_status: string;
  sender: string;
  receiver: string;
  driver: string;
  bounty: string;
  e_t_a: string;
  journey_start: string;
  journey_end: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondAuSysOrderCreatedEvent {
  id: string;
  order_id: string;
  buyer: string;
  seller: string;
  token: string;
  token_id: string;
  token_quantity: string;
  price: string;
  tx_fee: string;
  current_status: string;
  nodes: string[];
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondAuSysOrderSettledEvent {
  id: string;
  order_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondAuSysOrderStatusUpdatedEvent {
  id: string;
  order_id: string;
  new_status: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondDriverAssignedEvent {
  id: string;
  journey_id: string;
  driver: string;
  sender: string;
  receiver: string;
  bounty: string;
  e_t_a: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondEmitSigEvent {
  id: string;
  user: string;
  event_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondFundsEscrowedEvent {
  id: string;
  from: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondFundsRefundedEvent {
  id: string;
  to: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondJourneyCanceledEvent {
  id: string;
  journey_id: string;
  sender: string;
  receiver: string;
  driver: string;
  refunded_amount: string;
  bounty: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondJourneyCreatedEvent {
  id: string;
  journey_id: string;
  sender: string;
  receiver: string;
  driver: string;
  bounty: string;
  e_t_a: string;
  order_id: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondNodeFeeDistributedEvent {
  id: string;
  node: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondP2POfferAcceptedEvent {
  id: string;
  order_id: string;
  acceptor: string;
  is_seller_initiated: boolean;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondP2POfferCanceledEvent {
  id: string;
  order_id: string;
  creator: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondP2POfferCreatedEvent {
  id: string;
  order_id: string;
  creator: string;
  is_seller_initiated: boolean;
  token: string;
  token_id: string;
  token_quantity: string;
  price: string;
  target_counterparty: string;
  expires_at: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondSellerPaidEvent {
  id: string;
  seller: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondApprovalForAllEvent {
  id: string;
  account: string;
  operator: string;
  approved: boolean;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondAssetAttributeAddedEvent {
  id: string;
  hash: string;
  attribute_index: string;
  name: string;
  values: string[];
  description: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCustodyEstablishedEvent {
  id: string;
  token_id: string;
  custodian: string;
  amount: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondCustodyReleasedEvent {
  id: string;
  token_id: string;
  custodian: string;
  amount: string;
  redeemer: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondMintedAssetEvent {
  id: string;
  account: string;
  hash: string;
  token_id: string;
  name: string;
  asset_class: string;
  class_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondSupportedClassAddedEvent {
  id: string;
  class_name_hash: string;
  class_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondSupportedClassRemovedEvent {
  id: string;
  class_name_hash: string;
  class_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondTransferBatchEvent {
  id: string;
  operator: string;
  from: string;
  to: string;
  ids: string;
  values: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondTransferSingleEvent {
  id: string;
  operator: string;
  from: string;
  to: string;
  event_id: string;
  value: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface diamondURIEvent {
  id: string;
  value: string;
  event_id: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

// ============================================================================
// GRAPHQL RESPONSE WRAPPERS
// ============================================================================

export interface PonderPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface PonderItemsResponse<T> {
  items: T[];
  pageInfo?: PonderPageInfo;
}

export interface diamondClobApprovalGrantedEventsResponse {
  diamondClobApprovalGrantedEventss: PonderItemsResponse<diamondClobApprovalGrantedEvent>;
}

export interface diamondClobApprovalRevokedEventsResponse {
  diamondClobApprovalRevokedEventss: PonderItemsResponse<diamondClobApprovalRevokedEvent>;
}

export interface diamondInitializedEventsResponse {
  diamondInitializedEventss: PonderItemsResponse<diamondInitializedEvent>;
}

export interface diamondNodeAdminRevokedEventsResponse {
  diamondNodeAdminRevokedEventss: PonderItemsResponse<diamondNodeAdminRevokedEvent>;
}

export interface diamondNodeAdminSetEventsResponse {
  diamondNodeAdminSetEventss: PonderItemsResponse<diamondNodeAdminSetEvent>;
}

export interface diamondNodeCapacityUpdatedEventsResponse {
  diamondNodeCapacityUpdatedEventss: PonderItemsResponse<diamondNodeCapacityUpdatedEvent>;
}

export interface diamondNodeDeactivatedEventsResponse {
  diamondNodeDeactivatedEventss: PonderItemsResponse<diamondNodeDeactivatedEvent>;
}

export interface diamondNodeRegisteredEventsResponse {
  diamondNodeRegisteredEventss: PonderItemsResponse<diamondNodeRegisteredEvent>;
}

export interface diamondNodeSellOrderPlacedEventsResponse {
  diamondNodeSellOrderPlacedEventss: PonderItemsResponse<diamondNodeSellOrderPlacedEvent>;
}

export interface diamondNodeUpdatedEventsResponse {
  diamondNodeUpdatedEventss: PonderItemsResponse<diamondNodeUpdatedEvent>;
}

export interface diamondSupportedAssetAddedEventsResponse {
  diamondSupportedAssetAddedEventss: PonderItemsResponse<diamondSupportedAssetAddedEvent>;
}

export interface diamondSupportedAssetsUpdatedEventsResponse {
  diamondSupportedAssetsUpdatedEventss: PonderItemsResponse<diamondSupportedAssetsUpdatedEvent>;
}

export interface diamondSupportingDocumentAddedEventsResponse {
  diamondSupportingDocumentAddedEventss: PonderItemsResponse<diamondSupportingDocumentAddedEvent>;
}

export interface diamondSupportingDocumentRemovedEventsResponse {
  diamondSupportingDocumentRemovedEventss: PonderItemsResponse<diamondSupportingDocumentRemovedEvent>;
}

export interface diamondTokensDepositedToNodeEventsResponse {
  diamondTokensDepositedToNodeEventss: PonderItemsResponse<diamondTokensDepositedToNodeEvent>;
}

export interface diamondTokensMintedToNodeEventsResponse {
  diamondTokensMintedToNodeEventss: PonderItemsResponse<diamondTokensMintedToNodeEvent>;
}

export interface diamondTokensTransferredBetweenNodesEventsResponse {
  diamondTokensTransferredBetweenNodesEventss: PonderItemsResponse<diamondTokensTransferredBetweenNodesEvent>;
}

export interface diamondTokensWithdrawnFromNodeEventsResponse {
  diamondTokensWithdrawnFromNodeEventss: PonderItemsResponse<diamondTokensWithdrawnFromNodeEvent>;
}

export interface diamondUpdateLocationEventsResponse {
  diamondUpdateLocationEventss: PonderItemsResponse<diamondUpdateLocationEvent>;
}

export interface diamondUpdateOwnerEventsResponse {
  diamondUpdateOwnerEventss: PonderItemsResponse<diamondUpdateOwnerEvent>;
}

export interface diamondUpdateStatusEventsResponse {
  diamondUpdateStatusEventss: PonderItemsResponse<diamondUpdateStatusEvent>;
}

export interface diamondCLOBOrderCancelledEventsResponse {
  diamondCLOBOrderCancelledEventss: PonderItemsResponse<diamondCLOBOrderCancelledEvent>;
}

export interface diamondCLOBOrderFilledEventsResponse {
  diamondCLOBOrderFilledEventss: PonderItemsResponse<diamondCLOBOrderFilledEvent>;
}

export interface diamondCLOBTradeExecutedEventsResponse {
  diamondCLOBTradeExecutedEventss: PonderItemsResponse<diamondCLOBTradeExecutedEvent>;
}

export interface diamondMarketCreatedEventsResponse {
  diamondMarketCreatedEventss: PonderItemsResponse<diamondMarketCreatedEvent>;
}

export interface diamondOrderCreatedEventsResponse {
  diamondOrderCreatedEventss: PonderItemsResponse<diamondOrderCreatedEvent>;
}

export interface diamondOrderExpiredEventsResponse {
  diamondOrderExpiredEventss: PonderItemsResponse<diamondOrderExpiredEvent>;
}

export interface diamondOrderPlacedWithTokensEventsResponse {
  diamondOrderPlacedWithTokensEventss: PonderItemsResponse<diamondOrderPlacedWithTokensEvent>;
}

export interface diamondAusysOrderFilledEventsResponse {
  diamondAusysOrderFilledEventss: PonderItemsResponse<diamondAusysOrderFilledEvent>;
}

export interface diamondMatchingOrderCancelledEventsResponse {
  diamondMatchingOrderCancelledEventss: PonderItemsResponse<diamondMatchingOrderCancelledEvent>;
}

export interface diamondTradeExecutedEventsResponse {
  diamondTradeExecutedEventss: PonderItemsResponse<diamondTradeExecutedEvent>;
}

export interface diamondOrderRoutedEventsResponse {
  diamondOrderRoutedEventss: PonderItemsResponse<diamondOrderRoutedEvent>;
}

export interface diamondRouterOrderCancelledEventsResponse {
  diamondRouterOrderCancelledEventss: PonderItemsResponse<diamondRouterOrderCancelledEvent>;
}

export interface diamondRouterOrderCreatedEventsResponse {
  diamondRouterOrderCreatedEventss: PonderItemsResponse<diamondRouterOrderCreatedEvent>;
}

export interface diamondRouterOrderPlacedEventsResponse {
  diamondRouterOrderPlacedEventss: PonderItemsResponse<diamondRouterOrderPlacedEvent>;
}

export interface diamondRouterTradeExecutedEventsResponse {
  diamondRouterTradeExecutedEventss: PonderItemsResponse<diamondRouterTradeExecutedEvent>;
}

export interface diamondBountyPaidEventsResponse {
  diamondBountyPaidEventss: PonderItemsResponse<diamondBountyPaidEvent>;
}

export interface diamondBridgeFeeRecipientUpdatedEventsResponse {
  diamondBridgeFeeRecipientUpdatedEventss: PonderItemsResponse<diamondBridgeFeeRecipientUpdatedEvent>;
}

export interface diamondBridgeOrderCancelledEventsResponse {
  diamondBridgeOrderCancelledEventss: PonderItemsResponse<diamondBridgeOrderCancelledEvent>;
}

export interface diamondJourneyStatusUpdatedEventsResponse {
  diamondJourneyStatusUpdatedEventss: PonderItemsResponse<diamondJourneyStatusUpdatedEvent>;
}

export interface diamondLogisticsOrderCreatedEventsResponse {
  diamondLogisticsOrderCreatedEventss: PonderItemsResponse<diamondLogisticsOrderCreatedEvent>;
}

export interface diamondOrderSettledEventsResponse {
  diamondOrderSettledEventss: PonderItemsResponse<diamondOrderSettledEvent>;
}

export interface diamondTradeMatchedEventsResponse {
  diamondTradeMatchedEventss: PonderItemsResponse<diamondTradeMatchedEvent>;
}

export interface diamondUnifiedOrderCreatedEventsResponse {
  diamondUnifiedOrderCreatedEventss: PonderItemsResponse<diamondUnifiedOrderCreatedEvent>;
}

export interface diamondCollateralReturnedEventsResponse {
  diamondCollateralReturnedEventss: PonderItemsResponse<diamondCollateralReturnedEvent>;
}

export interface diamondCommodityStakedEventsResponse {
  diamondCommodityStakedEventss: PonderItemsResponse<diamondCommodityStakedEvent>;
}

export interface diamondCommodityUnstakedEventsResponse {
  diamondCommodityUnstakedEventss: PonderItemsResponse<diamondCommodityUnstakedEvent>;
}

export interface diamondConfigUpdatedEventsResponse {
  diamondConfigUpdatedEventss: PonderItemsResponse<diamondConfigUpdatedEvent>;
}

export interface diamondCustodyProofSubmittedEventsResponse {
  diamondCustodyProofSubmittedEventss: PonderItemsResponse<diamondCustodyProofSubmittedEvent>;
}

export interface diamondDeliveryConfirmedEventsResponse {
  diamondDeliveryConfirmedEventss: PonderItemsResponse<diamondDeliveryConfirmedEvent>;
}

export interface diamondDeliveryStartedEventsResponse {
  diamondDeliveryStartedEventss: PonderItemsResponse<diamondDeliveryStartedEvent>;
}

export interface diamondInsuranceUpdatedEventsResponse {
  diamondInsuranceUpdatedEventss: PonderItemsResponse<diamondInsuranceUpdatedEvent>;
}

export interface diamondOpportunityCancelledEventsResponse {
  diamondOpportunityCancelledEventss: PonderItemsResponse<diamondOpportunityCancelledEvent>;
}

export interface diamondOpportunityCompletedEventsResponse {
  diamondOpportunityCompletedEventss: PonderItemsResponse<diamondOpportunityCompletedEvent>;
}

export interface diamondOpportunityCreatedEventsResponse {
  diamondOpportunityCreatedEventss: PonderItemsResponse<diamondOpportunityCreatedEvent>;
}

export interface diamondOpportunityFundedEventsResponse {
  diamondOpportunityFundedEventss: PonderItemsResponse<diamondOpportunityFundedEvent>;
}

export interface diamondProcessingCompletedEventsResponse {
  diamondProcessingCompletedEventss: PonderItemsResponse<diamondProcessingCompletedEvent>;
}

export interface diamondProcessingStartedEventsResponse {
  diamondProcessingStartedEventss: PonderItemsResponse<diamondProcessingStartedEvent>;
}

export interface diamondProfitDistributedEventsResponse {
  diamondProfitDistributedEventss: PonderItemsResponse<diamondProfitDistributedEvent>;
}

export interface diamondSaleProceedsRecordedEventsResponse {
  diamondSaleProceedsRecordedEventss: PonderItemsResponse<diamondSaleProceedsRecordedEvent>;
}

export interface diamondTokenizationProofSubmittedEventsResponse {
  diamondTokenizationProofSubmittedEventss: PonderItemsResponse<diamondTokenizationProofSubmittedEvent>;
}

export interface diamondOperatorApprovedEventsResponse {
  diamondOperatorApprovedEventss: PonderItemsResponse<diamondOperatorApprovedEvent>;
}

export interface diamondOperatorReputationUpdatedEventsResponse {
  diamondOperatorReputationUpdatedEventss: PonderItemsResponse<diamondOperatorReputationUpdatedEvent>;
}

export interface diamondOperatorRevokedEventsResponse {
  diamondOperatorRevokedEventss: PonderItemsResponse<diamondOperatorRevokedEvent>;
}

export interface diamondOperatorSlashedEventsResponse {
  diamondOperatorSlashedEventss: PonderItemsResponse<diamondOperatorSlashedEvent>;
}

export interface diamondOperatorStatsUpdatedEventsResponse {
  diamondOperatorStatsUpdatedEventss: PonderItemsResponse<diamondOperatorStatsUpdatedEvent>;
}

export interface diamondCircuitBreakerConfiguredEventsResponse {
  diamondCircuitBreakerConfiguredEventss: PonderItemsResponse<diamondCircuitBreakerConfiguredEvent>;
}

export interface diamondCircuitBreakerResetEventsResponse {
  diamondCircuitBreakerResetEventss: PonderItemsResponse<diamondCircuitBreakerResetEvent>;
}

export interface diamondCircuitBreakerTrippedEventsResponse {
  diamondCircuitBreakerTrippedEventss: PonderItemsResponse<diamondCircuitBreakerTrippedEvent>;
}

export interface diamondEmergencyActionCancelledEventsResponse {
  diamondEmergencyActionCancelledEventss: PonderItemsResponse<diamondEmergencyActionCancelledEvent>;
}

export interface diamondEmergencyActionExecutedEventsResponse {
  diamondEmergencyActionExecutedEventss: PonderItemsResponse<diamondEmergencyActionExecutedEvent>;
}

export interface diamondEmergencyActionInitiatedEventsResponse {
  diamondEmergencyActionInitiatedEventss: PonderItemsResponse<diamondEmergencyActionInitiatedEvent>;
}

export interface diamondEmergencyWithdrawalEventsResponse {
  diamondEmergencyWithdrawalEventss: PonderItemsResponse<diamondEmergencyWithdrawalEvent>;
}

export interface diamondFeeRecipientUpdatedEventsResponse {
  diamondFeeRecipientUpdatedEventss: PonderItemsResponse<diamondFeeRecipientUpdatedEvent>;
}

export interface diamondFeesUpdatedEventsResponse {
  diamondFeesUpdatedEventss: PonderItemsResponse<diamondFeesUpdatedEvent>;
}

export interface diamondGlobalPauseEventsResponse {
  diamondGlobalPauseEventss: PonderItemsResponse<diamondGlobalPauseEvent>;
}

export interface diamondMEVProtectionUpdatedEventsResponse {
  diamondMEVProtectionUpdatedEventss: PonderItemsResponse<diamondMEVProtectionUpdatedEvent>;
}

export interface diamondMarketPausedEventsResponse {
  diamondMarketPausedEventss: PonderItemsResponse<diamondMarketPausedEvent>;
}

export interface diamondMarketUnpausedEventsResponse {
  diamondMarketUnpausedEventss: PonderItemsResponse<diamondMarketUnpausedEvent>;
}

export interface diamondRateLimitsUpdatedEventsResponse {
  diamondRateLimitsUpdatedEventss: PonderItemsResponse<diamondRateLimitsUpdatedEvent>;
}

export interface diamondDiamondCutEventsResponse {
  diamondDiamondCutEventss: PonderItemsResponse<diamondDiamondCutEvent>;
}

export interface diamondOwnershipTransferredEventsResponse {
  diamondOwnershipTransferredEventss: PonderItemsResponse<diamondOwnershipTransferredEvent>;
}

export interface diamondAuSysAdminRevokedEventsResponse {
  diamondAuSysAdminRevokedEventss: PonderItemsResponse<diamondAuSysAdminRevokedEvent>;
}

export interface diamondAuSysAdminSetEventsResponse {
  diamondAuSysAdminSetEventss: PonderItemsResponse<diamondAuSysAdminSetEvent>;
}

export interface diamondAuSysJourneyStatusUpdatedEventsResponse {
  diamondAuSysJourneyStatusUpdatedEventss: PonderItemsResponse<diamondAuSysJourneyStatusUpdatedEvent>;
}

export interface diamondAuSysOrderCreatedEventsResponse {
  diamondAuSysOrderCreatedEventss: PonderItemsResponse<diamondAuSysOrderCreatedEvent>;
}

export interface diamondAuSysOrderSettledEventsResponse {
  diamondAuSysOrderSettledEventss: PonderItemsResponse<diamondAuSysOrderSettledEvent>;
}

export interface diamondAuSysOrderStatusUpdatedEventsResponse {
  diamondAuSysOrderStatusUpdatedEventss: PonderItemsResponse<diamondAuSysOrderStatusUpdatedEvent>;
}

export interface diamondDriverAssignedEventsResponse {
  diamondDriverAssignedEventss: PonderItemsResponse<diamondDriverAssignedEvent>;
}

export interface diamondEmitSigEventsResponse {
  diamondEmitSigEventss: PonderItemsResponse<diamondEmitSigEvent>;
}

export interface diamondFundsEscrowedEventsResponse {
  diamondFundsEscrowedEventss: PonderItemsResponse<diamondFundsEscrowedEvent>;
}

export interface diamondFundsRefundedEventsResponse {
  diamondFundsRefundedEventss: PonderItemsResponse<diamondFundsRefundedEvent>;
}

export interface diamondJourneyCanceledEventsResponse {
  diamondJourneyCanceledEventss: PonderItemsResponse<diamondJourneyCanceledEvent>;
}

export interface diamondJourneyCreatedEventsResponse {
  diamondJourneyCreatedEventss: PonderItemsResponse<diamondJourneyCreatedEvent>;
}

export interface diamondNodeFeeDistributedEventsResponse {
  diamondNodeFeeDistributedEventss: PonderItemsResponse<diamondNodeFeeDistributedEvent>;
}

export interface diamondP2POfferAcceptedEventsResponse {
  diamondP2POfferAcceptedEventss: PonderItemsResponse<diamondP2POfferAcceptedEvent>;
}

export interface diamondP2POfferCanceledEventsResponse {
  diamondP2POfferCanceledEventss: PonderItemsResponse<diamondP2POfferCanceledEvent>;
}

export interface diamondP2POfferCreatedEventsResponse {
  diamondP2POfferCreatedEventss: PonderItemsResponse<diamondP2POfferCreatedEvent>;
}

export interface diamondSellerPaidEventsResponse {
  diamondSellerPaidEventss: PonderItemsResponse<diamondSellerPaidEvent>;
}

export interface diamondApprovalForAllEventsResponse {
  diamondApprovalForAllEventss: PonderItemsResponse<diamondApprovalForAllEvent>;
}

export interface diamondAssetAttributeAddedEventsResponse {
  diamondAssetAttributeAddedEventss: PonderItemsResponse<diamondAssetAttributeAddedEvent>;
}

export interface diamondCustodyEstablishedEventsResponse {
  diamondCustodyEstablishedEventss: PonderItemsResponse<diamondCustodyEstablishedEvent>;
}

export interface diamondCustodyReleasedEventsResponse {
  diamondCustodyReleasedEventss: PonderItemsResponse<diamondCustodyReleasedEvent>;
}

export interface diamondMintedAssetEventsResponse {
  diamondMintedAssetEventss: PonderItemsResponse<diamondMintedAssetEvent>;
}

export interface diamondSupportedClassAddedEventsResponse {
  diamondSupportedClassAddedEventss: PonderItemsResponse<diamondSupportedClassAddedEvent>;
}

export interface diamondSupportedClassRemovedEventsResponse {
  diamondSupportedClassRemovedEventss: PonderItemsResponse<diamondSupportedClassRemovedEvent>;
}

export interface diamondTransferBatchEventsResponse {
  diamondTransferBatchEventss: PonderItemsResponse<diamondTransferBatchEvent>;
}

export interface diamondTransferSingleEventsResponse {
  diamondTransferSingleEventss: PonderItemsResponse<diamondTransferSingleEvent>;
}

export interface diamondURIEventsResponse {
  diamondURIEventss: PonderItemsResponse<diamondURIEvent>;
}

// ============================================================================
// QUERY FIELD CONSTANTS
// ============================================================================
// Use these to build type-safe queries with correct field names

export const FIELDS_DIAMOND_CLOB_APPROVAL_GRANTED_EVENTS = [
  'id',
  'node_hash',
  'clob_address',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_CLOB_APPROVAL_REVOKED_EVENTS = [
  'id',
  'node_hash',
  'clob_address',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_INITIALIZED_EVENTS = [
  'id',
  'version',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_NODE_ADMIN_REVOKED_EVENTS = [
  'id',
  'admin',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_NODE_ADMIN_SET_EVENTS = [
  'id',
  'admin',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_NODE_CAPACITY_UPDATED_EVENTS = [
  'id',
  'node_hash',
  'quantities',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_NODE_DEACTIVATED_EVENTS = [
  'id',
  'node_hash',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_NODE_REGISTERED_EVENTS = [
  'id',
  'node_hash',
  'owner',
  'node_type',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_NODE_SELL_ORDER_PLACED_EVENTS = [
  'id',
  'node_hash',
  'token_id',
  'quote_token',
  'price',
  'amount',
  'order_id',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_NODE_UPDATED_EVENTS = [
  'id',
  'node_hash',
  'node_type',
  'capacity',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_SUPPORTED_ASSET_ADDED_EVENTS = [
  'id',
  'node_hash',
  'token',
  'token_id',
  'price',
  'capacity',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_SUPPORTED_ASSETS_UPDATED_EVENTS = [
  'id',
  'node_hash',
  'count',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_SUPPORTING_DOCUMENT_ADDED_EVENTS = [
  'id',
  'node_hash',
  'url',
  'title',
  'description',
  'document_type',
  'is_frozen',
  'timestamp',
  'added_by',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_SUPPORTING_DOCUMENT_REMOVED_EVENTS = [
  'id',
  'node_hash',
  'url',
  'timestamp',
  'removed_by',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_TOKENS_DEPOSITED_TO_NODE_EVENTS = [
  'id',
  'node_hash',
  'token_id',
  'amount',
  'depositor',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_TOKENS_MINTED_TO_NODE_EVENTS = [
  'id',
  'node_hash',
  'token_id',
  'amount',
  'minter',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_TOKENS_TRANSFERRED_BETWEEN_NODES_EVENTS = [
  'id',
  'from_node',
  'to_node',
  'token_id',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_TOKENS_WITHDRAWN_FROM_NODE_EVENTS = [
  'id',
  'node_hash',
  'token_id',
  'amount',
  'recipient',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_UPDATE_LOCATION_EVENTS = [
  'id',
  'address_name',
  'lat',
  'lng',
  'node',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_UPDATE_OWNER_EVENTS = [
  'id',
  'owner',
  'node',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_UPDATE_STATUS_EVENTS = [
  'id',
  'status',
  'node',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_C_L_O_B_ORDER_CANCELLED_EVENTS = [
  'id',
  'order_id',
  'maker',
  'remaining_amount',
  'reason',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_C_L_O_B_ORDER_FILLED_EVENTS = [
  'id',
  'order_id',
  'trade_id',
  'fill_amount',
  'fill_price',
  'remaining_amount',
  'cumulative_filled',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_C_L_O_B_TRADE_EXECUTED_EVENTS = [
  'id',
  'trade_id',
  'taker_order_id',
  'maker_order_id',
  'taker',
  'maker',
  'market_id',
  'price',
  'amount',
  'quote_amount',
  'taker_fee',
  'maker_fee',
  'timestamp',
  'taker_is_buy',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_MARKET_CREATED_EVENTS = [
  'id',
  'market_id',
  'base_token',
  'base_token_id',
  'quote_token',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_ORDER_CREATED_EVENTS = [
  'id',
  'order_id',
  'market_id',
  'maker',
  'price',
  'amount',
  'is_buy',
  'order_type',
  'time_in_force',
  'expiry',
  'nonce',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_ORDER_EXPIRED_EVENTS = [
  'id',
  'order_id',
  'expired_at',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_ORDER_PLACED_WITH_TOKENS_EVENTS = [
  'id',
  'order_id',
  'maker',
  'base_token',
  'base_token_id',
  'quote_token',
  'price',
  'amount',
  'is_buy',
  'order_type',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_AUSYS_ORDER_FILLED_EVENTS = [
  'id',
  'order_id',
  'trade_id',
  'fill_amount',
  'fill_price',
  'remaining_amount',
  'cumulative_filled',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_MATCHING_ORDER_CANCELLED_EVENTS = [
  'id',
  'order_id',
  'maker',
  'remaining_amount',
  'reason',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_TRADE_EXECUTED_EVENTS = [
  'id',
  'trade_id',
  'taker_order_id',
  'maker_order_id',
  'price',
  'amount',
  'quote_amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_ORDER_ROUTED_EVENTS = [
  'id',
  'order_id',
  'maker',
  'order_source',
  'is_buy',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_ROUTER_ORDER_CANCELLED_EVENTS = [
  'id',
  'order_id',
  'maker',
  'remaining_amount',
  'reason',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_ROUTER_ORDER_CREATED_EVENTS = [
  'id',
  'order_id',
  'market_id',
  'maker',
  'price',
  'amount',
  'is_buy',
  'order_type',
  'time_in_force',
  'expiry',
  'nonce',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_ROUTER_ORDER_PLACED_EVENTS = [
  'id',
  'order_id',
  'maker',
  'base_token',
  'base_token_id',
  'quote_token',
  'price',
  'amount',
  'is_buy',
  'order_type',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_ROUTER_TRADE_EXECUTED_EVENTS = [
  'id',
  'trade_id',
  'taker_order_id',
  'maker_order_id',
  'price',
  'amount',
  'quote_amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_BOUNTY_PAID_EVENTS = [
  'id',
  'unified_order_id',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_BRIDGE_FEE_RECIPIENT_UPDATED_EVENTS = [
  'id',
  'old_recipient',
  'new_recipient',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_BRIDGE_ORDER_CANCELLED_EVENTS = [
  'id',
  'unified_order_id',
  'previous_status',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_JOURNEY_STATUS_UPDATED_EVENTS = [
  'id',
  'unified_order_id',
  'journey_id',
  'phase',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_LOGISTICS_ORDER_CREATED_EVENTS = [
  'id',
  'unified_order_id',
  'ausys_order_id',
  'journey_ids',
  'bounty',
  'node',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_ORDER_SETTLED_EVENTS = [
  'id',
  'unified_order_id',
  'seller',
  'seller_amount',
  'driver',
  'driver_amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_TRADE_MATCHED_EVENTS = [
  'id',
  'unified_order_id',
  'clob_trade_id',
  'clob_order_id',
  'maker',
  'price',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_UNIFIED_ORDER_CREATED_EVENTS = [
  'id',
  'unified_order_id',
  'clob_order_id',
  'buyer',
  'seller',
  'token',
  'token_id',
  'quantity',
  'price',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_COLLATERAL_RETURNED_EVENTS = [
  'id',
  'opportunity_id',
  'operator',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_COMMODITY_STAKED_EVENTS = [
  'id',
  'opportunity_id',
  'staker',
  'amount',
  'total_staked',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_COMMODITY_UNSTAKED_EVENTS = [
  'id',
  'opportunity_id',
  'staker',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_CONFIG_UPDATED_EVENTS = [
  'id',
  'param',
  'old_value',
  'new_value',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_CUSTODY_PROOF_SUBMITTED_EVENTS = [
  'id',
  'opportunity_id',
  'document_uri',
  'proof_type',
  'submitter',
  'timestamp',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_DELIVERY_CONFIRMED_EVENTS = [
  'id',
  'opportunity_id',
  'delivered_amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_DELIVERY_STARTED_EVENTS = [
  'id',
  'opportunity_id',
  'journey_id',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_INSURANCE_UPDATED_EVENTS = [
  'id',
  'opportunity_id',
  'is_insured',
  'document_uri',
  'coverage_amount',
  'expiry_date',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_OPPORTUNITY_CANCELLED_EVENTS = [
  'id',
  'event_id',
  'reason',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_OPPORTUNITY_COMPLETED_EVENTS = [
  'id',
  'opportunity_id',
  'total_proceeds',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_OPPORTUNITY_CREATED_EVENTS = [
  'id',
  'event_id',
  'operator',
  'input_token',
  'input_token_id',
  'target_amount',
  'promised_yield_bps',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_OPPORTUNITY_FUNDED_EVENTS = [
  'id',
  'event_id',
  'total_staked',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_PROCESSING_COMPLETED_EVENTS = [
  'id',
  'opportunity_id',
  'output_amount',
  'output_token_id',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_PROCESSING_STARTED_EVENTS = [
  'id',
  'opportunity_id',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_PROFIT_DISTRIBUTED_EVENTS = [
  'id',
  'opportunity_id',
  'staker',
  'staked_amount',
  'profit_share',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_SALE_PROCEEDS_RECORDED_EVENTS = [
  'id',
  'opportunity_id',
  'proceeds',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_TOKENIZATION_PROOF_SUBMITTED_EVENTS = [
  'id',
  'opportunity_id',
  'document_uri',
  'submitter',
  'timestamp',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_OPERATOR_APPROVED_EVENTS = [
  'id',
  'operator',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_OPERATOR_REPUTATION_UPDATED_EVENTS = [
  'id',
  'operator',
  'old_reputation',
  'new_reputation',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_OPERATOR_REVOKED_EVENTS = [
  'id',
  'operator',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_OPERATOR_SLASHED_EVENTS = [
  'id',
  'opportunity_id',
  'operator',
  'collateral_token',
  'collateral_token_id',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_OPERATOR_STATS_UPDATED_EVENTS = [
  'id',
  'operator',
  'successful_ops',
  'total_value_processed',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_CIRCUIT_BREAKER_CONFIGURED_EVENTS = [
  'id',
  'market_id',
  'price_change_threshold',
  'cooldown_period',
  'is_enabled',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_CIRCUIT_BREAKER_RESET_EVENTS = [
  'id',
  'market_id',
  'reset_at',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_CIRCUIT_BREAKER_TRIPPED_EVENTS = [
  'id',
  'market_id',
  'trigger_price',
  'previous_price',
  'change_percent',
  'cooldown_until',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_EMERGENCY_ACTION_CANCELLED_EVENTS = [
  'id',
  'action_id',
  'canceller',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_EMERGENCY_ACTION_EXECUTED_EVENTS = [
  'id',
  'action_id',
  'executor',
  'token',
  'recipient',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_EMERGENCY_ACTION_INITIATED_EVENTS = [
  'id',
  'action_id',
  'initiator',
  'token',
  'recipient',
  'amount',
  'execute_after',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_EMERGENCY_WITHDRAWAL_EVENTS = [
  'id',
  'user',
  'order_id',
  'token',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_FEE_RECIPIENT_UPDATED_EVENTS = [
  'id',
  'old_recipient',
  'new_recipient',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_FEES_UPDATED_EVENTS = [
  'id',
  'taker_fee_bps',
  'maker_fee_bps',
  'lp_fee_bps',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_GLOBAL_PAUSE_EVENTS = [
  'id',
  'paused',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_M_E_V_PROTECTION_UPDATED_EVENTS = [
  'id',
  'min_reveal_delay',
  'commitment_threshold',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_MARKET_PAUSED_EVENTS = [
  'id',
  'market_id',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_MARKET_UNPAUSED_EVENTS = [
  'id',
  'market_id',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_RATE_LIMITS_UPDATED_EVENTS = [
  'id',
  'max_orders_per_block',
  'max_volume_per_block',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_DIAMOND_CUT_EVENTS = [
  'id',
  'diamond_cut',
  'init',
  'calldata',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_OWNERSHIP_TRANSFERRED_EVENTS = [
  'id',
  'previous_owner',
  'new_owner',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_AU_SYS_ADMIN_REVOKED_EVENTS = [
  'id',
  'admin',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_AU_SYS_ADMIN_SET_EVENTS = [
  'id',
  'admin',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_AU_SYS_JOURNEY_STATUS_UPDATED_EVENTS = [
  'id',
  'journey_id',
  'new_status',
  'sender',
  'receiver',
  'driver',
  'bounty',
  'e_t_a',
  'journey_start',
  'journey_end',
  'start_lat',
  'start_lng',
  'end_lat',
  'end_lng',
  'start_name',
  'end_name',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_AU_SYS_ORDER_CREATED_EVENTS = [
  'id',
  'order_id',
  'buyer',
  'seller',
  'token',
  'token_id',
  'token_quantity',
  'price',
  'tx_fee',
  'current_status',
  'nodes',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_AU_SYS_ORDER_SETTLED_EVENTS = [
  'id',
  'order_id',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_AU_SYS_ORDER_STATUS_UPDATED_EVENTS = [
  'id',
  'order_id',
  'new_status',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_DRIVER_ASSIGNED_EVENTS = [
  'id',
  'journey_id',
  'driver',
  'sender',
  'receiver',
  'bounty',
  'e_t_a',
  'start_lat',
  'start_lng',
  'end_lat',
  'end_lng',
  'start_name',
  'end_name',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_EMIT_SIG_EVENTS = [
  'id',
  'user',
  'event_id',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_FUNDS_ESCROWED_EVENTS = [
  'id',
  'from',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_FUNDS_REFUNDED_EVENTS = [
  'id',
  'to',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_JOURNEY_CANCELED_EVENTS = [
  'id',
  'journey_id',
  'sender',
  'receiver',
  'driver',
  'refunded_amount',
  'bounty',
  'start_lat',
  'start_lng',
  'end_lat',
  'end_lng',
  'start_name',
  'end_name',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_JOURNEY_CREATED_EVENTS = [
  'id',
  'journey_id',
  'sender',
  'receiver',
  'driver',
  'bounty',
  'e_t_a',
  'order_id',
  'start_lat',
  'start_lng',
  'end_lat',
  'end_lng',
  'start_name',
  'end_name',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_NODE_FEE_DISTRIBUTED_EVENTS = [
  'id',
  'node',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_P2_P_OFFER_ACCEPTED_EVENTS = [
  'id',
  'order_id',
  'acceptor',
  'is_seller_initiated',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_P2_P_OFFER_CANCELED_EVENTS = [
  'id',
  'order_id',
  'creator',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_P2_P_OFFER_CREATED_EVENTS = [
  'id',
  'order_id',
  'creator',
  'is_seller_initiated',
  'token',
  'token_id',
  'token_quantity',
  'price',
  'target_counterparty',
  'expires_at',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_SELLER_PAID_EVENTS = [
  'id',
  'seller',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_APPROVAL_FOR_ALL_EVENTS = [
  'id',
  'account',
  'operator',
  'approved',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_ASSET_ATTRIBUTE_ADDED_EVENTS = [
  'id',
  'hash',
  'attribute_index',
  'name',
  'values',
  'description',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_CUSTODY_ESTABLISHED_EVENTS = [
  'id',
  'token_id',
  'custodian',
  'amount',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_CUSTODY_RELEASED_EVENTS = [
  'id',
  'token_id',
  'custodian',
  'amount',
  'redeemer',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_MINTED_ASSET_EVENTS = [
  'id',
  'account',
  'hash',
  'token_id',
  'name',
  'asset_class',
  'class_name',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_SUPPORTED_CLASS_ADDED_EVENTS = [
  'id',
  'class_name_hash',
  'class_name',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_SUPPORTED_CLASS_REMOVED_EVENTS = [
  'id',
  'class_name_hash',
  'class_name',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_TRANSFER_BATCH_EVENTS = [
  'id',
  'operator',
  'from',
  'to',
  'ids',
  'values',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_TRANSFER_SINGLE_EVENTS = [
  'id',
  'operator',
  'from',
  'to',
  'event_id',
  'value',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

export const FIELDS_DIAMOND_U_R_I_EVENTS = [
  'id',
  'value',
  'event_id',
  'block_number',
  'block_timestamp',
  'transaction_hash',
] as const;

// ============================================================================
// QUERY BUILDER HELPERS
// ============================================================================

/**
 * Validates that a GraphQL query string uses valid table names
 * Throws an error if an invalid table name is found
 */
export function validateQueryTableNames(query: string): void {
  // Extract table names from query (pattern: tableName( or tableName {)
  const tableNamePattern = /([a-zA-Z]+[a-zA-Z0-9]*(?:Eventss|ss))\s*[({]/g;
  let match;

  while ((match = tableNamePattern.exec(query)) !== null) {
    const tableName = match[1];
    if (!VALID_TABLE_NAMES.includes(tableName as ValidTableName)) {
      throw new Error(
        `Invalid GraphQL table name: "${tableName}". \n` +
          `Valid table names are: ${VALID_TABLE_NAMES.slice(0, 5).join(', ')}...`,
      );
    }
  }
}

/**
 * Type guard to check if a table name is valid
 */
export function isValidTableName(name: string): name is ValidTableName {
  return VALID_TABLE_NAMES.includes(name as ValidTableName);
}

/**
 * Get the correct GraphQL table name for an event
 */
export function getTableName(eventName: string): ValidTableName | undefined {
  const mapping: Record<string, ValidTableName> = {
    ClobApprovalGranted: 'diamondClobApprovalGrantedEventss',
    ClobApprovalRevoked: 'diamondClobApprovalRevokedEventss',
    Initialized: 'diamondInitializedEventss',
    NodeAdminRevoked: 'diamondNodeAdminRevokedEventss',
    NodeAdminSet: 'diamondNodeAdminSetEventss',
    NodeCapacityUpdated: 'diamondNodeCapacityUpdatedEventss',
    NodeDeactivated: 'diamondNodeDeactivatedEventss',
    NodeRegistered: 'diamondNodeRegisteredEventss',
    NodeSellOrderPlaced: 'diamondNodeSellOrderPlacedEventss',
    NodeUpdated: 'diamondNodeUpdatedEventss',
    SupportedAssetAdded: 'diamondSupportedAssetAddedEventss',
    SupportedAssetsUpdated: 'diamondSupportedAssetsUpdatedEventss',
    SupportingDocumentAdded: 'diamondSupportingDocumentAddedEventss',
    SupportingDocumentRemoved: 'diamondSupportingDocumentRemovedEventss',
    TokensDepositedToNode: 'diamondTokensDepositedToNodeEventss',
    TokensMintedToNode: 'diamondTokensMintedToNodeEventss',
    TokensTransferredBetweenNodes:
      'diamondTokensTransferredBetweenNodesEventss',
    TokensWithdrawnFromNode: 'diamondTokensWithdrawnFromNodeEventss',
    UpdateLocation: 'diamondUpdateLocationEventss',
    UpdateOwner: 'diamondUpdateOwnerEventss',
    UpdateStatus: 'diamondUpdateStatusEventss',
    CLOBOrderCancelled: 'diamondCLOBOrderCancelledEventss',
    CLOBOrderFilled: 'diamondCLOBOrderFilledEventss',
    CLOBTradeExecuted: 'diamondCLOBTradeExecutedEventss',
    MarketCreated: 'diamondMarketCreatedEventss',
    OrderCreated: 'diamondOrderCreatedEventss',
    OrderExpired: 'diamondOrderExpiredEventss',
    OrderPlacedWithTokens: 'diamondOrderPlacedWithTokensEventss',
    AusysOrderFilled: 'diamondAusysOrderFilledEventss',
    MatchingOrderCancelled: 'diamondMatchingOrderCancelledEventss',
    TradeExecuted: 'diamondTradeExecutedEventss',
    OrderRouted: 'diamondOrderRoutedEventss',
    RouterOrderCancelled: 'diamondRouterOrderCancelledEventss',
    RouterOrderCreated: 'diamondRouterOrderCreatedEventss',
    RouterOrderPlaced: 'diamondRouterOrderPlacedEventss',
    RouterTradeExecuted: 'diamondRouterTradeExecutedEventss',
    BountyPaid: 'diamondBountyPaidEventss',
    BridgeFeeRecipientUpdated: 'diamondBridgeFeeRecipientUpdatedEventss',
    BridgeOrderCancelled: 'diamondBridgeOrderCancelledEventss',
    JourneyStatusUpdated: 'diamondJourneyStatusUpdatedEventss',
    LogisticsOrderCreated: 'diamondLogisticsOrderCreatedEventss',
    OrderSettled: 'diamondOrderSettledEventss',
    TradeMatched: 'diamondTradeMatchedEventss',
    UnifiedOrderCreated: 'diamondUnifiedOrderCreatedEventss',
    CollateralReturned: 'diamondCollateralReturnedEventss',
    CommodityStaked: 'diamondCommodityStakedEventss',
    CommodityUnstaked: 'diamondCommodityUnstakedEventss',
    ConfigUpdated: 'diamondConfigUpdatedEventss',
    CustodyProofSubmitted: 'diamondCustodyProofSubmittedEventss',
    DeliveryConfirmed: 'diamondDeliveryConfirmedEventss',
    DeliveryStarted: 'diamondDeliveryStartedEventss',
    InsuranceUpdated: 'diamondInsuranceUpdatedEventss',
    OpportunityCancelled: 'diamondOpportunityCancelledEventss',
    OpportunityCompleted: 'diamondOpportunityCompletedEventss',
    OpportunityCreated: 'diamondOpportunityCreatedEventss',
    OpportunityFunded: 'diamondOpportunityFundedEventss',
    ProcessingCompleted: 'diamondProcessingCompletedEventss',
    ProcessingStarted: 'diamondProcessingStartedEventss',
    ProfitDistributed: 'diamondProfitDistributedEventss',
    SaleProceedsRecorded: 'diamondSaleProceedsRecordedEventss',
    TokenizationProofSubmitted: 'diamondTokenizationProofSubmittedEventss',
    OperatorApproved: 'diamondOperatorApprovedEventss',
    OperatorReputationUpdated: 'diamondOperatorReputationUpdatedEventss',
    OperatorRevoked: 'diamondOperatorRevokedEventss',
    OperatorSlashed: 'diamondOperatorSlashedEventss',
    OperatorStatsUpdated: 'diamondOperatorStatsUpdatedEventss',
    CircuitBreakerConfigured: 'diamondCircuitBreakerConfiguredEventss',
    CircuitBreakerReset: 'diamondCircuitBreakerResetEventss',
    CircuitBreakerTripped: 'diamondCircuitBreakerTrippedEventss',
    EmergencyActionCancelled: 'diamondEmergencyActionCancelledEventss',
    EmergencyActionExecuted: 'diamondEmergencyActionExecutedEventss',
    EmergencyActionInitiated: 'diamondEmergencyActionInitiatedEventss',
    EmergencyWithdrawal: 'diamondEmergencyWithdrawalEventss',
    FeeRecipientUpdated: 'diamondFeeRecipientUpdatedEventss',
    FeesUpdated: 'diamondFeesUpdatedEventss',
    GlobalPause: 'diamondGlobalPauseEventss',
    MEVProtectionUpdated: 'diamondMEVProtectionUpdatedEventss',
    MarketPaused: 'diamondMarketPausedEventss',
    MarketUnpaused: 'diamondMarketUnpausedEventss',
    RateLimitsUpdated: 'diamondRateLimitsUpdatedEventss',
    DiamondCut: 'diamondDiamondCutEventss',
    OwnershipTransferred: 'diamondOwnershipTransferredEventss',
    AuSysAdminRevoked: 'diamondAuSysAdminRevokedEventss',
    AuSysAdminSet: 'diamondAuSysAdminSetEventss',
    AuSysJourneyStatusUpdated: 'diamondAuSysJourneyStatusUpdatedEventss',
    AuSysOrderCreated: 'diamondAuSysOrderCreatedEventss',
    AuSysOrderSettled: 'diamondAuSysOrderSettledEventss',
    AuSysOrderStatusUpdated: 'diamondAuSysOrderStatusUpdatedEventss',
    DriverAssigned: 'diamondDriverAssignedEventss',
    EmitSig: 'diamondEmitSigEventss',
    FundsEscrowed: 'diamondFundsEscrowedEventss',
    FundsRefunded: 'diamondFundsRefundedEventss',
    JourneyCanceled: 'diamondJourneyCanceledEventss',
    JourneyCreated: 'diamondJourneyCreatedEventss',
    NodeFeeDistributed: 'diamondNodeFeeDistributedEventss',
    P2POfferAccepted: 'diamondP2POfferAcceptedEventss',
    P2POfferCanceled: 'diamondP2POfferCanceledEventss',
    P2POfferCreated: 'diamondP2POfferCreatedEventss',
    SellerPaid: 'diamondSellerPaidEventss',
    ApprovalForAll: 'diamondApprovalForAllEventss',
    AssetAttributeAdded: 'diamondAssetAttributeAddedEventss',
    CustodyEstablished: 'diamondCustodyEstablishedEventss',
    CustodyReleased: 'diamondCustodyReleasedEventss',
    MintedAsset: 'diamondMintedAssetEventss',
    SupportedClassAdded: 'diamondSupportedClassAddedEventss',
    SupportedClassRemoved: 'diamondSupportedClassRemovedEventss',
    TransferBatch: 'diamondTransferBatchEventss',
    TransferSingle: 'diamondTransferSingleEventss',
    URI: 'diamondURIEventss',
  };
  return mapping[eventName];
}

// ============================================================================
// COLUMN NAME MAPPING
// ============================================================================
// Maps camelCase field names to snake_case column names

export const COLUMN_NAME_MAP: Record<string, string> = {
  // Common mappings
  orderId: 'order_id',
  baseToken: 'base_token',
  baseTokenId: 'base_token_id',
  quoteToken: 'quote_token',
  isBuy: 'is_buy',
  orderType: 'order_type',
  blockNumber: 'block_number',
  blockTimestamp: 'block_timestamp',
  transactionHash: 'transaction_hash',
  tradeId: 'trade_id',
  takerOrderId: 'taker_order_id',
  makerOrderId: 'maker_order_id',
  fillAmount: 'fill_amount',
  fillPrice: 'fill_price',
  remainingAmount: 'remaining_amount',
  cumulativeFilled: 'cumulative_filled',
  quoteAmount: 'quote_amount',
  takerFee: 'taker_fee',
  makerFee: 'maker_fee',
  takerIsBuy: 'taker_is_buy',
  marketId: 'market_id',
  nodeHash: 'node_hash',
  tokenId: 'token_id',
  assetClass: 'asset_class',
  className: 'class_name',
  classNameHash: 'class_name_hash',
  unifiedOrderId: 'unified_order_id',
  clobOrderId: 'clob_order_id',
  journeyId: 'journey_id',
  ausysOrderId: 'ausys_order_id',
  eventId: 'event_id',
};

/**
 * Convert camelCase field name to snake_case column name
 */
export function toColumnName(fieldName: string): string {
  return (
    COLUMN_NAME_MAP[fieldName] ||
    fieldName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  );
}
