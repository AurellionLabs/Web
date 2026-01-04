import { ponder } from '@/generated';
import {
  rwyOpportunities,
  rwyStakes,
  rwyOperators,
  rwyOpportunityCreatedEvents,
  rwyCommodityStakedEvents,
  rwyCommodityUnstakedEvents,
  rwyOpportunityFundedEvents,
  rwyDeliveryStartedEvents,
  rwyDeliveryConfirmedEvents,
  rwyProcessingStartedEvents,
  rwyProcessingCompletedEvents,
  rwyProfitDistributedEvents,
  rwyOpportunityCancelledEvents,
  rwyOperatorSlashedEvents,
  rwyOperatorApprovedEvents,
  rwyOperatorRevokedEvents,
  rwyUserStats,
  rwyGlobalStats,
} from '../ponder.schema';

// ============ OPPORTUNITY CREATED ============
ponder.on('RWYVault:OpportunityCreated', async ({ event, context }) => {
  const { db } = context;
  const {
    opportunityId,
    operator,
    inputToken,
    inputTokenId,
    targetAmount,
    promisedYieldBps,
  } = event.args;

  // Create event record
  await db.insert(rwyOpportunityCreatedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    operator,
    inputToken,
    inputTokenId,
    targetAmount,
    promisedYieldBps: Number(promisedYieldBps),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Fetch full opportunity data from contract
  const opportunity = await context.client.readContract({
    address: event.log.address,
    abi: context.contracts.RWYVault.abi,
    functionName: 'getOpportunity',
    args: [opportunityId],
  });

  // Create/update opportunity entity
  await db.insert(rwyOpportunities).values({
    id: opportunityId,
    operator,
    name: opportunity.name,
    description: opportunity.description,
    inputToken,
    inputTokenId,
    targetAmount,
    stakedAmount: 0n,
    outputToken: opportunity.outputToken,
    outputTokenId: 0n,
    expectedOutputAmount: opportunity.expectedOutputAmount,
    promisedYieldBps: Number(promisedYieldBps),
    operatorFeeBps: Number(opportunity.operatorFeeBps),
    minSalePrice: opportunity.minSalePrice,
    operatorCollateral: opportunity.operatorCollateral,
    fundingDeadline: opportunity.fundingDeadline,
    processingDeadline: 0n,
    createdAt: event.block.timestamp,
    fundedAt: 0n,
    completedAt: 0n,
    status: 1, // FUNDING
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
    updatedAt: event.block.timestamp,
  });

  // Update operator stats
  await db
    .insert(rwyOperators)
    .values({
      id: operator,
      operator,
      approved: true,
      reputation: 0,
      successfulOps: 0,
      totalValueProcessed: 0n,
      totalOpportunities: 1,
      activeOpportunities: 1,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoUpdate({
      totalOpportunities: (row) => row.totalOpportunities + 1,
      activeOpportunities: (row) => row.activeOpportunities + 1,
      updatedAt: event.block.timestamp,
    });

  // Update global stats
  await db
    .insert(rwyGlobalStats)
    .values({
      id: 'global',
      totalOpportunities: 1,
      activeOpportunities: 1,
      completedOpportunities: 0,
      totalValueStaked: 0n,
      totalValueDistributed: 0n,
      totalOperators: 1,
      totalStakers: 0,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoUpdate({
      totalOpportunities: (row) => row.totalOpportunities + 1,
      activeOpportunities: (row) => row.activeOpportunities + 1,
      updatedAt: event.block.timestamp,
    });
});

// ============ COMMODITY STAKED ============
ponder.on('RWYVault:CommodityStaked', async ({ event, context }) => {
  const { db } = context;
  const { opportunityId, staker, amount, totalStaked } = event.args;

  // Create event record
  await db.insert(rwyCommodityStakedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    staker,
    amount,
    totalStaked,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update or create stake
  const stakeId = `${opportunityId}-${staker}`;
  await db
    .insert(rwyStakes)
    .values({
      id: stakeId,
      opportunityId,
      staker,
      amount,
      stakedAt: event.block.timestamp,
      claimed: false,
      claimedAmount: 0n,
      claimedAt: 0n,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoUpdate({
      amount: (row) => row.amount + amount,
      updatedAt: event.block.timestamp,
    });

  // Update opportunity
  await db.update(rwyOpportunities, { id: opportunityId }).set({
    stakedAmount: totalStaked,
    updatedAt: event.block.timestamp,
  });

  // Update user stats
  await db
    .insert(rwyUserStats)
    .values({
      id: staker,
      user: staker,
      totalStaked: amount,
      totalClaimed: 0n,
      totalProfit: 0n,
      activeStakes: 1,
      completedStakes: 0,
      firstStakeAt: event.block.timestamp,
      lastStakeAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoUpdate({
      totalStaked: (row) => row.totalStaked + amount,
      activeStakes: (row) => row.activeStakes + 1,
      lastStakeAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });

  // Update global stats
  await db.update(rwyGlobalStats, { id: 'global' }).set({
    totalValueStaked: (row) => row.totalValueStaked + amount,
    updatedAt: event.block.timestamp,
  });
});

// ============ COMMODITY UNSTAKED ============
ponder.on('RWYVault:CommodityUnstaked', async ({ event, context }) => {
  const { db } = context;
  const { opportunityId, staker, amount } = event.args;

  // Create event record
  await db.insert(rwyCommodityUnstakedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    staker,
    amount,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update stake
  const stakeId = `${opportunityId}-${staker}`;
  await db.update(rwyStakes, { id: stakeId }).set({
    amount: (row) => row.amount - amount,
    updatedAt: event.block.timestamp,
  });

  // Update opportunity
  await db.update(rwyOpportunities, { id: opportunityId }).set({
    stakedAmount: (row) => row.stakedAmount - amount,
    updatedAt: event.block.timestamp,
  });

  // Update user stats
  await db.update(rwyUserStats, { id: staker }).set({
    totalStaked: (row) => row.totalStaked - amount,
    updatedAt: event.block.timestamp,
  });

  // Update global stats
  await db.update(rwyGlobalStats, { id: 'global' }).set({
    totalValueStaked: (row) => row.totalValueStaked - amount,
    updatedAt: event.block.timestamp,
  });
});

// ============ OPPORTUNITY FUNDED ============
ponder.on('RWYVault:OpportunityFunded', async ({ event, context }) => {
  const { db } = context;
  const { opportunityId, totalAmount } = event.args;

  // Create event record
  await db.insert(rwyOpportunityFundedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    totalAmount,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Fetch updated opportunity from contract
  const opportunity = await context.client.readContract({
    address: event.log.address,
    abi: context.contracts.RWYVault.abi,
    functionName: 'getOpportunity',
    args: [opportunityId],
  });

  // Update opportunity
  await db.update(rwyOpportunities, { id: opportunityId }).set({
    status: 2, // FUNDED
    fundedAt: event.block.timestamp,
    processingDeadline: opportunity.processingDeadline,
    updatedAt: event.block.timestamp,
  });
});

// ============ DELIVERY STARTED ============
ponder.on('RWYVault:DeliveryStarted', async ({ event, context }) => {
  const { db } = context;
  const { opportunityId, journeyId } = event.args;

  // Create event record
  await db.insert(rwyDeliveryStartedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    journeyId,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update opportunity
  await db.update(rwyOpportunities, { id: opportunityId }).set({
    status: 3, // IN_TRANSIT
    updatedAt: event.block.timestamp,
  });
});

// ============ DELIVERY CONFIRMED ============
ponder.on('RWYVault:DeliveryConfirmed', async ({ event, context }) => {
  const { db } = context;
  const { opportunityId, deliveredAmount } = event.args;

  // Create event record
  await db.insert(rwyDeliveryConfirmedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    deliveredAmount,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

// ============ PROCESSING STARTED ============
ponder.on('RWYVault:ProcessingStarted', async ({ event, context }) => {
  const { db } = context;
  const { opportunityId } = event.args;

  // Create event record
  await db.insert(rwyProcessingStartedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update opportunity
  await db.update(rwyOpportunities, { id: opportunityId }).set({
    status: 4, // PROCESSING
    updatedAt: event.block.timestamp,
  });
});

// ============ PROCESSING COMPLETED ============
ponder.on('RWYVault:ProcessingCompleted', async ({ event, context }) => {
  const { db } = context;
  const { opportunityId, outputAmount, outputTokenId } = event.args;

  // Create event record
  await db.insert(rwyProcessingCompletedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    outputAmount,
    outputTokenId,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update opportunity
  await db.update(rwyOpportunities, { id: opportunityId }).set({
    status: 5, // SELLING
    outputTokenId,
    updatedAt: event.block.timestamp,
  });
});

// ============ PROFIT DISTRIBUTED ============
ponder.on('RWYVault:ProfitDistributed', async ({ event, context }) => {
  const { db } = context;
  const { opportunityId, staker, principal, profit } = event.args;

  // Create event record
  await db.insert(rwyProfitDistributedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    staker,
    principal,
    profit,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update stake
  const stakeId = `${opportunityId}-${staker}`;
  await db.update(rwyStakes, { id: stakeId }).set({
    claimed: true,
    claimedAmount: profit,
    claimedAt: event.block.timestamp,
    updatedAt: event.block.timestamp,
  });

  // Update user stats
  await db.update(rwyUserStats, { id: staker }).set({
    totalClaimed: (row) => row.totalClaimed + profit,
    totalProfit: (row) => row.totalProfit + profit,
    activeStakes: (row) => row.activeStakes - 1,
    completedStakes: (row) => row.completedStakes + 1,
    updatedAt: event.block.timestamp,
  });

  // Update global stats
  await db.update(rwyGlobalStats, { id: 'global' }).set({
    totalValueDistributed: (row) => row.totalValueDistributed + profit,
    updatedAt: event.block.timestamp,
  });
});

// ============ OPPORTUNITY CANCELLED ============
ponder.on('RWYVault:OpportunityCancelled', async ({ event, context }) => {
  const { db } = context;
  const { opportunityId, reason } = event.args;

  // Create event record
  await db.insert(rwyOpportunityCancelledEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    reason,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Get opportunity to find operator
  const opportunity = await db.find(rwyOpportunities, { id: opportunityId });

  // Update opportunity
  await db.update(rwyOpportunities, { id: opportunityId }).set({
    status: 8, // CANCELLED
    updatedAt: event.block.timestamp,
  });

  // Update operator stats
  if (opportunity) {
    await db.update(rwyOperators, { id: opportunity.operator }).set({
      activeOpportunities: (row) => row.activeOpportunities - 1,
      updatedAt: event.block.timestamp,
    });
  }

  // Update global stats
  await db.update(rwyGlobalStats, { id: 'global' }).set({
    activeOpportunities: (row) => row.activeOpportunities - 1,
    updatedAt: event.block.timestamp,
  });
});

// ============ OPERATOR SLASHED ============
ponder.on('RWYVault:OperatorSlashed', async ({ event, context }) => {
  const { db } = context;
  const { opportunityId, operator, slashedAmount } = event.args;

  // Create event record
  await db.insert(rwyOperatorSlashedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    opportunityId,
    operator,
    slashedAmount,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update operator reputation (decrease)
  await db.update(rwyOperators, { id: operator }).set({
    reputation: (row) => Math.max(0, row.reputation - 20),
    updatedAt: event.block.timestamp,
  });

  // Update opportunity collateral
  await db.update(rwyOpportunities, { id: opportunityId }).set({
    operatorCollateral: (row) => row.operatorCollateral - slashedAmount,
    updatedAt: event.block.timestamp,
  });
});

// ============ OPERATOR APPROVED ============
ponder.on('RWYVault:OperatorApproved', async ({ event, context }) => {
  const { db } = context;
  const { operator } = event.args;

  // Create event record
  await db.insert(rwyOperatorApprovedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    operator,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Create or update operator
  await db
    .insert(rwyOperators)
    .values({
      id: operator,
      operator,
      approved: true,
      reputation: 0,
      successfulOps: 0,
      totalValueProcessed: 0n,
      totalOpportunities: 0,
      activeOpportunities: 0,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    })
    .onConflictDoUpdate({
      approved: true,
      updatedAt: event.block.timestamp,
    });

  // Update global stats
  await db.update(rwyGlobalStats, { id: 'global' }).set({
    totalOperators: (row) => row.totalOperators + 1,
    updatedAt: event.block.timestamp,
  });
});

// ============ OPERATOR REVOKED ============
ponder.on('RWYVault:OperatorRevoked', async ({ event, context }) => {
  const { db } = context;
  const { operator } = event.args;

  // Create event record
  await db.insert(rwyOperatorRevokedEvents).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    operator,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update operator
  await db.update(rwyOperators, { id: operator }).set({
    approved: false,
    updatedAt: event.block.timestamp,
  });

  // Update global stats
  await db.update(rwyGlobalStats, { id: 'global' }).set({
    totalOperators: (row) => row.totalOperators - 1,
    updatedAt: event.block.timestamp,
  });
});
