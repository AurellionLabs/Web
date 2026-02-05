// Auto-generated handler for ausys domain - Raw event storage only
// Generated at: 2026-02-04T23:17:32.250Z
//
// Pure Dumb Indexer: Store raw events only, NO aggregate tables
// All aggregation happens in frontend repository layer
// Events from: AuSysFacet

import { ponder } from 'ponder:registry';

// Import event tables from generated schema
import {
  diamondAuSysAdminRevokedEvents,
  diamondAuSysAdminSetEvents,
  diamondAuSysJourneyStatusUpdatedEvents,
  diamondAuSysOrderCreatedEvents,
  diamondAuSysOrderSettledEvents,
  diamondAuSysOrderStatusUpdatedEvents,
  diamondDriverAssignedEvents,
  diamondEmitSigEvents,
  diamondFundsEscrowedEvents,
  diamondFundsRefundedEvents,
  diamondJourneyCanceledEvents,
  diamondJourneyCreatedEvents,
  diamondNodeFeeDistributedEvents,
  diamondP2POfferAcceptedEvents,
  diamondP2POfferCanceledEvents,
  diamondP2POfferCreatedEvents,
  diamondSellerPaidEvents,
} from 'ponder:schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// AuSysFacet Events
// =============================================================================

/**
 * Handle AuSysAdminRevoked event from AuSysFacet
 * Signature: AuSysAdminRevoked(address)
 * Hash: 0xd66a521a
 */
ponder.on('Diamond:AuSysAdminRevoked', async ({ event, context }) => {
  const { admin } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondAuSysAdminRevokedEvents).values({
    id: id,
    admin: admin,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle AuSysAdminSet event from AuSysFacet
 * Signature: AuSysAdminSet(address)
 * Hash: 0x4762a0c8
 */
ponder.on('Diamond:AuSysAdminSet', async ({ event, context }) => {
  const { admin } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondAuSysAdminSetEvents).values({
    id: id,
    admin: admin,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle AuSysJourneyStatusUpdated event from AuSysFacet
 * Signature: AuSysJourneyStatusUpdated(bytes32,uint8,address,address,address,uint256,uint256,uint256,uint256,string,string,string,string,string,string)
 * Hash: 0x3ad95bcd
 */
ponder.on('Diamond:AuSysJourneyStatusUpdated', async ({ event, context }) => {
  const {
    journeyId,
    newStatus,
    sender,
    receiver,
    driver,
    bounty,
    ETA,
    journeyStart,
    journeyEnd,
    startLat,
    startLng,
    endLat,
    endLng,
    startName,
    endName,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondAuSysJourneyStatusUpdatedEvents).values({
    id: id,
    journey_id: journeyId,
    new_status: newStatus,
    sender: sender,
    receiver: receiver,
    driver: driver,
    bounty: bounty,
    e_t_a: ETA,
    journey_start: journeyStart,
    journey_end: journeyEnd,
    start_lat: startLat,
    start_lng: startLng,
    end_lat: endLat,
    end_lng: endLng,
    start_name: startName,
    end_name: endName,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle AuSysOrderCreated event from AuSysFacet
 * Signature: AuSysOrderCreated(bytes32,address,address,address,uint256,uint256,uint256,uint256,uint8,address[])
 * Hash: 0xda4150a1
 */
ponder.on('Diamond:AuSysOrderCreated', async ({ event, context }) => {
  const {
    orderId,
    buyer,
    seller,
    token,
    tokenId,
    tokenQuantity,
    price,
    txFee,
    currentStatus,
    nodes,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondAuSysOrderCreatedEvents).values({
    id: id,
    order_id: orderId,
    buyer: buyer,
    seller: seller,
    token: token,
    token_id: tokenId,
    token_quantity: tokenQuantity,
    price: price,
    tx_fee: txFee,
    current_status: currentStatus,
    nodes: nodes,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle AuSysOrderSettled event from AuSysFacet
 * Signature: AuSysOrderSettled(bytes32)
 * Hash: 0xf29c25eb
 */
ponder.on('Diamond:AuSysOrderSettled', async ({ event, context }) => {
  const { orderId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondAuSysOrderSettledEvents).values({
    id: id,
    order_id: orderId,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle AuSysOrderStatusUpdated event from AuSysFacet
 * Signature: AuSysOrderStatusUpdated(bytes32,uint8)
 * Hash: 0x4892b23d
 */
ponder.on('Diamond:AuSysOrderStatusUpdated', async ({ event, context }) => {
  const { orderId, newStatus } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondAuSysOrderStatusUpdatedEvents).values({
    id: id,
    order_id: orderId,
    new_status: newStatus,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle DriverAssigned event from AuSysFacet
 * Signature: DriverAssigned(bytes32,address,address,address,uint256,uint256,string,string,string,string,string,string)
 * Hash: 0x038b3745
 */
ponder.on('Diamond:DriverAssigned', async ({ event, context }) => {
  const {
    journeyId,
    driver,
    sender,
    receiver,
    bounty,
    ETA,
    startLat,
    startLng,
    endLat,
    endLng,
    startName,
    endName,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondDriverAssignedEvents).values({
    id: id,
    journey_id: journeyId,
    driver: driver,
    sender: sender,
    receiver: receiver,
    bounty: bounty,
    e_t_a: ETA,
    start_lat: startLat,
    start_lng: startLng,
    end_lat: endLat,
    end_lng: endLng,
    start_name: startName,
    end_name: endName,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle EmitSig event from AuSysFacet
 * Signature: EmitSig(address,bytes32)
 * Hash: 0x49d0f794
 */
ponder.on('Diamond:EmitSig', async ({ event, context }) => {
  const { user, id: arg_id } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondEmitSigEvents).values({
    id: id,
    user: user,
    event_id: arg_id,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle FundsEscrowed event from AuSysFacet
 * Signature: FundsEscrowed(address,uint256)
 * Hash: 0x4fbba82c
 */
ponder.on('Diamond:FundsEscrowed', async ({ event, context }) => {
  const { from, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondFundsEscrowedEvents).values({
    id: id,
    from: from,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle FundsRefunded event from AuSysFacet
 * Signature: FundsRefunded(address,uint256)
 * Hash: 0xbada1a1b
 */
ponder.on('Diamond:FundsRefunded', async ({ event, context }) => {
  const { to, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondFundsRefundedEvents).values({
    id: id,
    to: to,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle JourneyCanceled event from AuSysFacet
 * Signature: JourneyCanceled(bytes32,address,address,address,uint256,uint256,string,string,string,string,string,string)
 * Hash: 0x08a09942
 */
ponder.on('Diamond:JourneyCanceled', async ({ event, context }) => {
  const {
    journeyId,
    sender,
    receiver,
    driver,
    refundedAmount,
    bounty,
    startLat,
    startLng,
    endLat,
    endLng,
    startName,
    endName,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondJourneyCanceledEvents).values({
    id: id,
    journey_id: journeyId,
    sender: sender,
    receiver: receiver,
    driver: driver,
    refunded_amount: refundedAmount,
    bounty: bounty,
    start_lat: startLat,
    start_lng: startLng,
    end_lat: endLat,
    end_lng: endLng,
    start_name: startName,
    end_name: endName,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle JourneyCreated event from AuSysFacet
 * Signature: JourneyCreated(bytes32,address,address,address,uint256,uint256,bytes32,string,string,string,string,string,string)
 * Hash: 0x5508139b
 */
ponder.on('Diamond:JourneyCreated', async ({ event, context }) => {
  const {
    journeyId,
    sender,
    receiver,
    driver,
    bounty,
    ETA,
    orderId,
    startLat,
    startLng,
    endLat,
    endLng,
    startName,
    endName,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondJourneyCreatedEvents).values({
    id: id,
    journey_id: journeyId,
    sender: sender,
    receiver: receiver,
    driver: driver,
    bounty: bounty,
    e_t_a: ETA,
    order_id: orderId,
    start_lat: startLat,
    start_lng: startLng,
    end_lat: endLat,
    end_lng: endLng,
    start_name: startName,
    end_name: endName,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle NodeFeeDistributed event from AuSysFacet
 * Signature: NodeFeeDistributed(address,uint256)
 * Hash: 0x03dec068
 */
ponder.on('Diamond:NodeFeeDistributed', async ({ event, context }) => {
  const { node, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondNodeFeeDistributedEvents).values({
    id: id,
    node: node,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle P2POfferAccepted event from AuSysFacet
 * Signature: P2POfferAccepted(bytes32,address,bool)
 * Hash: 0x53038a93
 */
ponder.on('Diamond:P2POfferAccepted', async ({ event, context }) => {
  const { orderId, acceptor, isSellerInitiated } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondP2POfferAcceptedEvents).values({
    id: id,
    order_id: orderId,
    acceptor: acceptor,
    is_seller_initiated: isSellerInitiated,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle P2POfferCanceled event from AuSysFacet
 * Signature: P2POfferCanceled(bytes32,address)
 * Hash: 0x7abcf385
 */
ponder.on('Diamond:P2POfferCanceled', async ({ event, context }) => {
  const { orderId, creator } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondP2POfferCanceledEvents).values({
    id: id,
    order_id: orderId,
    creator: creator,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle P2POfferCreated event from AuSysFacet
 * Signature: P2POfferCreated(bytes32,address,bool,address,uint256,uint256,uint256,address,uint256)
 * Hash: 0x4c52c233
 */
ponder.on('Diamond:P2POfferCreated', async ({ event, context }) => {
  const {
    orderId,
    creator,
    isSellerInitiated,
    token,
    tokenId,
    tokenQuantity,
    price,
    targetCounterparty,
    expiresAt,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondP2POfferCreatedEvents).values({
    id: id,
    order_id: orderId,
    creator: creator,
    is_seller_initiated: isSellerInitiated,
    token: token,
    token_id: tokenId,
    token_quantity: tokenQuantity,
    price: price,
    target_counterparty: targetCounterparty,
    expires_at: expiresAt,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle SellerPaid event from AuSysFacet
 * Signature: SellerPaid(address,uint256)
 * Hash: 0xcb4a9094
 */
ponder.on('Diamond:SellerPaid', async ({ event, context }) => {
  const { seller, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Pure Dumb Indexer: Insert raw event only, no aggregates
  await context.db.insert(diamondSellerPaidEvents).values({
    id: id,
    seller: seller,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
