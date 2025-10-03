import { BigInt, Bytes, Address } from '@graphprotocol/graph-ts';
import {
  JourneyCreated as JourneyCreatedEvent,
  JourneyStatusUpdated as JourneyStatusUpdatedEvent,
  OrderCreated as OrderCreatedEvent,
  OrderSettled as OrderSettledEvent,
  DriverAssigned as DriverAssignedEvent,
  emitSig as PackageSignatureEvent,
  FundsEscrowed as FundsEscrowedEvent,
  FundsRefunded as FundsRefundedEvent,
  SellerPaid as SellerPaidEvent,
  NodeFeeDistributed as NodeFeeDistributedEvent,
  AdminSet as AdminSetEvent,
  JourneyCanceled as JourneyCanceledEvent,
  Ausys,
} from '../generated/Ausys/Ausys';
import {
  Journey,
  Order,
  ParcelData,
  PackageSignature,
  DriverAssignment,
  JourneyStatusUpdate,
  OrderCreated,
  JourneyCreated,
  OrderSettled,
  FundsEscrowed,
  RewardPaid,
  SellerPaid,
  NodeFeeDistributed,
  AdminSet,
  DriverStats,
  NodeStats,
} from '../generated/schema';

export function handleJourneyCreated(event: JourneyCreatedEvent): void {
  let entity = new JourneyCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.journeyId = event.params.journeyId;
  entity.sender = event.params.sender;
  entity.receiver = event.params.receiver;
  entity.bounty = BigInt.fromI32(0); // Will be populated from contract call
  entity.eta = BigInt.fromI32(0); // Will be populated from contract call

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Create Journey entity
  let journey = new Journey(event.params.journeyId);
  journey.sender = event.params.sender;
  journey.receiver = event.params.receiver;
  journey.driver = null; // Not assigned yet
  journey.currentStatus = BigInt.fromI32(0); // Pending
  journey.journeyStart = BigInt.fromI32(0);
  journey.journeyEnd = BigInt.fromI32(0);
  journey.createdAt = event.block.timestamp;
  journey.updatedAt = event.block.timestamp;
  journey.blockNumber = event.block.number;
  journey.transactionHash = event.transaction.hash;

  // Try to get additional data from contract
  let contract = Ausys.bind(event.address);
  let journeyResult = contract.try_getjourney(event.params.journeyId);
  if (!journeyResult.reverted) {
    let journeyData = journeyResult.value;
    journey.bounty = journeyData.bounty;
    journey.eta = journeyData.ETA;

    // Create ParcelData entity
    let parcelData = new ParcelData(event.params.journeyId.toHexString());
    parcelData.journey = event.params.journeyId.toHexString();
    parcelData.startLocationLat = journeyData.parcelData.startLocation.lat;
    parcelData.startLocationLng = journeyData.parcelData.startLocation.lng;
    parcelData.endLocationLat = journeyData.parcelData.endLocation.lat;
    parcelData.endLocationLng = journeyData.parcelData.endLocation.lng;
    parcelData.startName = journeyData.parcelData.startName;
    parcelData.endName = journeyData.parcelData.endName;
    parcelData.save();

    journey.parcelData = parcelData.id;
  }

  journey.save();
}

export function handleJourneyStatusUpdated(
  event: JourneyStatusUpdatedEvent,
): void {
  let entity = new JourneyStatusUpdate(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.journeyId = event.params.journeyId;
  entity.newStatus = BigInt.fromI32(event.params.newStatus);
  entity.oldStatus = BigInt.fromI32(0); // We don't have old status in event

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update Journey entity
  let journey = Journey.load(event.params.journeyId);
  if (journey) {
    entity.oldStatus = journey.currentStatus;
    journey.currentStatus = BigInt.fromI32(event.params.newStatus);
    journey.updatedAt = event.block.timestamp;

    // Update journey start/end times based on status
    if (event.params.newStatus == 1) {
      // InProgress
      journey.journeyStart = event.block.timestamp;
    } else if (event.params.newStatus == 2) {
      // Completed
      journey.journeyEnd = event.block.timestamp;
    }

    journey.save();
  }
}

export function handleOrderCreated(event: OrderCreatedEvent): void {
  let entity = new OrderCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.orderId = event.params.orderId;
  entity.buyer = event.params.buyer;
  entity.seller = Bytes.empty(); // Will be populated from contract call
  entity.price = BigInt.fromI32(0); // Will be populated from contract call
  entity.tokenQuantity = BigInt.fromI32(0); // Will be populated from contract call

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Create Order entity
  let order = new Order(event.params.orderId);
  order.buyer = event.params.buyer;
  order.currentStatus = BigInt.fromI32(0); // Pending
  order.nodes = [];
  order.createdAt = event.block.timestamp;
  order.updatedAt = event.block.timestamp;
  order.blockNumber = event.block.number;
  order.transactionHash = event.transaction.hash;

  // Try to get additional data from contract
  let contract = Ausys.bind(event.address);
  let orderResult = contract.try_getOrder(event.params.orderId);
  if (!orderResult.reverted) {
    let orderData = orderResult.value;
    order.seller = orderData.seller;
    order.token = orderData.token;
    order.tokenId = orderData.tokenId;
    order.tokenQuantity = orderData.tokenQuantity;
    order.requestedTokenQuantity = orderData.requestedTokenQuantity;
    order.price = orderData.price;
    order.txFee = orderData.txFee;
    order.currentStatus = BigInt.fromI32(orderData.currentStatus);

    // Update event entity
    entity.seller = orderData.seller;
    entity.price = orderData.price;
    entity.tokenQuantity = orderData.tokenQuantity;

    // Create ParcelData for order
    let parcelData = new ParcelData(
      event.params.orderId.toHexString() + '-order',
    );
    parcelData.journey = 'order-' + event.params.orderId.toHexString(); // Not linked to journey yet
    parcelData.startLocationLat = orderData.locationData.startLocation.lat;
    parcelData.startLocationLng = orderData.locationData.startLocation.lng;
    parcelData.endLocationLat = orderData.locationData.endLocation.lat;
    parcelData.endLocationLng = orderData.locationData.endLocation.lng;
    parcelData.startName = orderData.locationData.startName;
    parcelData.endName = orderData.locationData.endName;
    parcelData.save();

    order.locationData = parcelData.id;

    // Convert nodes array
    let nodesList: Bytes[] = [];
    for (let i = 0; i < orderData.nodes.length; i++) {
      nodesList.push(orderData.nodes[i]);
    }
    order.nodes = nodesList;
  }

  order.save();
  entity.save();
}

export function handleOrderSettled(event: OrderSettledEvent): void {
  let entity = new OrderSettled(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.orderId = event.params.orderId;
  entity.totalPrice = BigInt.fromI32(0); // Will be populated from contract
  entity.totalFee = BigInt.fromI32(0); // Will be populated from contract

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  // Try to get order data for totals
  let contract = Ausys.bind(event.address);
  let orderResult = contract.try_getOrder(event.params.orderId);
  if (!orderResult.reverted) {
    let orderData = orderResult.value;
    entity.totalPrice = orderData.price;
    entity.totalFee = orderData.txFee;
  }

  entity.save();

  // Update Order entity
  let order = Order.load(event.params.orderId);
  if (order) {
    order.currentStatus = BigInt.fromI32(3); // Settled
    order.updatedAt = event.block.timestamp;
    order.save();

    // Update NodeStats for involved nodes
    updateNodeStats(
      order.nodes,
      order.price,
      order.txFee,
      event.block.timestamp,
    );
  }
}

export function handleDriverAssigned(event: DriverAssignedEvent): void {
  let entity = new DriverAssignment(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.driver = event.params.driver;
  entity.journeyId = event.params.journeyId;
  entity.assignedBy = event.transaction.from; // Best approximation

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update Journey entity
  let journey = Journey.load(event.params.journeyId);
  if (journey) {
    journey.driver = event.params.driver;
    journey.updatedAt = event.block.timestamp;
    journey.save();
  }

  // Update DriverStats
  updateDriverStats(event.params.driver, event.block.timestamp, false);
}

export function handlePackageSignature(event: PackageSignatureEvent): void {
  let entity = new PackageSignature(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.journey = event.params.id.toHexString();
  entity.signer = event.params.user;

  // Determine signature type based on journey participants
  let journey = Journey.load(event.params.id);
  let signatureType = 'unknown';
  if (journey) {
    if (event.params.user.equals(journey.sender)) {
      signatureType = 'sender';
    } else if (event.params.user.equals(journey.receiver)) {
      signatureType = 'receiver';
    } else if (
      journey.driver &&
      event.params.user.equals(journey.driver as Bytes)
    ) {
      signatureType = 'driver';
    }
  }
  entity.signatureType = signatureType;

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
  entity.purpose = 'escrow'; // Could be enhanced to determine purpose

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleFundsRefunded(event: FundsRefundedEvent): void {
  // Handle refunds if needed
}

export function handleSellerPaid(event: SellerPaidEvent): void {
  let entity = new SellerPaid(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.seller = event.params.seller;
  entity.amount = event.params.amount;
  entity.orderId = Bytes.empty(); // Would need to be determined from context

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
  entity.orderId = Bytes.empty(); // Would need to be determined from context

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

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

export function handleJourneyCanceled(event: JourneyCanceledEvent): void {
  // Update Journey entity to canceled status
  let journey = Journey.load(event.params.journeyId);
  if (journey) {
    journey.currentStatus = BigInt.fromI32(4); // Canceled
    journey.updatedAt = event.block.timestamp;
    journey.save();
  }
}

function updateDriverStats(
  driver: Address,
  timestamp: BigInt,
  completed: boolean,
): void {
  let driverStats = DriverStats.load(driver);
  if (!driverStats) {
    driverStats = new DriverStats(driver);
    driverStats.driver = driver;
    driverStats.totalJourneys = BigInt.fromI32(0);
    driverStats.completedJourneys = BigInt.fromI32(0);
    driverStats.canceledJourneys = BigInt.fromI32(0);
    driverStats.totalEarnings = BigInt.fromI32(0);
    driverStats.averageRating = BigInt.fromI32(0);
  }

  driverStats.totalJourneys = driverStats.totalJourneys.plus(BigInt.fromI32(1));
  if (completed) {
    driverStats.completedJourneys = driverStats.completedJourneys.plus(
      BigInt.fromI32(1),
    );
  }
  driverStats.lastActiveAt = timestamp;
  driverStats.updatedAt = timestamp;
  driverStats.save();
}

function updateNodeStats(
  nodes: Bytes[],
  price: BigInt,
  fee: BigInt,
  timestamp: BigInt,
): void {
  for (let i = 0; i < nodes.length; i++) {
    let nodeStats = NodeStats.load(nodes[i]);
    if (!nodeStats) {
      nodeStats = new NodeStats(nodes[i]);
      nodeStats.node = nodes[i];
      nodeStats.totalOrders = BigInt.fromI32(0);
      nodeStats.completedOrders = BigInt.fromI32(0);
      nodeStats.totalRevenue = BigInt.fromI32(0);
      nodeStats.totalFeesEarned = BigInt.fromI32(0);
    }

    nodeStats.totalOrders = nodeStats.totalOrders.plus(BigInt.fromI32(1));
    nodeStats.completedOrders = nodeStats.completedOrders.plus(
      BigInt.fromI32(1),
    );
    nodeStats.totalRevenue = nodeStats.totalRevenue.plus(price);
    nodeStats.totalFeesEarned = nodeStats.totalFeesEarned.plus(
      fee.div(BigInt.fromI32(nodes.length)),
    );
    nodeStats.lastActiveAt = timestamp;
    nodeStats.updatedAt = timestamp;
    nodeStats.save();
  }
}
