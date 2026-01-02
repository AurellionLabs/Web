import { ponder } from '@/generated';

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

  // Create Operation entity
  await context.db.operations.create({
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
  });

  // Create OperationCreated event
  await context.db.operationCreatedEvents.create({
    id: eventId,
    opCreatedOperationId: operationId,
    name,
    token,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update TokenStakeStats
  const tokenStakeStats = await context.db.tokenStakeStats.findUnique({
    id: token,
  });
  if (tokenStakeStats) {
    await context.db.tokenStakeStats.update({
      id: token,
      data: {
        totalOperations: tokenStakeStats.totalOperations + 1n,
        updatedAt: event.block.timestamp,
      },
    });
  } else {
    await context.db.tokenStakeStats.create({
      id: token,
      token,
      totalTvl: 0n,
      totalStakers: 0n,
      totalOperations: 1n,
      averageReward: 0n,
      updatedAt: event.block.timestamp,
    });
  }
});

/**
 * Handle Staked event
 */
ponder.on('AuStake:Staked', async ({ event, context }) => {
  const { token, user, amount, operationId, eType, time } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
  const stakeId = `${operationId}-${user.toLowerCase()}`;

  // Create Staked event
  await context.db.stakedEvents.create({
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
  const existingStake = await context.db.stakes.findUnique({ id: stakeId });
  if (existingStake) {
    await context.db.stakes.update({
      id: stakeId,
      data: {
        amount: existingStake.amount + amount,
        timestamp: time,
        isActive: true,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      },
    });
  } else {
    await context.db.stakes.create({
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
    });
  }

  // Update Operation TVL
  const operation = await context.db.operations.findUnique({ id: operationId });
  if (operation) {
    await context.db.operations.update({
      id: operationId,
      data: {
        tokenTvl: operation.tokenTvl + amount,
        updatedAt: event.block.timestamp,
      },
    });
  }

  // Update UserStakeStats
  const userStakeStats = await context.db.userStakeStats.findUnique({
    id: user,
  });
  if (userStakeStats) {
    await context.db.userStakeStats.update({
      id: user,
      data: {
        totalStaked: userStakeStats.totalStaked + amount,
        activeStakes: userStakeStats.activeStakes + 1n,
        lastActiveAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      },
    });
  } else {
    await context.db.userStakeStats.create({
      id: user,
      user,
      totalStaked: amount,
      totalRewarded: 0n,
      activeStakes: 1n,
      operationsCount: 1n,
      firstStakeAt: event.block.timestamp,
      lastActiveAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
  }

  // Update TokenStakeStats
  const tokenStakeStats = await context.db.tokenStakeStats.findUnique({
    id: token,
  });
  if (tokenStakeStats) {
    await context.db.tokenStakeStats.update({
      id: token,
      data: {
        totalTvl: tokenStakeStats.totalTvl + amount,
        totalStakers: tokenStakeStats.totalStakers + 1n,
        updatedAt: event.block.timestamp,
      },
    });
  } else {
    await context.db.tokenStakeStats.create({
      id: token,
      token,
      totalTvl: amount,
      totalStakers: 1n,
      totalOperations: 0n,
      averageReward: 0n,
      updatedAt: event.block.timestamp,
    });
  }
});

/**
 * Handle Unstaked event
 */
ponder.on('AuStake:Unstaked', async ({ event, context }) => {
  const { token, user, amount, operationId, eType, time } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
  const stakeId = `${operationId}-${user.toLowerCase()}`;

  // Create Unstaked event
  await context.db.unstakedEvents.create({
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
  const existingStake = await context.db.stakes.findUnique({ id: stakeId });
  if (existingStake) {
    const newAmount = existingStake.amount - amount;
    await context.db.stakes.update({
      id: stakeId,
      data: {
        amount: newAmount,
        timestamp: time,
        isActive: newAmount > 0n,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      },
    });
  }

  // Update Operation TVL
  const operation = await context.db.operations.findUnique({ id: operationId });
  if (operation) {
    await context.db.operations.update({
      id: operationId,
      data: {
        tokenTvl: operation.tokenTvl - amount,
        updatedAt: event.block.timestamp,
      },
    });
  }

  // Update UserStakeStats
  const userStakeStats = await context.db.userStakeStats.findUnique({
    id: user,
  });
  if (userStakeStats) {
    await context.db.userStakeStats.update({
      id: user,
      data: {
        totalStaked: userStakeStats.totalStaked - amount,
        lastActiveAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      },
    });
  }

  // Update TokenStakeStats
  const tokenStakeStats = await context.db.tokenStakeStats.findUnique({
    id: token,
  });
  if (tokenStakeStats) {
    await context.db.tokenStakeStats.update({
      id: token,
      data: {
        totalTvl: tokenStakeStats.totalTvl - amount,
        updatedAt: event.block.timestamp,
      },
    });
  }
});

/**
 * Handle RewardPaid event
 */
ponder.on('AuStake:RewardPaid', async ({ event, context }) => {
  const { user, amount, operationId } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Create RewardPaid event
  await context.db.rewardPaidEvents.create({
    id: eventId,
    user,
    amount,
    rewardOperationId: operationId,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update UserStakeStats
  const userStakeStats = await context.db.userStakeStats.findUnique({
    id: user,
  });
  if (userStakeStats) {
    await context.db.userStakeStats.update({
      id: user,
      data: {
        totalRewarded: userStakeStats.totalRewarded + amount,
        lastActiveAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      },
    });
  }
});

/**
 * Handle AdminStatusChanged event
 */
ponder.on('AuStake:AdminStatusChanged', async ({ event, context }) => {
  const { admin, status } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Create AdminStatusChanged event
  await context.db.adminStatusChangedEvents.create({
    id: eventId,
    admin,
    status,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});
