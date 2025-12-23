import { newMockEvent } from 'matchstick-as';
import { ethereum, Address, Bytes, BigInt } from '@graphprotocol/graph-ts';
import {
  AdminStatusChanged,
  OperationCreated,
  OwnershipTransferred,
  RewardPaid,
  Staked,
  Unstaked,
} from '../generated/AuStake/AuStake';

export function createAdminStatusChangedEvent(
  admin: Address,
  status: boolean,
): AdminStatusChanged {
  let adminStatusChangedEvent = changetype<AdminStatusChanged>(newMockEvent());

  adminStatusChangedEvent.parameters = new Array();

  adminStatusChangedEvent.parameters.push(
    new ethereum.EventParam('admin', ethereum.Value.fromAddress(admin)),
  );
  adminStatusChangedEvent.parameters.push(
    new ethereum.EventParam('status', ethereum.Value.fromBoolean(status)),
  );

  return adminStatusChangedEvent;
}

export function createOperationCreatedEvent(
  operationId: Bytes,
  name: string,
  token: Address,
): OperationCreated {
  let operationCreatedEvent = changetype<OperationCreated>(newMockEvent());

  operationCreatedEvent.parameters = new Array();

  operationCreatedEvent.parameters.push(
    new ethereum.EventParam(
      'operationId',
      ethereum.Value.fromFixedBytes(operationId),
    ),
  );
  operationCreatedEvent.parameters.push(
    new ethereum.EventParam('name', ethereum.Value.fromString(name)),
  );
  operationCreatedEvent.parameters.push(
    new ethereum.EventParam('token', ethereum.Value.fromAddress(token)),
  );

  return operationCreatedEvent;
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address,
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent());

  ownershipTransferredEvent.parameters = new Array();

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      'previousOwner',
      ethereum.Value.fromAddress(previousOwner),
    ),
  );
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam('newOwner', ethereum.Value.fromAddress(newOwner)),
  );

  return ownershipTransferredEvent;
}

export function createRewardPaidEvent(
  user: Address,
  amount: BigInt,
  operationId: Bytes,
): RewardPaid {
  let rewardPaidEvent = changetype<RewardPaid>(newMockEvent());

  rewardPaidEvent.parameters = new Array();

  rewardPaidEvent.parameters.push(
    new ethereum.EventParam('user', ethereum.Value.fromAddress(user)),
  );
  rewardPaidEvent.parameters.push(
    new ethereum.EventParam(
      'amount',
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );
  rewardPaidEvent.parameters.push(
    new ethereum.EventParam(
      'operationId',
      ethereum.Value.fromFixedBytes(operationId),
    ),
  );

  return rewardPaidEvent;
}

export function createStakedEvent(
  token: Address,
  user: Address,
  amount: BigInt,
  operationId: Bytes,
  eType: string,
  time: BigInt,
): Staked {
  let stakedEvent = changetype<Staked>(newMockEvent());

  stakedEvent.parameters = new Array();

  stakedEvent.parameters.push(
    new ethereum.EventParam('token', ethereum.Value.fromAddress(token)),
  );
  stakedEvent.parameters.push(
    new ethereum.EventParam('user', ethereum.Value.fromAddress(user)),
  );
  stakedEvent.parameters.push(
    new ethereum.EventParam(
      'amount',
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );
  stakedEvent.parameters.push(
    new ethereum.EventParam(
      'operationId',
      ethereum.Value.fromFixedBytes(operationId),
    ),
  );
  stakedEvent.parameters.push(
    new ethereum.EventParam('eType', ethereum.Value.fromString(eType)),
  );
  stakedEvent.parameters.push(
    new ethereum.EventParam('time', ethereum.Value.fromUnsignedBigInt(time)),
  );

  return stakedEvent;
}

export function createUnstakedEvent(
  token: Address,
  user: Address,
  amount: BigInt,
  operationId: Bytes,
  eType: string,
  time: BigInt,
): Unstaked {
  let unstakedEvent = changetype<Unstaked>(newMockEvent());

  unstakedEvent.parameters = new Array();

  unstakedEvent.parameters.push(
    new ethereum.EventParam('token', ethereum.Value.fromAddress(token)),
  );
  unstakedEvent.parameters.push(
    new ethereum.EventParam('user', ethereum.Value.fromAddress(user)),
  );
  unstakedEvent.parameters.push(
    new ethereum.EventParam(
      'amount',
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );
  unstakedEvent.parameters.push(
    new ethereum.EventParam(
      'operationId',
      ethereum.Value.fromFixedBytes(operationId),
    ),
  );
  unstakedEvent.parameters.push(
    new ethereum.EventParam('eType', ethereum.Value.fromString(eType)),
  );
  unstakedEvent.parameters.push(
    new ethereum.EventParam('time', ethereum.Value.fromUnsignedBigInt(time)),
  );

  return unstakedEvent;
}
