import { BigInt, Bytes, Address } from '@graphprotocol/graph-ts';
import {
  OperationCreated as OperationCreatedEvent,
  Staked as StakedEvent,
  Unstaked as UnstakedEvent,
  RewardPaid as RewardPaidEvent,
  AdminStatusChanged as AdminStatusChangedEvent,
  AuStake,
} from '../generated/AuStake/AuStake';
import {
  Operation,
  Stake,
  OperationCreated,
  Staked,
  Unstaked,
  RewardPaid,
  AdminStatusChanged,
  UserStats,
  TokenStats,
} from '../generated/schema';

export function handleOperationCreated(event: OperationCreatedEvent): void {
  let entity = new OperationCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.operationId = event.params.operationId;
  entity.name = event.params.name;
  entity.token = event.params.token;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Create Operation entity
  let operation = new Operation(event.params.operationId);
  operation.name = event.params.name;
  operation.token = event.params.token;
  operation.createdAt = event.block.timestamp;
  operation.updatedAt = event.block.timestamp;
  operation.blockNumber = event.block.number;
  operation.transactionHash = event.transaction.hash;

  // Set default values - contract call would need proper struct mapping
  operation.description = '';
  operation.provider = Bytes.empty();
  operation.deadline = BigInt.fromI32(0);
  operation.startDate = BigInt.fromI32(0);
  operation.rwaName = '';
  operation.reward = BigInt.fromI32(0);
  operation.tokenTvl = BigInt.fromI32(0);
  operation.fundingGoal = BigInt.fromI32(0);
  operation.assetPrice = BigInt.fromI32(0);
  operation.operationStatus = 'INACTIVE';

  operation.save();

  // Update TokenStats
  updateTokenStats(event.params.token, event.block.timestamp);
}

export function handleStaked(event: StakedEvent): void {
  let entity = new Staked(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.token = event.params.token;
  entity.user = event.params.user;
  entity.amount = event.params.amount;
  entity.operationId = event.params.operationId;
  entity.eType = event.params.eType;
  entity.time = event.params.time;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Create or update Stake entity
  let stakeId =
    event.params.operationId.toHexString() +
    '-' +
    event.params.user.toHexString();
  let stake = Stake.load(stakeId);

  if (!stake) {
    stake = new Stake(stakeId);
    stake.operation = event.params.operationId.toHexString();
    stake.user = event.params.user;
    stake.token = event.params.token;
    stake.amount = BigInt.fromI32(0);
    stake.timestamp = event.block.timestamp;
    stake.isActive = true;
    stake.createdAt = event.block.timestamp;
  }

  // Add to existing stake amount
  stake.amount = stake.amount.plus(event.params.amount);
  stake.updatedAt = event.block.timestamp;
  stake.blockNumber = event.block.number;
  stake.transactionHash = event.transaction.hash;

  stake.save();

  // Update Operation TVL
  let operation = Operation.load(event.params.operationId);
  if (operation) {
    operation.tokenTvl = operation.tokenTvl.plus(event.params.amount);
    operation.updatedAt = event.block.timestamp;
    operation.save();
  }

  // Update UserStats and TokenStats
  updateUserStats(
    event.params.user,
    event.params.amount,
    true,
    event.block.timestamp,
  );
  updateTokenStats(event.params.token, event.block.timestamp);
}

export function handleUnstaked(event: UnstakedEvent): void {
  let entity = new Unstaked(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.token = event.params.token;
  entity.user = event.params.user;
  entity.amount = event.params.amount;
  entity.operationId = event.params.operationId;
  entity.eType = event.params.eType;
  entity.time = event.params.time;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update Stake entity
  let stakeId =
    event.params.operationId.toHexString() +
    '-' +
    event.params.user.toHexString();
  let stake = Stake.load(stakeId);

  if (stake) {
    stake.amount = stake.amount.minus(event.params.amount);
    if (stake.amount.equals(BigInt.fromI32(0))) {
      stake.isActive = false;
    }
    stake.updatedAt = event.block.timestamp;
    stake.save();
  }

  // Update Operation TVL
  let operation = Operation.load(event.params.operationId);
  if (operation) {
    operation.tokenTvl = operation.tokenTvl.minus(event.params.amount);
    operation.updatedAt = event.block.timestamp;
    operation.save();
  }

  // Update UserStats and TokenStats
  updateUserStats(
    event.params.user,
    event.params.amount,
    false,
    event.block.timestamp,
  );
  updateTokenStats(event.params.token, event.block.timestamp);
}

export function handleRewardPaid(event: RewardPaidEvent): void {
  let entity = new RewardPaid(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.user = event.params.user;
  entity.amount = event.params.amount;
  entity.operationId = event.params.operationId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update UserStats
  let userStats = UserStats.load(event.params.user);
  if (userStats) {
    userStats.totalRewarded = userStats.totalRewarded.plus(event.params.amount);
    userStats.lastActiveAt = event.block.timestamp;
    userStats.updatedAt = event.block.timestamp;
    userStats.save();
  }
}

export function handleAdminStatusChanged(event: AdminStatusChangedEvent): void {
  let entity = new AdminStatusChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.admin = event.params.admin;
  entity.status = event.params.status;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

function updateUserStats(
  user: Address,
  amount: BigInt,
  isStaking: boolean,
  timestamp: BigInt,
): void {
  let userStats = UserStats.load(user);
  if (!userStats) {
    userStats = new UserStats(user);
    userStats.user = user;
    userStats.totalStaked = BigInt.fromI32(0);
    userStats.totalRewarded = BigInt.fromI32(0);
    userStats.activeStakes = BigInt.fromI32(0);
    userStats.operationsCount = BigInt.fromI32(0);
    userStats.firstStakeAt = timestamp;
  }

  if (isStaking) {
    userStats.totalStaked = userStats.totalStaked.plus(amount);
    userStats.activeStakes = userStats.activeStakes.plus(BigInt.fromI32(1));
    userStats.operationsCount = userStats.operationsCount.plus(
      BigInt.fromI32(1),
    );
  } else {
    userStats.totalStaked = userStats.totalStaked.minus(amount);
    if (userStats.activeStakes.gt(BigInt.fromI32(0))) {
      userStats.activeStakes = userStats.activeStakes.minus(BigInt.fromI32(1));
    }
  }

  userStats.lastActiveAt = timestamp;
  userStats.updatedAt = timestamp;
  userStats.save();
}

function updateTokenStats(token: Address, timestamp: BigInt): void {
  let tokenStats = TokenStats.load(token);
  if (!tokenStats) {
    tokenStats = new TokenStats(token);
    tokenStats.token = token;
    tokenStats.totalTvl = BigInt.fromI32(0);
    tokenStats.totalStakers = BigInt.fromI32(0);
    tokenStats.totalOperations = BigInt.fromI32(0);
    tokenStats.averageReward = BigInt.fromI32(0);
  }

  // Note: This is a simplified update. In production, you might want to
  // recalculate these stats more precisely by querying existing entities
  tokenStats.updatedAt = timestamp;
  tokenStats.save();
}
