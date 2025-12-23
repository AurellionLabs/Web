import {
  AdminSet as AdminSetEvent,
  DriverAssigned as DriverAssignedEvent,
  FundsEscrowed as FundsEscrowedEvent,
  FundsRefunded as FundsRefundedEvent,
  JourneyCanceled as JourneyCanceledEvent,
  JourneyCreated as JourneyCreatedEvent,
  JourneyStatusUpdated as JourneyStatusUpdatedEvent,
  NodeFeeDistributed as NodeFeeDistributedEvent,
  OrderCreated as OrderCreatedEvent,
  OrderSettled as OrderSettledEvent,
  OrderStatusUpdated as OrderStatusUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  SellerPaid as SellerPaidEvent,
  emitSig as emitSigEvent,
} from '../generated/AuSys/AuSys';
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
} from '../generated/schema';
import { Bytes } from '@graphprotocol/graph-ts';

export function handleAdminSet(event: AdminSetEvent): void {
  let entity = new AdminSet(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.admin = event.params.admin;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleDriverAssigned(event: DriverAssignedEvent): void {
  let entity = new DriverAssigned(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.driver = event.params.driver;
  entity.journeyId = event.params.journeyId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleFundsEscrowed(event: FundsEscrowedEvent): void {
  let entity = new FundsEscrowed(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.from = event.params.from;
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleFundsRefunded(event: FundsRefundedEvent): void {
  let entity = new FundsRefunded(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.to = event.params.to;
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleJourneyCanceled(event: JourneyCanceledEvent): void {
  let entity = new JourneyCanceled(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.journeyId = event.params.journeyId;
  entity.sender = event.params.sender;
  entity.refundedAmount = event.params.refundedAmount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleJourneyCreated(event: JourneyCreatedEvent): void {
  let entity = new JourneyCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.journeyId = event.params.journeyId;
  entity.sender = event.params.sender;
  entity.receiver = event.params.receiver;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleJourneyStatusUpdated(
  event: JourneyStatusUpdatedEvent,
): void {
  let entity = new JourneyStatusUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.journeyId = event.params.journeyId;
  entity.newStatus = event.params.newStatus;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleNodeFeeDistributed(event: NodeFeeDistributedEvent): void {
  let entity = new NodeFeeDistributed(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.node = event.params.node;
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleOrderCreated(event: OrderCreatedEvent): void {
  let entity = new OrderCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.orderId = event.params.orderId;
  entity.buyer = event.params.buyer;
  entity.seller = event.params.seller;
  entity.token = event.params.token;
  entity.tokenId = event.params.tokenId;
  entity.tokenQuantity = event.params.tokenQuantity;
  entity.requestedTokenQuantity = event.params.requestedTokenQuantity;
  entity.price = event.params.price;
  entity.txFee = event.params.txFee;
  entity.currentStatus = event.params.currentStatus;
  entity.nodes = changetype<Bytes[]>(event.params.nodes);
  entity.locationData_startLocation_lat =
    event.params.locationData.startLocation.lat;
  entity.locationData_startLocation_lng =
    event.params.locationData.startLocation.lng;
  entity.locationData_endLocation_lat =
    event.params.locationData.endLocation.lat;
  entity.locationData_endLocation_lng =
    event.params.locationData.endLocation.lng;
  entity.locationData_startName = event.params.locationData.startName;
  entity.locationData_endName = event.params.locationData.endName;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleOrderSettled(event: OrderSettledEvent): void {
  let entity = new OrderSettled(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.orderId = event.params.orderId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleOrderStatusUpdated(event: OrderStatusUpdatedEvent): void {
  let entity = new OrderStatusUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.orderId = event.params.orderId;
  entity.newStatus = event.params.newStatus;

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

export function handleRoleAdminChanged(event: RoleAdminChangedEvent): void {
  let entity = new RoleAdminChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.role = event.params.role;
  entity.previousAdminRole = event.params.previousAdminRole;
  entity.newAdminRole = event.params.newAdminRole;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
  let entity = new RoleGranted(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.role = event.params.role;
  entity.account = event.params.account;
  entity.sender = event.params.sender;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
  let entity = new RoleRevoked(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.role = event.params.role;
  entity.account = event.params.account;
  entity.sender = event.params.sender;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleSellerPaid(event: SellerPaidEvent): void {
  let entity = new SellerPaid(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.seller = event.params.seller;
  entity.amount = event.params.amount;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleemitSig(event: emitSigEvent): void {
  let entity = new emitSig(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.user = event.params.user;
  entity.internal_id = event.params.id;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
