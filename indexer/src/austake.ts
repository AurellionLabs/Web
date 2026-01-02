import { ponder } from '@/generated';
import {
  operations,
  stakes,
  operationCreatedEvents,
  stakedEvents,
  unstakedEvents,
  rewardPaidEvents,
  adminStatusChangedEvents,
  userStakeStats,
  tokenStakeStats,
} from '../ponder.schema';

// =============================================================================
// AUSTAKE EVENT HANDLERS - Staking Operations
// =============================================================================

/**
 * Handle OperationCreated event
 */
ponder.on('AuStake:OperationCreated', async ({ event, context }) => {
  const { operationId, name, token } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Try to get additional operation data from contract
  let operationData = {
    description: '',
    provider: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    deadline: 0n,
    startDate: 0n,
    rwaName: '',
    reward: 0n,
    tokenTvl: 0n,
    operationStatus: 0,
    fundingGoal: 0n,
    assetPrice: 0n,
  };

  try {
    const operation = await context.client.readContract({
      abi: context.contracts.AuStake.abi,
      address: context.contracts.AuStake.address,
      functionName: 'getOperation',
      args: [operationId],
    });
    operationData = {
      description: operation.description,
      provider: operation.provider,
      deadline: operation.deadline,
      startDate: operation.startDate,
      rwaName: operation.rwaName,
      reward: operation.reward,
      tokenTvl: operation.tokenTvl,
      operationStatus: operation.operationStatus,
      fundingGoal: operation.fundingGoal,
      assetPrice: operation.assetPrice,
    };
  } catch (e) {
    console.warn(`Failed to get operation data for ${operationId}:`, e);
  }

  // Map status number to string
  const statusMap: { [key: number]: string } = {
    0: 'INACTIVE',
    1: 'ACTIVE',
    2: 'COMPLETE',
    3: 'PAID',
  };

  // Insert Operation entity
  await context.db
    .insert(operations)
    .values({
      id: operationId,
      name,
      description: operationData.description,
      token,
      provider: operationData.provider,
      deadline: operationData.deadline,
      startDate: operationData.startDate,
      rwaName: operationData.rwaName,
      reward: operationData.reward,
      tokenTvl: operationData.tokenTvl,
      operationStatus: statusMap[operationData.operationStatus] || 'INACTIVE',
      fundingGoal: operationData.fundingGoal,
      assetPrice: operationData.assetPrice,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Insert OperationCreated event
  await context.db.insert(operationCreatedEvents).values({
    id: eventId,
    opCreatedOperationId: operationId,
    name,
    token,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update TokenStakeStats
  const tokenStakeStatsRecord = await context.db.find(tokenStakeStats, {
    id: token,
  });
  if (tokenStakeStatsRecord) {
    await context.db.update(tokenStakeStats, { id: token }).set({
      totalOperations: tokenStakeStatsRecord.totalOperations + 1n,
      updatedAt: event.block.timestamp,
    });
  } else {
    await context.db
      .insert(tokenStakeStats)
      .values({
        id: token,
        token,
        totalTvl: 0n,
        totalStakers: 0n,
        totalOperations: 1n,
        averageReward: 0n,
        updatedAt: event.block.timestamp,
      })
      .onConflictDoNothing();
  }
});

/**
 * Handle Staked event
 */
ponder.on('AuStake:Staked', async ({ event, context }) => {
  const { token, user, amount, operationId, eType, time } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
  const stakeId = `${operationId}-${user.toLowerCase()}`;

  // Insert Staked event
  await context.db.insert(stakedEvents).values({
    id: eventId,
    token,
    user,
    amount,
    stakedOperationId: operationId,
    eType,
    time,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Create or update Stake entity
  const existingStake = await context.db.find(stakes, { id: stakeId });
  if (existingStake) {
    await context.db.update(stakes, { id: stakeId }).set({
      amount: existingStake.amount + amount,
      timestamp: time,
      isActive: true,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  } else {
    await context.db
      .insert(stakes)
      .values({
        id: stakeId,
        stakeOperationId: operationId,
        user,
        token,
        amount,
        timestamp: time,
        isActive: true,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();
  }

  // Update Operation TVL
  const operation = await context.db.find(operations, { id: operationId });
  if (operation) {
    await context.db.update(operations, { id: operationId }).set({
      tokenTvl: operation.tokenTvl + amount,
      updatedAt: event.block.timestamp,
    });
  }

  // Update UserStakeStats
  const userStakeStatsRecord = await context.db.find(userStakeStats, {
    id: user,
  });
  if (userStakeStatsRecord) {
    await context.db.update(userStakeStats, { id: user }).set({
      totalStaked: userStakeStatsRecord.totalStaked + amount,
      activeStakes: userStakeStatsRecord.activeStakes + 1n,
      lastActiveAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
  } else {
    await context.db
      .insert(userStakeStats)
      .values({
        id: user,
        user,
        totalStaked: amount,
        totalRewarded: 0n,
        activeStakes: 1n,
        operationsCount: 1n,
        firstStakeAt: event.block.timestamp,
        lastActiveAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      })
      .onConflictDoNothing();
  }

  // Update TokenStakeStats
  const tokenStakeStatsRecord = await context.db.find(tokenStakeStats, {
    id: token,
  });
  if (tokenStakeStatsRecord) {
    await context.db.update(tokenStakeStats, { id: token }).set({
      totalTvl: tokenStakeStatsRecord.totalTvl + amount,
      totalStakers: tokenStakeStatsRecord.totalStakers + 1n,
      updatedAt: event.block.timestamp,
    });
  } else {
    await context.db
      .insert(tokenStakeStats)
      .values({
        id: token,
        token,
        totalTvl: amount,
        totalStakers: 1n,
        totalOperations: 0n,
        averageReward: 0n,
        updatedAt: event.block.timestamp,
      })
      .onConflictDoNothing();
  }
});

/**
 * Handle Unstaked event
 */
ponder.on('AuStake:Unstaked', async ({ event, context }) => {
  const { token, user, amount, operationId, eType, time } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
  const stakeId = `${operationId}-${user.toLowerCase()}`;

  // Insert Unstaked event
  await context.db.insert(unstakedEvents).values({
    id: eventId,
    token,
    user,
    amount,
    unstakedOperationId: operationId,
    eType,
    time,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update Stake entity
  const existingStake = await context.db.find(stakes, { id: stakeId });
  if (existingStake) {
    const newAmount = existingStake.amount - amount;
    await context.db.update(stakes, { id: stakeId }).set({
      amount: newAmount,
      timestamp: time,
      isActive: newAmount > 0n,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  }

  // Update Operation TVL
  const operation = await context.db.find(operations, { id: operationId });
  if (operation) {
    await context.db.update(operations, { id: operationId }).set({
      tokenTvl: operation.tokenTvl - amount,
      updatedAt: event.block.timestamp,
    });
  }

  // Update UserStakeStats
  const userStakeStatsRecord = await context.db.find(userStakeStats, {
    id: user,
  });
  if (userStakeStatsRecord) {
    await context.db.update(userStakeStats, { id: user }).set({
      totalStaked: userStakeStatsRecord.totalStaked - amount,
      lastActiveAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
  }

  // Update TokenStakeStats
  const tokenStakeStatsRecord = await context.db.find(tokenStakeStats, {
    id: token,
  });
  if (tokenStakeStatsRecord) {
    await context.db.update(tokenStakeStats, { id: token }).set({
      totalTvl: tokenStakeStatsRecord.totalTvl - amount,
      updatedAt: event.block.timestamp,
    });
  }
});

/**
 * Handle RewardPaid event
 */
ponder.on('AuStake:RewardPaid', async ({ event, context }) => {
  const { user, amount, operationId } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert RewardPaid event
  await context.db.insert(rewardPaidEvents).values({
    id: eventId,
    user,
    amount,
    rewardOperationId: operationId,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update UserStakeStats
  const userStakeStatsRecord = await context.db.find(userStakeStats, {
    id: user,
  });
  if (userStakeStatsRecord) {
    await context.db.update(userStakeStats, { id: user }).set({
      totalRewarded: userStakeStatsRecord.totalRewarded + amount,
      lastActiveAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
  }
});

/**
 * Handle AdminStatusChanged event
 */
ponder.on('AuStake:AdminStatusChanged', async ({ event, context }) => {
  const { admin, status } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert AdminStatusChanged event
  await context.db.insert(adminStatusChangedEvents).values({
    id: eventId,
    admin,
    status,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});
