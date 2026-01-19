/**
 * Raw Event Types for Ponder GraphQL
 *
 * These types match the camelCase output from Ponder's GraphQL API.
 * The indexer stores raw events only - aggregation happens in repositories.
 *
 * Naming convention:
 * - Table names: diamond_{event_name}_events (snake_case)
 * - GraphQL fields: camelCase (Ponder auto-converts)
 * - TypeScript interfaces: {EventName}Event
 */

// ============================================================================
// Common Types
// ============================================================================

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

/** Base fields present on all events */
export interface BaseEvent {
  id: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

// ============================================================================
// Node Events
// ============================================================================

export interface NodeRegisteredEvent extends BaseEvent {
  nodeHash: string;
  owner: string;
  nodeType: string;
}

export interface NodeDeactivatedEvent extends BaseEvent {
  nodeHash: string;
}

export interface NodeUpdatedEvent extends BaseEvent {
  nodeHash: string;
  nodeType: string;
  capacity: string;
}

export interface UpdateLocationEvent extends BaseEvent {
  addressName: string;
  lat: string;
  lng: string;
  node: string;
}

export interface UpdateStatusEvent extends BaseEvent {
  status: string;
  node: string;
}

export interface UpdateOwnerEvent extends BaseEvent {
  owner: string;
  node: string;
}

export interface SupportedAssetAddedEvent extends BaseEvent {
  nodeHash: string;
  token: string;
  tokenId: string;
  price: string;
  capacity: string;
}

export interface SupportedAssetsUpdatedEvent extends BaseEvent {
  nodeHash: string;
  count: string;
}

export interface NodeCapacityUpdatedEvent extends BaseEvent {
  nodeHash: string;
  quantities: string;
}

export interface TokensDepositedToNodeEvent extends BaseEvent {
  nodeHash: string;
  tokenId: string;
  amount: string;
  depositor: string;
}

export interface TokensMintedToNodeEvent extends BaseEvent {
  nodeHash: string;
  tokenId: string;
  amount: string;
  minter: string;
}

export interface TokensWithdrawnFromNodeEvent extends BaseEvent {
  nodeHash: string;
  tokenId: string;
  amount: string;
  recipient: string;
}

export interface TokensTransferredBetweenNodesEvent extends BaseEvent {
  fromNode: string;
  toNode: string;
  tokenId: string;
  amount: string;
}

export interface NodeSellOrderPlacedEvent extends BaseEvent {
  nodeHash: string;
  tokenId: string;
  quoteToken: string;
  price: string;
  amount: string;
  orderId: string;
}

export interface ClobApprovalGrantedEvent extends BaseEvent {
  nodeHash: string;
  clobAddress: string;
}

export interface ClobApprovalRevokedEvent extends BaseEvent {
  nodeHash: string;
  clobAddress: string;
}

// ============================================================================
// CLOB Order Events
// ============================================================================

export interface OrderPlacedWithTokensEvent extends BaseEvent {
  orderId: string;
  maker: string;
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: string;
  amount: string;
  isBuy: boolean;
  orderType: string;
}

export interface OrderCreatedEvent extends BaseEvent {
  orderId: string;
  marketId: string;
  maker: string;
  price: string;
  amount: string;
  isBuy: boolean;
  orderType: string;
  timeInForce: string;
  expiry: string;
  nonce: string;
}

export interface CLOBOrderFilledEvent extends BaseEvent {
  orderId: string;
  tradeId: string;
  fillAmount: string;
  fillPrice: string;
  remainingAmount: string;
  cumulativeFilled: string;
}

export interface CLOBOrderCancelledEvent extends BaseEvent {
  orderId: string;
  maker: string;
  remainingAmount: string;
  reason: string;
}

export interface CLOBTradeExecutedEvent extends BaseEvent {
  tradeId: string;
  takerOrderId: string;
  makerOrderId: string;
  taker: string;
  maker: string;
  marketId: string;
  price: string;
  amount: string;
  quoteAmount: string;
  takerFee: string;
  makerFee: string;
  timestamp: string;
  takerIsBuy: boolean;
}

export interface OrderExpiredEvent extends BaseEvent {
  orderId: string;
  expiredAt: string;
}

export interface MarketCreatedEvent extends BaseEvent {
  marketId: string;
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
}

// ============================================================================
// Router Order Events
// ============================================================================

export interface RouterOrderPlacedEvent extends BaseEvent {
  orderId: string;
  maker: string;
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: string;
  amount: string;
  isBuy: boolean;
  orderType: string;
}

export interface RouterOrderCreatedEvent extends BaseEvent {
  orderId: string;
  marketId: string;
  maker: string;
  price: string;
  amount: string;
  isBuy: boolean;
  orderType: string;
  timeInForce: string;
  expiry: string;
  nonce: string;
}

export interface RouterOrderCancelledEvent extends BaseEvent {
  orderId: string;
  maker: string;
  remainingAmount: string;
  reason: string;
}

export interface OrderRoutedEvent extends BaseEvent {
  orderId: string;
  maker: string;
  orderSource: string;
  isBuy: boolean;
}

export interface RouterTradeExecutedEvent extends BaseEvent {
  tradeId: string;
  takerOrderId: string;
  makerOrderId: string;
  price: string;
  amount: string;
  quoteAmount: string;
}

// ============================================================================
// Ausys Matching Events
// ============================================================================

export interface AusysOrderFilledEvent extends BaseEvent {
  orderId: string;
  tradeId: string;
  fillAmount: string;
  fillPrice: string;
  remainingAmount: string;
  cumulativeFilled: string;
}

export interface MatchingOrderCancelledEvent extends BaseEvent {
  orderId: string;
  maker: string;
  remainingAmount: string;
  reason: string;
}

export interface TradeExecutedEvent extends BaseEvent {
  tradeId: string;
  takerOrderId: string;
  makerOrderId: string;
  price: string;
  amount: string;
  quoteAmount: string;
}

// ============================================================================
// Unified Order / Logistics Events
// ============================================================================

export interface UnifiedOrderCreatedEvent extends BaseEvent {
  unifiedOrderId: string;
  clobOrderId: string;
  buyer: string;
  seller: string;
  token: string;
  tokenId: string;
  quantity: string;
  price: string;
}

export interface LogisticsOrderCreatedEvent extends BaseEvent {
  unifiedOrderId: string;
  ausysOrderId: string;
  journeyIds: string;
  bounty: string;
  node: string;
}

export interface JourneyStatusUpdatedEvent extends BaseEvent {
  unifiedOrderId: string;
  journeyId: string;
  phase: string;
}

export interface TradeMatchedEvent extends BaseEvent {
  unifiedOrderId: string;
  clobTradeId: string;
  clobOrderId: string;
  maker: string;
  price: string;
  amount: string;
}

export interface OrderSettledEvent extends BaseEvent {
  unifiedOrderId: string;
  seller: string;
  sellerAmount: string;
  driver: string;
  driverAmount: string;
}

export interface BountyPaidEvent extends BaseEvent {
  unifiedOrderId: string;
  amount: string;
}

export interface BridgeOrderCancelledEvent extends BaseEvent {
  unifiedOrderId: string;
  previousStatus: string;
}

export interface BridgeFeeRecipientUpdatedEvent extends BaseEvent {
  oldRecipient: string;
  newRecipient: string;
}

// ============================================================================
// Opportunity/Staking Events
// ============================================================================

export interface OpportunityCreatedEvent extends BaseEvent {
  eventId: string;
  operator: string;
  inputToken: string;
  inputTokenId: string;
  targetAmount: string;
  promisedYieldBps: string;
}

export interface OpportunityFundedEvent extends BaseEvent {
  eventId: string;
  totalStaked: string;
}

export interface OpportunityCancelledEvent extends BaseEvent {
  eventId: string;
  reason: string;
}

export interface OpportunityCompletedEvent extends BaseEvent {
  opportunityId: string;
  totalProceeds: string;
}

export interface CommodityStakedEvent extends BaseEvent {
  opportunityId: string;
  staker: string;
  amount: string;
  totalStaked: string;
}

export interface CommodityUnstakedEvent extends BaseEvent {
  opportunityId: string;
  staker: string;
  amount: string;
}

export interface DeliveryStartedEvent extends BaseEvent {
  opportunityId: string;
  journeyId: string;
}

export interface DeliveryConfirmedEvent extends BaseEvent {
  opportunityId: string;
  deliveredAmount: string;
}

export interface ProcessingStartedEvent extends BaseEvent {
  opportunityId: string;
}

export interface ProcessingCompletedEvent extends BaseEvent {
  opportunityId: string;
  outputAmount: string;
  outputTokenId: string;
}

export interface SaleProceedsRecordedEvent extends BaseEvent {
  opportunityId: string;
  proceeds: string;
}

export interface ProfitDistributedEvent extends BaseEvent {
  opportunityId: string;
  staker: string;
  stakedAmount: string;
  profitShare: string;
}

export interface CollateralReturnedEvent extends BaseEvent {
  opportunityId: string;
  operator: string;
  amount: string;
}

export interface ConfigUpdatedEvent extends BaseEvent {
  param: string;
  oldValue: string;
  newValue: string;
}

// ============================================================================
// Operator Events
// ============================================================================

export interface OperatorApprovedEvent extends BaseEvent {
  operator: string;
}

export interface OperatorRevokedEvent extends BaseEvent {
  operator: string;
}

export interface OperatorSlashedEvent extends BaseEvent {
  opportunityId: string;
  operator: string;
  collateralToken: string;
  collateralTokenId: string;
  amount: string;
}

export interface OperatorReputationUpdatedEvent extends BaseEvent {
  operator: string;
  oldReputation: string;
  newReputation: string;
}

export interface OperatorStatsUpdatedEvent extends BaseEvent {
  operator: string;
  successfulOps: string;
  totalValueProcessed: string;
}

// ============================================================================
// Risk Management Events
// ============================================================================

export interface CircuitBreakerConfiguredEvent extends BaseEvent {
  marketId: string;
  priceChangeThreshold: string;
  cooldownPeriod: string;
  isEnabled: boolean;
}

export interface CircuitBreakerTrippedEvent extends BaseEvent {
  marketId: string;
  triggerPrice: string;
  previousPrice: string;
  changePercent: string;
  cooldownUntil: string;
}

export interface CircuitBreakerResetEvent extends BaseEvent {
  marketId: string;
  resetAt: string;
}

export interface EmergencyWithdrawalEvent extends BaseEvent {
  user: string;
  orderId: string;
  token: string;
  amount: string;
}

export interface EmergencyActionInitiatedEvent extends BaseEvent {
  actionId: string;
  initiator: string;
  token: string;
  recipient: string;
  amount: string;
  executeAfter: string;
}

export interface EmergencyActionExecutedEvent extends BaseEvent {
  actionId: string;
  executor: string;
  token: string;
  recipient: string;
  amount: string;
}

export interface EmergencyActionCancelledEvent extends BaseEvent {
  actionId: string;
  canceller: string;
}

export interface GlobalPauseEvent extends BaseEvent {
  paused: boolean;
}

export interface MarketPausedEvent extends BaseEvent {
  marketId: string;
}

export interface MarketUnpausedEvent extends BaseEvent {
  marketId: string;
}

export interface FeeRecipientUpdatedEvent extends BaseEvent {
  oldRecipient: string;
  newRecipient: string;
}

export interface FeesUpdatedEvent extends BaseEvent {
  takerFeeBps: string;
  makerFeeBps: string;
  lpFeeBps: string;
}

export interface RateLimitsUpdatedEvent extends BaseEvent {
  maxOrdersPerBlock: string;
  maxVolumePerBlock: string;
}

export interface MEVProtectionUpdatedEvent extends BaseEvent {
  minRevealDelay: string;
  commitmentThreshold: string;
}

// ============================================================================
// Diamond Events
// ============================================================================

export interface DiamondCutEvent extends BaseEvent {
  diamondCut: string;
  init: string;
  calldata: string;
}

export interface OwnershipTransferredEvent extends BaseEvent {
  previousOwner: string;
  newOwner: string;
}

export interface InitializedEvent extends BaseEvent {
  version: string;
}

// ============================================================================
// GraphQL Response Types
// ============================================================================

/** Generic response wrapper for paginated event queries */
export interface EventsGraphQLResponse<T> {
  items: T[];
  pageInfo?: PageInfo;
}

// Node events
export interface NodeRegisteredEventsResponse {
  diamondNodeRegisteredEventss: EventsGraphQLResponse<NodeRegisteredEvent>;
}

export interface NodeDeactivatedEventsResponse {
  diamondNodeDeactivatedEventss: EventsGraphQLResponse<NodeDeactivatedEvent>;
}

export interface UpdateLocationEventsResponse {
  diamondUpdateLocationEventss: EventsGraphQLResponse<UpdateLocationEvent>;
}

export interface UpdateStatusEventsResponse {
  diamondUpdateStatusEventss: EventsGraphQLResponse<UpdateStatusEvent>;
}

export interface SupportedAssetAddedEventsResponse {
  diamondSupportedAssetAddedEventss: EventsGraphQLResponse<SupportedAssetAddedEvent>;
}

// Order events
export interface OrderPlacedWithTokensEventsResponse {
  diamondOrderPlacedWithTokensEventss: EventsGraphQLResponse<OrderPlacedWithTokensEvent>;
}

export interface CLOBOrderFilledEventsResponse {
  diamondCLOBOrderFilledEventss: EventsGraphQLResponse<CLOBOrderFilledEvent>;
}

export interface CLOBOrderCancelledEventsResponse {
  diamondCLOBOrderCancelledEventss: EventsGraphQLResponse<CLOBOrderCancelledEvent>;
}

export interface RouterOrderPlacedEventsResponse {
  diamondRouterOrderPlacedEventss: EventsGraphQLResponse<RouterOrderPlacedEvent>;
}

// Unified order events
export interface UnifiedOrderCreatedEventsResponse {
  diamondUnifiedOrderCreatedEventss: EventsGraphQLResponse<UnifiedOrderCreatedEvent>;
}

export interface LogisticsOrderCreatedEventsResponse {
  diamondLogisticsOrderCreatedEventss: EventsGraphQLResponse<LogisticsOrderCreatedEvent>;
}

export interface JourneyStatusUpdatedEventsResponse {
  diamondJourneyStatusUpdatedEventss: EventsGraphQLResponse<JourneyStatusUpdatedEvent>;
}

export interface OrderSettledEventsResponse {
  diamondOrderSettledEventss: EventsGraphQLResponse<OrderSettledEvent>;
}

// ============================================================================
// Aggregated Domain Types (for repositories to produce)
// ============================================================================

/**
 * These types represent the aggregated state computed from raw events.
 * They are NOT stored in the indexer - repositories compute them.
 */

/** Order state computed from OrderPlacedWithTokens + Filled + Cancelled events */
export interface AggregatedOrder {
  orderId: string;
  maker: string;
  baseToken: string;
  baseTokenId: string;
  quoteToken: string;
  price: string;
  originalAmount: string;
  remainingAmount: string;
  cumulativeFilled: string;
  isBuy: boolean;
  orderType: string;
  status: 'open' | 'partial' | 'filled' | 'cancelled' | 'expired';
  createdAt: string;
  updatedAt: string;
  transactionHash: string;
}

/** Node state computed from NodeRegistered + UpdateLocation + UpdateStatus + Deactivated events */
export interface AggregatedNode {
  nodeHash: string;
  owner: string;
  nodeType: string;
  addressName: string;
  lat: string;
  lng: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Journey state computed from LogisticsOrderCreated + JourneyStatusUpdated events */
export interface AggregatedJourney {
  journeyId: string;
  unifiedOrderId: string;
  ausysOrderId: string;
  bounty: string;
  node: string;
  phase: string;
  createdAt: string;
  updatedAt: string;
}

/** Unified order state computed from UnifiedOrderCreated + TradeMatched + OrderSettled events */
export interface AggregatedUnifiedOrder {
  unifiedOrderId: string;
  clobOrderId: string;
  buyer: string;
  seller: string;
  token: string;
  tokenId: string;
  quantity: string;
  price: string;
  status: 'created' | 'matched' | 'settled' | 'cancelled';
  journeyIds: string[];
  createdAt: string;
  updatedAt: string;
}
