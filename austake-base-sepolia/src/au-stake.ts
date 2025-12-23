import {
  AdminStatusChanged as AdminStatusChangedEvent,
  OperationCreated as OperationCreatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  RewardPaid as RewardPaidEvent,
  Staked as StakedEvent,
  Unstaked as UnstakedEvent,
} from '../generated/AuStake/AuStake';
import {
  AdminStatusChanged,
  OperationCreated,
  OwnershipTransferred,
  RewardPaid,
  Staked,
  Unstaked,
} from '../generated/schema';

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
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent,
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.previousOwner = event.params.previousOwner;
  entity.newOwner = event.params.newOwner;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
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
}
