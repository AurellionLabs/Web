import { newMockEvent } from 'matchstick-as';
import { ethereum, Address, Bytes, BigInt } from '@graphprotocol/graph-ts';
import {
  AdminSet,
  DriverAssigned,
  FundsEscrowed,
  FundsRefunded,
  JourneyCanceled,
  JourneyCreated,
  JourneyStatusUpdated,
  NodeFeeDistributed,
  OrderCreated,
  OrderSettled,
  OrderStatusUpdated,
  OwnershipTransferred,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  SellerPaid,
  emitSig,
} from '../generated/AuSys/AuSys';

export function createAdminSetEvent(admin: Address): AdminSet {
  let adminSetEvent = changetype<AdminSet>(newMockEvent());

  adminSetEvent.parameters = new Array();

  adminSetEvent.parameters.push(
    new ethereum.EventParam('admin', ethereum.Value.fromAddress(admin)),
  );

  return adminSetEvent;
}

export function createDriverAssignedEvent(
  driver: Address,
  journeyId: Bytes,
): DriverAssigned {
  let driverAssignedEvent = changetype<DriverAssigned>(newMockEvent());

  driverAssignedEvent.parameters = new Array();

  driverAssignedEvent.parameters.push(
    new ethereum.EventParam('driver', ethereum.Value.fromAddress(driver)),
  );
  driverAssignedEvent.parameters.push(
    new ethereum.EventParam(
      'journeyId',
      ethereum.Value.fromFixedBytes(journeyId),
    ),
  );

  return driverAssignedEvent;
}

export function createFundsEscrowedEvent(
  from: Address,
  amount: BigInt,
): FundsEscrowed {
  let fundsEscrowedEvent = changetype<FundsEscrowed>(newMockEvent());

  fundsEscrowedEvent.parameters = new Array();

  fundsEscrowedEvent.parameters.push(
    new ethereum.EventParam('from', ethereum.Value.fromAddress(from)),
  );
  fundsEscrowedEvent.parameters.push(
    new ethereum.EventParam(
      'amount',
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );

  return fundsEscrowedEvent;
}

export function createFundsRefundedEvent(
  to: Address,
  amount: BigInt,
): FundsRefunded {
  let fundsRefundedEvent = changetype<FundsRefunded>(newMockEvent());

  fundsRefundedEvent.parameters = new Array();

  fundsRefundedEvent.parameters.push(
    new ethereum.EventParam('to', ethereum.Value.fromAddress(to)),
  );
  fundsRefundedEvent.parameters.push(
    new ethereum.EventParam(
      'amount',
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );

  return fundsRefundedEvent;
}

export function createJourneyCanceledEvent(
  journeyId: Bytes,
  sender: Address,
  refundedAmount: BigInt,
): JourneyCanceled {
  let journeyCanceledEvent = changetype<JourneyCanceled>(newMockEvent());

  journeyCanceledEvent.parameters = new Array();

  journeyCanceledEvent.parameters.push(
    new ethereum.EventParam(
      'journeyId',
      ethereum.Value.fromFixedBytes(journeyId),
    ),
  );
  journeyCanceledEvent.parameters.push(
    new ethereum.EventParam('sender', ethereum.Value.fromAddress(sender)),
  );
  journeyCanceledEvent.parameters.push(
    new ethereum.EventParam(
      'refundedAmount',
      ethereum.Value.fromUnsignedBigInt(refundedAmount),
    ),
  );

  return journeyCanceledEvent;
}

export function createJourneyCreatedEvent(
  journeyId: Bytes,
  sender: Address,
  receiver: Address,
): JourneyCreated {
  let journeyCreatedEvent = changetype<JourneyCreated>(newMockEvent());

  journeyCreatedEvent.parameters = new Array();

  journeyCreatedEvent.parameters.push(
    new ethereum.EventParam(
      'journeyId',
      ethereum.Value.fromFixedBytes(journeyId),
    ),
  );
  journeyCreatedEvent.parameters.push(
    new ethereum.EventParam('sender', ethereum.Value.fromAddress(sender)),
  );
  journeyCreatedEvent.parameters.push(
    new ethereum.EventParam('receiver', ethereum.Value.fromAddress(receiver)),
  );

  return journeyCreatedEvent;
}

export function createJourneyStatusUpdatedEvent(
  journeyId: Bytes,
  newStatus: i32,
): JourneyStatusUpdated {
  let journeyStatusUpdatedEvent =
    changetype<JourneyStatusUpdated>(newMockEvent());

  journeyStatusUpdatedEvent.parameters = new Array();

  journeyStatusUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      'journeyId',
      ethereum.Value.fromFixedBytes(journeyId),
    ),
  );
  journeyStatusUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      'newStatus',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(newStatus)),
    ),
  );

  return journeyStatusUpdatedEvent;
}

export function createNodeFeeDistributedEvent(
  node: Address,
  amount: BigInt,
): NodeFeeDistributed {
  let nodeFeeDistributedEvent = changetype<NodeFeeDistributed>(newMockEvent());

  nodeFeeDistributedEvent.parameters = new Array();

  nodeFeeDistributedEvent.parameters.push(
    new ethereum.EventParam('node', ethereum.Value.fromAddress(node)),
  );
  nodeFeeDistributedEvent.parameters.push(
    new ethereum.EventParam(
      'amount',
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );

  return nodeFeeDistributedEvent;
}

export function createOrderCreatedEvent(
  orderId: Bytes,
  buyer: Address,
  seller: Address,
  token: Address,
  tokenId: BigInt,
  tokenQuantity: BigInt,
  requestedTokenQuantity: BigInt,
  price: BigInt,
  txFee: BigInt,
  currentStatus: i32,
  nodes: Array<Address>,
  locationData: ethereum.Tuple,
): OrderCreated {
  let orderCreatedEvent = changetype<OrderCreated>(newMockEvent());

  orderCreatedEvent.parameters = new Array();

  orderCreatedEvent.parameters.push(
    new ethereum.EventParam('orderId', ethereum.Value.fromFixedBytes(orderId)),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam('buyer', ethereum.Value.fromAddress(buyer)),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam('seller', ethereum.Value.fromAddress(seller)),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam('token', ethereum.Value.fromAddress(token)),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam(
      'tokenId',
      ethereum.Value.fromUnsignedBigInt(tokenId),
    ),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam(
      'tokenQuantity',
      ethereum.Value.fromUnsignedBigInt(tokenQuantity),
    ),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam(
      'requestedTokenQuantity',
      ethereum.Value.fromUnsignedBigInt(requestedTokenQuantity),
    ),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam('price', ethereum.Value.fromUnsignedBigInt(price)),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam('txFee', ethereum.Value.fromUnsignedBigInt(txFee)),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam(
      'currentStatus',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(currentStatus)),
    ),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam('nodes', ethereum.Value.fromAddressArray(nodes)),
  );
  orderCreatedEvent.parameters.push(
    new ethereum.EventParam(
      'locationData',
      ethereum.Value.fromTuple(locationData),
    ),
  );

  return orderCreatedEvent;
}

export function createOrderSettledEvent(orderId: Bytes): OrderSettled {
  let orderSettledEvent = changetype<OrderSettled>(newMockEvent());

  orderSettledEvent.parameters = new Array();

  orderSettledEvent.parameters.push(
    new ethereum.EventParam('orderId', ethereum.Value.fromFixedBytes(orderId)),
  );

  return orderSettledEvent;
}

export function createOrderStatusUpdatedEvent(
  orderId: Bytes,
  newStatus: i32,
): OrderStatusUpdated {
  let orderStatusUpdatedEvent = changetype<OrderStatusUpdated>(newMockEvent());

  orderStatusUpdatedEvent.parameters = new Array();

  orderStatusUpdatedEvent.parameters.push(
    new ethereum.EventParam('orderId', ethereum.Value.fromFixedBytes(orderId)),
  );
  orderStatusUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      'newStatus',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(newStatus)),
    ),
  );

  return orderStatusUpdatedEvent;
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

export function createRoleAdminChangedEvent(
  role: Bytes,
  previousAdminRole: Bytes,
  newAdminRole: Bytes,
): RoleAdminChanged {
  let roleAdminChangedEvent = changetype<RoleAdminChanged>(newMockEvent());

  roleAdminChangedEvent.parameters = new Array();

  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam('role', ethereum.Value.fromFixedBytes(role)),
  );
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      'previousAdminRole',
      ethereum.Value.fromFixedBytes(previousAdminRole),
    ),
  );
  roleAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      'newAdminRole',
      ethereum.Value.fromFixedBytes(newAdminRole),
    ),
  );

  return roleAdminChangedEvent;
}

export function createRoleGrantedEvent(
  role: Bytes,
  account: Address,
  sender: Address,
): RoleGranted {
  let roleGrantedEvent = changetype<RoleGranted>(newMockEvent());

  roleGrantedEvent.parameters = new Array();

  roleGrantedEvent.parameters.push(
    new ethereum.EventParam('role', ethereum.Value.fromFixedBytes(role)),
  );
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam('account', ethereum.Value.fromAddress(account)),
  );
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam('sender', ethereum.Value.fromAddress(sender)),
  );

  return roleGrantedEvent;
}

export function createRoleRevokedEvent(
  role: Bytes,
  account: Address,
  sender: Address,
): RoleRevoked {
  let roleRevokedEvent = changetype<RoleRevoked>(newMockEvent());

  roleRevokedEvent.parameters = new Array();

  roleRevokedEvent.parameters.push(
    new ethereum.EventParam('role', ethereum.Value.fromFixedBytes(role)),
  );
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam('account', ethereum.Value.fromAddress(account)),
  );
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam('sender', ethereum.Value.fromAddress(sender)),
  );

  return roleRevokedEvent;
}

export function createSellerPaidEvent(
  seller: Address,
  amount: BigInt,
): SellerPaid {
  let sellerPaidEvent = changetype<SellerPaid>(newMockEvent());

  sellerPaidEvent.parameters = new Array();

  sellerPaidEvent.parameters.push(
    new ethereum.EventParam('seller', ethereum.Value.fromAddress(seller)),
  );
  sellerPaidEvent.parameters.push(
    new ethereum.EventParam(
      'amount',
      ethereum.Value.fromUnsignedBigInt(amount),
    ),
  );

  return sellerPaidEvent;
}

export function createemitSigEvent(user: Address, id: Bytes): emitSig {
  let emitSigEvent = changetype<emitSig>(newMockEvent());

  emitSigEvent.parameters = new Array();

  emitSigEvent.parameters.push(
    new ethereum.EventParam('user', ethereum.Value.fromAddress(user)),
  );
  emitSigEvent.parameters.push(
    new ethereum.EventParam('id', ethereum.Value.fromFixedBytes(id)),
  );

  return emitSigEvent;
}
