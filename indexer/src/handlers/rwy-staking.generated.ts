// Auto-generated handler for rwy-staking domain - Raw event storage only
// Generated at: 2026-02-28T13:27:27.120Z
//
// Pure Dumb Indexer: Store raw events only, NO aggregate tables
// All aggregation happens in frontend repository layer
// Events from: RWYStakingFacet

import { ponder } from 'ponder:registry';

// Import event tables from generated schema
import {
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
} from 'ponder:schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// RWYStakingFacet Events
// =============================================================================

/**
 * Handle CollateralReturned event from RWYStakingFacet
 * Signature: CollateralReturned(bytes32,address,uint256)
 * Hash: 0x8606a781
 */
ponder.on('Diamond:CollateralReturned', async ({ event, context }) => {
  const { opportunityId, operator, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondCollateralReturnedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    operator: operator,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle CommodityStaked event from RWYStakingFacet
 * Signature: CommodityStaked(bytes32,address,uint256,uint256)
 * Hash: 0xdbd49b34
 */
ponder.on('Diamond:CommodityStaked', async ({ event, context }) => {
  const { opportunityId, staker, amount, totalStaked } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondCommodityStakedEvents).values({
    id: id,
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
 * Handle CommodityUnstaked event from RWYStakingFacet
 * Signature: CommodityUnstaked(bytes32,address,uint256)
 * Hash: 0x24b492cf
 */
ponder.on('Diamond:CommodityUnstaked', async ({ event, context }) => {
  const { opportunityId, staker, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondCommodityUnstakedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    staker: staker,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle ConfigUpdated event from RWYStakingFacet
 * Signature: ConfigUpdated(string,uint256,uint256)
 * Hash: 0xd7474166
 */
ponder.on('Diamond:ConfigUpdated', async ({ event, context }) => {
  const { param, oldValue, newValue } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondConfigUpdatedEvents).values({
    id: id,
    param: param,
    old_value: oldValue,
    new_value: newValue,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle CustodyProofSubmitted event from RWYStakingFacet
 * Signature: CustodyProofSubmitted(bytes32,string,string,address,uint256)
 * Hash: 0x51d9b1fc
 */
ponder.on('Diamond:CustodyProofSubmitted', async ({ event, context }) => {
  const { opportunityId, documentUri, proofType, submitter, timestamp } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondCustodyProofSubmittedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    document_uri: documentUri,
    proof_type: proofType,
    submitter: submitter,
    timestamp: timestamp,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle DeliveryConfirmed event from RWYStakingFacet
 * Signature: DeliveryConfirmed(bytes32,uint256)
 * Hash: 0x1c0fcf44
 */
ponder.on('Diamond:DeliveryConfirmed', async ({ event, context }) => {
  const { opportunityId, deliveredAmount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondDeliveryConfirmedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    delivered_amount: deliveredAmount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle DeliveryStarted event from RWYStakingFacet
 * Signature: DeliveryStarted(bytes32,bytes32)
 * Hash: 0xec8d4528
 */
ponder.on('Diamond:DeliveryStarted', async ({ event, context }) => {
  const { opportunityId, journeyId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondDeliveryStartedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    journey_id: journeyId,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle InsuranceUpdated event from RWYStakingFacet
 * Signature: InsuranceUpdated(bytes32,bool,string,uint256,uint256)
 * Hash: 0xaf953efb
 */
ponder.on('Diamond:InsuranceUpdated', async ({ event, context }) => {
  const { opportunityId, isInsured, documentUri, coverageAmount, expiryDate } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondInsuranceUpdatedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    is_insured: isInsured,
    document_uri: documentUri,
    coverage_amount: coverageAmount,
    expiry_date: expiryDate,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OpportunityCancelled event from RWYStakingFacet
 * Signature: OpportunityCancelled(bytes32,string)
 * Hash: 0xd3955fc1
 */
ponder.on('Diamond:OpportunityCancelled', async ({ event, context }) => {
  const { id: arg_id, reason } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOpportunityCancelledEvents).values({
    id: id,
    event_id: arg_id,
    reason: reason,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OpportunityCompleted event from RWYStakingFacet
 * Signature: OpportunityCompleted(bytes32,uint256)
 * Hash: 0x5d494cc2
 */
ponder.on('Diamond:OpportunityCompleted', async ({ event, context }) => {
  const { opportunityId, totalProceeds } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOpportunityCompletedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    total_proceeds: totalProceeds,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle OpportunityCreated event from RWYStakingFacet
 * Signature: OpportunityCreated(bytes32,address,address,uint256,uint256,uint256)
 * Hash: 0x1e5c8915
 */
ponder.on('Diamond:OpportunityCreated', async ({ event, context }) => {
  const {
    id: arg_id,
    operator,
    inputToken,
    inputTokenId,
    targetAmount,
    promisedYieldBps,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOpportunityCreatedEvents).values({
    id: id,
    event_id: arg_id,
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
 * Handle OpportunityFunded event from RWYStakingFacet
 * Signature: OpportunityFunded(bytes32,uint256)
 * Hash: 0xef294796
 */
ponder.on('Diamond:OpportunityFunded', async ({ event, context }) => {
  const { id: arg_id, totalStaked } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondOpportunityFundedEvents).values({
    id: id,
    event_id: arg_id,
    total_staked: totalStaked,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle ProcessingCompleted event from RWYStakingFacet
 * Signature: ProcessingCompleted(bytes32,uint256,uint256)
 * Hash: 0x85ee5e30
 */
ponder.on('Diamond:ProcessingCompleted', async ({ event, context }) => {
  const { opportunityId, outputAmount, outputTokenId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondProcessingCompletedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    output_amount: outputAmount,
    output_token_id: outputTokenId,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle ProcessingStarted event from RWYStakingFacet
 * Signature: ProcessingStarted(bytes32)
 * Hash: 0xcc013089
 */
ponder.on('Diamond:ProcessingStarted', async ({ event, context }) => {
  const { opportunityId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondProcessingStartedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle ProfitDistributed event from RWYStakingFacet
 * Signature: ProfitDistributed(bytes32,address,uint256,uint256)
 * Hash: 0x275d0197
 */
ponder.on('Diamond:ProfitDistributed', async ({ event, context }) => {
  const { opportunityId, staker, stakedAmount, profitShare } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondProfitDistributedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    staker: staker,
    staked_amount: stakedAmount,
    profit_share: profitShare,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle SaleProceedsRecorded event from RWYStakingFacet
 * Signature: SaleProceedsRecorded(bytes32,uint256)
 * Hash: 0x4f6725f3
 */
ponder.on('Diamond:SaleProceedsRecorded', async ({ event, context }) => {
  const { opportunityId, proceeds } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondSaleProceedsRecordedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    proceeds: proceeds,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TokenizationProofSubmitted event from RWYStakingFacet
 * Signature: TokenizationProofSubmitted(bytes32,string,address,uint256)
 * Hash: 0x979c2cf4
 */
ponder.on('Diamond:TokenizationProofSubmitted', async ({ event, context }) => {
  const { opportunityId, documentUri, submitter, timestamp } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondTokenizationProofSubmittedEvents).values({
    id: id,
    opportunity_id: opportunityId,
    document_uri: documentUri,
    submitter: submitter,
    timestamp: timestamp,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
