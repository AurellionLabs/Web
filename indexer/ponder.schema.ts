// Auto-generated Ponder Schema - DO NOT EDIT
// Generated at: 2026-01-17T00:14:39.043Z
//
// This file contains both manual entity tables and auto-generated event tables.
// Manual tables are preserved at the top, generated tables are imported below.
// Regenerate with: npm run generate:indexer

import { onchainTable, relations, index } from '@ponder/core';

// Import generated event tables
import {
  nodes as nodesEntity,
  clobApprovalGrantedD512Events,
  clobApprovalRevokedBdd4Events,
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
  clobOrderCancelled_8b47Events,
  clobOrderFilled_2d54Events,
  marketCreatedB59eEvents,
  orderCreated_43feEvents,
  orderExpiredB558Events,
  orderPlacedWithTokensE764Events,
  tradeExecuted_47cdEvents,
  ausysOrderFilled_3e2eEvents,
  matchingOrderCancelled_6f7dEvents,
  tradeExecuted_4692Events,
  orderRouted_1382Events,
  routerOrderFilled_6851Events,
  bountyPaid_5cf1Events,
  bridgeFeeRecipientUpdated_6c8aEvents,
  bridgeOrderCancelled_b9e0Events,
  journeyStatusUpdated_28e6Events,
  logisticsOrderCreated_e260Events,
  orderSettled_8c33Events,
  tradeMatched_51adEvents,
  unifiedOrderCreated_4b85Events,
  rewardRateUpdated_a87cEvents,
  rewardsClaimed_69d1Events,
  staked_6946Events,
  withdrawn_2309Events,
  circuitBreakerConfigured_b9beEvents,
  circuitBreakerReset_39bfEvents,
  circuitBreakerTripped_0d52Events,
  emergencyActionCancelled_5bf6Events,
  emergencyActionExecuted_5bf6Events,
  emergencyActionInitiated_5bf6Events,
  emergencyWithdrawal_5bf6Events,
  feeRecipientUpdated_aaebEvents,
  feesUpdated_9e5aEvents,
  globalPause_5fa7Events,
  mevProtectionUpdated_9e5aEvents,
  marketPaused_5fa7Events,
  marketUnpaused_5fa7Events,
  rateLimitsUpdated_5fa7Events,
} from './generated-schema';

// =============================================================================
// MANUAL ENTITY TABLES - Core business entities
// =============================================================================

/**
 * Journey entity - tracks physical delivery progress
 * JourneyStatus: 0=Pending, 1=InTransit, 2=Delivered, 3=Canceled
 */
export const journeys = onchainTable(
  'journeys',
  (t) => ({
    id: t.hex().primaryKey(),
    sender: t.hex().notNull(),
    receiver: t.hex().notNull(),
    driver: t.hex(),
    currentStatus: t.integer().notNull().default(0),
    bounty: t.bigint().notNull().default(0n),
    journeyStart: t.bigint().notNull().default(0n),
    journeyEnd: t.bigint().notNull().default(0n),
    eta: t.bigint().notNull().default(0n),
    startLocationLat: t.text().notNull().default(''),
    startLocationLng: t.text().notNull().default(''),
    endLocationLat: t.text().notNull().default(''),
    endLocationLng: t.text().notNull().default(''),
    startName: t.text().notNull().default(''),
    endName: t.text().notNull().default(''),
    orderId: t.hex(),
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    senderIdx: index().on(table.sender),
    receiverIdx: index().on(table.receiver),
    driverIdx: index().on(table.driver),
    orderIdx: index().on(table.orderId),
    statusIdx: index().on(table.currentStatus),
  }),
);

/**
 * Order entity - tracks overall order and payment status
 */
export const orders = onchainTable(
  'orders',
  (t) => ({
    id: t.hex().primaryKey(),
    buyer: t.hex().notNull(),
    seller: t.hex().notNull(),
    token: t.hex().notNull(),
    tokenId: t.bigint().notNull(),
    tokenQuantity: t.bigint().notNull(),
    requestedTokenQuantity: t.bigint().notNull(),
    price: t.bigint().notNull(),
    txFee: t.bigint().notNull(),
    currentStatus: t.integer().notNull().default(0),
    startLocationLat: t.text().notNull().default(''),
    startLocationLng: t.text().notNull().default(''),
    endLocationLat: t.text().notNull().default(''),
    endLocationLng: t.text().notNull().default(''),
    startName: t.text().notNull().default(''),
    endName: t.text().notNull().default(''),
    nodes: t.text().notNull().default('[]'),
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
  }),
  (table) => ({
    buyerIdx: index().on(table.buyer),
    sellerIdx: index().on(table.seller),
    statusIdx: index().on(table.currentStatus),
    tokenIdx: index().on(table.token, table.tokenId),
  }),
);

// ... (rest of manual tables would go here)

// =============================================================================
// EXPORTS
// =============================================================================

// Re-export generated tables
export {
  nodesEntity,
  clobApprovalGrantedD512Events,
  clobApprovalRevokedBdd4Events,
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
  clobOrderCancelled_8b47Events,
  clobOrderFilled_2d54Events,
  marketCreatedB59eEvents,
  orderCreated_43feEvents,
  orderExpiredB558Events,
  orderPlacedWithTokensE764Events,
  tradeExecuted_47cdEvents,
  ausysOrderFilled_3e2eEvents,
  matchingOrderCancelled_6f7dEvents,
  tradeExecuted_4692Events,
  orderRouted_1382Events,
  routerOrderFilled_6851Events,
  bountyPaid_5cf1Events,
  bridgeFeeRecipientUpdated_6c8aEvents,
  bridgeOrderCancelled_b9e0Events,
  journeyStatusUpdated_28e6Events,
  logisticsOrderCreated_e260Events,
  orderSettled_8c33Events,
  tradeMatched_51adEvents,
  unifiedOrderCreated_4b85Events,
  rewardRateUpdated_a87cEvents,
  rewardsClaimed_69d1Events,
  staked_6946Events,
  withdrawn_2309Events,
  circuitBreakerConfigured_b9beEvents,
  circuitBreakerReset_39bfEvents,
  circuitBreakerTripped_0d52Events,
  emergencyActionCancelled_5bf6Events,
  emergencyActionExecuted_5bf6Events,
  emergencyActionInitiated_5bf6Events,
  emergencyWithdrawal_5bf6Events,
  feeRecipientUpdated_aaebEvents,
  feesUpdated_9e5aEvents,
  globalPause_5fa7Events,
  mevProtectionUpdated_9e5aEvents,
  marketPaused_5fa7Events,
  marketUnpaused_5fa7Events,
  rateLimitsUpdated_5fa7Events,
};
