// Auto-generated handler for rwy-vault domain - Raw event storage only
// Generated at: 2026-01-13T22:55:31.504Z
//
// Dumb indexer pattern: Store raw events, aggregate in repository layer
// Events from: RWYVault

import { ponder } from '@/generated';

// Import event tables (auto-generated from ABI)
import { commodityStakedDbd4Events } from '../../generated-schema';
import { commodityUnstaked_24b4Events } from '../../generated-schema';
import { deliveryConfirmed_1c0fEvents } from '../../generated-schema';
import { deliveryStartedEc8dEvents } from '../../generated-schema';
import { operatorApprovedF338Events } from '../../generated-schema';
import { operatorRevokedA5f3Events } from '../../generated-schema';
import { operatorSlashed_4674Events } from '../../generated-schema';
import { opportunityCancelledD395Events } from '../../generated-schema';
import { opportunityCreated_1e5cEvents } from '../../generated-schema';
import { opportunityFundedEf29Events } from '../../generated-schema';
import { paused_62e7Events } from '../../generated-schema';
import { processingCompleted_85eeEvents } from '../../generated-schema';
import { processingStartedCc01Events } from '../../generated-schema';
import { profitDistributed_275dEvents } from '../../generated-schema';
import { saleOrderCreatedFd82Events } from '../../generated-schema';
import { unpaused_5db9Events } from '../../generated-schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// RWYVault Events
// =============================================================================

/**
 * Handle CommodityStaked event from RWYVault
 * Signature: CommodityStaked(bytes32,address,uint256,uint256)
 * Hash: 0xdbd49b34
 */
ponder.on('RWYVault:CommodityStaked', async ({ event, context }) => {
  const { opportunityId, staker, amount, totalStaked } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(commodityStakedDbd4Events).values({
    id,
    opportunity_id: opportunityId,
    staker: staker,
    amount: amount,
    total_staked: totalStaked,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle CommodityUnstaked event from RWYVault
 * Signature: CommodityUnstaked(bytes32,address,uint256)
 * Hash: 0x24b492cf
 */
ponder.on('RWYVault:CommodityUnstaked', async ({ event, context }) => {
  const { opportunityId, staker, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(commodityUnstaked_24b4Events).values({
    id,
    opportunity_id: opportunityId,
    staker: staker,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle DeliveryConfirmed event from RWYVault
 * Signature: DeliveryConfirmed(bytes32,uint256)
 * Hash: 0x1c0fcf44
 */
ponder.on('RWYVault:DeliveryConfirmed', async ({ event, context }) => {
  const { opportunityId, deliveredAmount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(deliveryConfirmed_1c0fEvents).values({
    id,
    opportunity_id: opportunityId,
    delivered_amount: deliveredAmount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle DeliveryStarted event from RWYVault
 * Signature: DeliveryStarted(bytes32,bytes32)
 * Hash: 0xec8d4528
 */
ponder.on('RWYVault:DeliveryStarted', async ({ event, context }) => {
  const { opportunityId, journeyId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(deliveryStartedEc8dEvents).values({
    id,
    opportunity_id: opportunityId,
    journey_id: journeyId,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OperatorApproved event from RWYVault
 * Signature: OperatorApproved(address)
 * Hash: 0xf338da91
 */
ponder.on('RWYVault:OperatorApproved', async ({ event, context }) => {
  const { operator } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(operatorApprovedF338Events).values({
    id,
    operator: operator,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OperatorRevoked event from RWYVault
 * Signature: OperatorRevoked(address)
 * Hash: 0xa5f3b762
 */
ponder.on('RWYVault:OperatorRevoked', async ({ event, context }) => {
  const { operator } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(operatorRevokedA5f3Events).values({
    id,
    operator: operator,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OperatorSlashed event from RWYVault
 * Signature: OperatorSlashed(bytes32,address,uint256)
 * Hash: 0x4674c0ba
 */
ponder.on('RWYVault:OperatorSlashed', async ({ event, context }) => {
  const { opportunityId, operator, slashedAmount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(operatorSlashed_4674Events).values({
    id,
    opportunity_id: opportunityId,
    operator: operator,
    slashed_amount: slashedAmount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OpportunityCancelled event from RWYVault
 * Signature: OpportunityCancelled(bytes32,string)
 * Hash: 0xd3955fc1
 */
ponder.on('RWYVault:OpportunityCancelled', async ({ event, context }) => {
  const { opportunityId, reason } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(opportunityCancelledD395Events).values({
    id,
    opportunity_id: opportunityId,
    reason: reason,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OpportunityCreated event from RWYVault
 * Signature: OpportunityCreated(bytes32,address,address,uint256,uint256,uint256)
 * Hash: 0x1e5c8915
 */
ponder.on('RWYVault:OpportunityCreated', async ({ event, context }) => {
  const {
    opportunityId,
    operator,
    inputToken,
    inputTokenId,
    targetAmount,
    promisedYieldBps,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(opportunityCreated_1e5cEvents).values({
    id,
    opportunity_id: opportunityId,
    operator: operator,
    input_token: inputToken,
    input_token_id: inputTokenId,
    target_amount: targetAmount,
    promised_yield_bps: promisedYieldBps,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OpportunityFunded event from RWYVault
 * Signature: OpportunityFunded(bytes32,uint256)
 * Hash: 0xef294796
 */
ponder.on('RWYVault:OpportunityFunded', async ({ event, context }) => {
  const { opportunityId, totalAmount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(opportunityFundedEf29Events).values({
    id,
    opportunity_id: opportunityId,
    total_amount: totalAmount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle Paused event from RWYVault
 * Signature: Paused(address)
 * Hash: 0x62e78cea
 */
ponder.on('RWYVault:Paused', async ({ event, context }) => {
  const { account } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(paused_62e7Events).values({
    id,
    account: account,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle ProcessingCompleted event from RWYVault
 * Signature: ProcessingCompleted(bytes32,uint256,uint256)
 * Hash: 0x85ee5e30
 */
ponder.on('RWYVault:ProcessingCompleted', async ({ event, context }) => {
  const { opportunityId, outputAmount, outputTokenId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(processingCompleted_85eeEvents).values({
    id,
    opportunity_id: opportunityId,
    output_amount: outputAmount,
    output_token_id: outputTokenId,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle ProcessingStarted event from RWYVault
 * Signature: ProcessingStarted(bytes32)
 * Hash: 0xcc013089
 */
ponder.on('RWYVault:ProcessingStarted', async ({ event, context }) => {
  const { opportunityId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(processingStartedCc01Events).values({
    id,
    opportunity_id: opportunityId,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle ProfitDistributed event from RWYVault
 * Signature: ProfitDistributed(bytes32,address,uint256,uint256)
 * Hash: 0x275d0197
 */
ponder.on('RWYVault:ProfitDistributed', async ({ event, context }) => {
  const { opportunityId, staker, principal, profit } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(profitDistributed_275dEvents).values({
    id,
    opportunity_id: opportunityId,
    staker: staker,
    principal: principal,
    profit: profit,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle SaleOrderCreated event from RWYVault
 * Signature: SaleOrderCreated(bytes32,bytes32,uint256,uint256)
 * Hash: 0xfd82109e
 */
ponder.on('RWYVault:SaleOrderCreated', async ({ event, context }) => {
  const { opportunityId, clobOrderId, amount, price } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(saleOrderCreatedFd82Events).values({
    id,
    opportunity_id: opportunityId,
    clob_order_id: clobOrderId,
    amount: amount,
    price: price,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle Unpaused event from RWYVault
 * Signature: Unpaused(address)
 * Hash: 0x5db9ee0a
 */
ponder.on('RWYVault:Unpaused', async ({ event, context }) => {
  const { account } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(unpaused_5db9Events).values({
    id,
    account: account,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
