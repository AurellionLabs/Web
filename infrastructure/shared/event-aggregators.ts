/**
 * Event Aggregators - Pure Functions for Raw Event Aggregation
 *
 * These functions take arrays of raw events from the indexer and produce
 * aggregated domain entities. All aggregation logic lives here, not in the indexer.
 *
 * Design principles:
 * - Pure functions (no side effects, no external dependencies)
 * - Events are processed in chronological order (by blockTimestamp)
 * - Latest event wins for conflicting updates
 * - Fully testable without mocking
 */

import {
  NodeRegisteredEvent,
  NodeDeactivatedEvent,
  UpdateLocationEvent,
  UpdateStatusEvent,
  SupportedAssetAddedEvent,
  OrderPlacedWithTokensEvent,
  CLOBOrderFilledEvent,
  CLOBOrderCancelledEvent,
  OrderExpiredEvent,
  UnifiedOrderCreatedEvent,
  LogisticsOrderCreatedEvent,
  JourneyStatusUpdatedEvent,
  OrderSettledEvent,
  RouterOrderPlacedEvent,
  AggregatedNode,
  AggregatedOrder,
  AggregatedJourney,
  AggregatedUnifiedOrder,
  BaseEvent,
  P2POfferCreatedEvent,
  P2POfferAcceptedEvent,
  P2PMarketStats,
} from './indexer-types';
import type {
  P2POfferCreatedRawEvent,
  P2POfferAcceptedRawEvent,
  AuSysOrderStatusUpdatedRawEvent,
  JourneyCreatedForOrderRawEvent,
  JourneyStatusUpdateRawEvent,
} from './graph-queries';
import { Node, NodeLocation, NodeAsset } from '@/domain/node';
import { Order, OrderStatus } from '@/domain/orders/order';
import { Journey, JourneyStatus, ParcelData } from '@/domain/shared';

// ============================================================================
// Utility Functions
// ============================================================================

/** Sort events by block timestamp ascending (oldest first) */
function sortEventsByTimestamp<T extends BaseEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const timeA = BigInt(a.block_timestamp);
    const timeB = BigInt(b.block_timestamp);
    if (timeA < timeB) return -1;
    if (timeA > timeB) return 1;
    return 0;
  });
}

/** Get the latest event by timestamp */
function getLatestEvent<T extends BaseEvent>(events: T[]): T | undefined {
  if (events.length === 0) return undefined;
  return sortEventsByTimestamp(events)[events.length - 1];
}

/** Group events by a key field */
function groupEventsBy<T extends BaseEvent>(
  events: T[],
  keyFn: (event: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    const key = keyFn(event);
    const existing = groups.get(key) || [];
    existing.push(event);
    groups.set(key, existing);
  }
  return groups;
}

/** Convert hex status to human-readable status */
function hexStatusToNodeStatus(hexStatus: string): 'Active' | 'Inactive' {
  // 0x01 = Active, 0x00 = Inactive
  return hexStatus === '0x01' || hexStatus === '0x1' ? 'Active' : 'Inactive';
}

/** Convert numeric phase to JourneyStatus */
function phaseToJourneyStatus(phase: string): JourneyStatus {
  const phaseNum = parseInt(phase, 10);
  switch (phaseNum) {
    case 0:
      return JourneyStatus.PENDING;
    case 1:
      return JourneyStatus.IN_TRANSIT;
    case 2:
      return JourneyStatus.DELIVERED;
    case 3:
      return JourneyStatus.CANCELLED;
    default:
      return JourneyStatus.PENDING;
  }
}

/** Determine order status from fill/cancel events */
function determineOrderStatus(
  originalAmount: string,
  remainingAmount: string,
  cumulativeFilled: string,
  isCancelled: boolean,
  isExpired: boolean,
): 'open' | 'partial' | 'filled' | 'cancelled' | 'expired' {
  if (isExpired) return 'expired';
  if (isCancelled) return 'cancelled';

  const original = BigInt(originalAmount);
  const remaining = BigInt(remainingAmount);
  const filled = BigInt(cumulativeFilled);

  if (remaining === 0n || filled >= original) return 'filled';
  if (filled > 0n) return 'partial';
  return 'open';
}

// ============================================================================
// Node Aggregation
// ============================================================================

export interface NodeEventSources {
  registered: NodeRegisteredEvent[];
  deactivated: NodeDeactivatedEvent[];
  locationUpdates: UpdateLocationEvent[];
  statusUpdates: UpdateStatusEvent[];
  assetsAdded: SupportedAssetAddedEvent[];
}

/**
 * Aggregate node events into Node domain entities
 *
 * Processing order:
 * 1. NodeRegistered creates the base node
 * 2. UpdateLocation updates location fields
 * 3. UpdateStatus updates status
 * 4. NodeDeactivated marks node as inactive
 * 5. SupportedAssetAdded adds assets to the node
 */
export function aggregateNodes(sources: NodeEventSources): Node[] {
  const {
    registered,
    deactivated,
    locationUpdates,
    statusUpdates,
    assetsAdded,
  } = sources;

  // Group all events by node identifier
  const locationByNode = groupEventsBy(locationUpdates, (e) =>
    e.node.toLowerCase(),
  );
  const statusByNode = groupEventsBy(statusUpdates, (e) =>
    e.node.toLowerCase(),
  );
  const deactivatedByNode = groupEventsBy(deactivated, (e) =>
    e.node_hash.toLowerCase(),
  );
  const assetsByNode = groupEventsBy(assetsAdded, (e) =>
    e.node_hash.toLowerCase(),
  );

  const nodes: Node[] = [];

  for (const regEvent of registered) {
    const nodeHash = regEvent.node_hash.toLowerCase();

    // Get latest location update
    const locationEvents = locationByNode.get(nodeHash) || [];
    const latestLocation = getLatestEvent(locationEvents);

    // Get latest status update
    const statusEvents = statusByNode.get(nodeHash) || [];
    const latestStatus = getLatestEvent(statusEvents);

    // Check if node was deactivated
    const deactivatedEvents = deactivatedByNode.get(nodeHash) || [];
    const wasDeactivated = deactivatedEvents.length > 0;

    // Get all assets for this node
    const nodeAssetEvents = assetsByNode.get(nodeHash) || [];
    const assets: NodeAsset[] = nodeAssetEvents.map((ae) => ({
      token: ae.token,
      tokenId: ae.token_id,
      price: BigInt(ae.price),
      capacity: Number(ae.capacity),
    }));

    // Build location
    const location: NodeLocation = {
      addressName: latestLocation?.address_name || '',
      location: {
        lat: latestLocation?.lat || '',
        lng: latestLocation?.lng || '',
      },
    };

    // Determine status
    let status: 'Active' | 'Inactive' = 'Active';
    if (wasDeactivated) {
      status = 'Inactive';
    } else if (latestStatus) {
      status = hexStatusToNodeStatus(latestStatus.status);
    }

    nodes.push({
      address: nodeHash,
      owner: regEvent.owner,
      location,
      validNode: !wasDeactivated,
      assets,
      status,
    });
  }

  return nodes;
}

/**
 * Aggregate to AggregatedNode (lighter weight, for lists)
 */
export function aggregateNodesToDTO(
  sources: NodeEventSources,
): AggregatedNode[] {
  const { registered, deactivated, locationUpdates, statusUpdates } = sources;

  const locationByNode = groupEventsBy(locationUpdates, (e) =>
    e.node.toLowerCase(),
  );
  const statusByNode = groupEventsBy(statusUpdates, (e) =>
    e.node.toLowerCase(),
  );
  const deactivatedByNode = groupEventsBy(deactivated, (e) =>
    e.node_hash.toLowerCase(),
  );

  const nodes: AggregatedNode[] = [];

  for (const regEvent of registered) {
    const nodeHash = regEvent.node_hash.toLowerCase();

    const locationEvents = locationByNode.get(nodeHash) || [];
    const latestLocation = getLatestEvent(locationEvents);

    const statusEvents = statusByNode.get(nodeHash) || [];
    const latestStatus = getLatestEvent(statusEvents);

    const deactivatedEvents = deactivatedByNode.get(nodeHash) || [];
    const wasDeactivated = deactivatedEvents.length > 0;

    let status = 'Active';
    if (wasDeactivated) {
      status = 'Inactive';
    } else if (latestStatus) {
      status = hexStatusToNodeStatus(latestStatus.status);
    }

    // Find the latest update timestamp
    const allEvents = [
      regEvent,
      ...locationEvents,
      ...statusEvents,
      ...deactivatedEvents,
    ];
    const latestEvent = getLatestEvent(allEvents as BaseEvent[]);

    nodes.push({
      nodeHash,
      owner: regEvent.owner,
      nodeType: regEvent.node_type,
      addressName: latestLocation?.address_name || '',
      lat: latestLocation?.lat || '',
      lng: latestLocation?.lng || '',
      status,
      isActive: !wasDeactivated,
      createdAt: regEvent.block_timestamp,
      updatedAt: latestEvent?.block_timestamp || regEvent.block_timestamp,
    });
  }

  return nodes;
}

// ============================================================================
// CLOB Order Aggregation
// ============================================================================

export interface OrderEventSources {
  placed: OrderPlacedWithTokensEvent[];
  routerPlaced: RouterOrderPlacedEvent[];
  filled: CLOBOrderFilledEvent[];
  cancelled: CLOBOrderCancelledEvent[];
  expired: OrderExpiredEvent[];
}

/**
 * Aggregate CLOB order events into AggregatedOrder entities
 *
 * Processing:
 * 1. OrderPlacedWithTokens creates the base order
 * 2. CLOBOrderFilled updates fill amounts
 * 3. CLOBOrderCancelled marks as cancelled
 * 4. OrderExpired marks as expired
 */
export function aggregateOrders(sources: OrderEventSources): AggregatedOrder[] {
  const { placed, routerPlaced, filled, cancelled, expired } = sources;

  // Combine all placement events
  const allPlaced = [
    ...placed.map((p) => ({ ...p, source: 'direct' as const })),
    ...routerPlaced.map((p) => ({ ...p, source: 'router' as const })),
  ];

  // Group events by orderId
  const filledByOrder = groupEventsBy(filled, (e) => e.order_id.toLowerCase());
  const cancelledByOrder = groupEventsBy(cancelled, (e) =>
    e.order_id.toLowerCase(),
  );
  const expiredByOrder = groupEventsBy(expired, (e) =>
    e.order_id.toLowerCase(),
  );

  const orders: AggregatedOrder[] = [];

  for (const placedEvent of allPlaced) {
    const orderId = placedEvent.order_id.toLowerCase();

    // Get all fill events for this order
    const fillEvents = sortEventsByTimestamp(filledByOrder.get(orderId) || []);
    const latestFill = fillEvents[fillEvents.length - 1];

    // Check if cancelled
    const cancelEvents = cancelledByOrder.get(orderId) || [];
    const isCancelled = cancelEvents.length > 0;

    // Check if expired
    const expireEvents = expiredByOrder.get(orderId) || [];
    const isExpired = expireEvents.length > 0;

    // Calculate current state
    const remainingAmount = latestFill?.remaining_amount || placedEvent.amount;
    const cumulativeFilled = latestFill?.cumulative_filled || '0';

    const status = determineOrderStatus(
      placedEvent.amount,
      remainingAmount,
      cumulativeFilled,
      isCancelled,
      isExpired,
    );

    // Find latest update
    const allEvents = [
      placedEvent,
      ...fillEvents,
      ...cancelEvents,
      ...expireEvents,
    ];
    const latestEvent = getLatestEvent(allEvents as BaseEvent[]);

    orders.push({
      orderId,
      maker: placedEvent.maker,
      baseToken: placedEvent.base_token,
      baseTokenId: placedEvent.base_token_id,
      quoteToken: placedEvent.quote_token,
      price: placedEvent.price,
      originalAmount: placedEvent.amount,
      remainingAmount,
      cumulativeFilled,
      isBuy: placedEvent.is_buy,
      orderType: placedEvent.order_type,
      status,
      createdAt: placedEvent.block_timestamp,
      updatedAt: latestEvent?.block_timestamp || placedEvent.block_timestamp,
      transactionHash: placedEvent.transaction_hash,
    });
  }

  return orders;
}

/**
 * Convert AggregatedOrder to domain Order type
 */
export function aggregatedOrderToDomain(agg: AggregatedOrder): Order {
  // Map aggregated status to OrderStatus enum
  let currentStatus: OrderStatus;
  switch (agg.status) {
    case 'filled':
    case 'partial':
      currentStatus = OrderStatus.PROCESSING;
      break;
    case 'cancelled':
    case 'expired':
      currentStatus = OrderStatus.CANCELLED;
      break;
    default:
      currentStatus = OrderStatus.CREATED;
  }

  return {
    id: agg.orderId,
    token: agg.baseToken,
    tokenId: agg.baseTokenId,
    tokenQuantity: agg.originalAmount,
    price: agg.price,
    txFee: '0',
    buyer: agg.isBuy ? agg.maker : '',
    seller: agg.isBuy ? '' : agg.maker,
    journeyIds: [],
    nodes: [],
    locationData: undefined,
    currentStatus,
    contractualAgreement: '',
  };
}

// ============================================================================
// Unified Order / Journey Aggregation
// ============================================================================

export interface UnifiedOrderEventSources {
  created: UnifiedOrderCreatedEvent[];
  logistics: LogisticsOrderCreatedEvent[];
  journeyUpdates: JourneyStatusUpdatedEvent[];
  settled: OrderSettledEvent[];
}

/**
 * Aggregate unified order events
 */
export function aggregateUnifiedOrders(
  sources: UnifiedOrderEventSources,
): AggregatedUnifiedOrder[] {
  const { created, logistics, journeyUpdates, settled } = sources;

  const logisticsByOrder = groupEventsBy(logistics, (e) =>
    e.unified_order_id.toLowerCase(),
  );
  const journeysByOrder = groupEventsBy(journeyUpdates, (e) =>
    e.unified_order_id.toLowerCase(),
  );
  const settledByOrder = groupEventsBy(settled, (e) =>
    e.unified_order_id.toLowerCase(),
  );

  const orders: AggregatedUnifiedOrder[] = [];

  for (const createEvent of created) {
    const unifiedOrderId = createEvent.unified_order_id.toLowerCase();

    // Get logistics info
    const logisticsEvents = logisticsByOrder.get(unifiedOrderId) || [];
    const latestLogistics = getLatestEvent(logisticsEvents);

    // Get journey IDs from logistics events
    const journeyIds: string[] = [];
    for (const log of logisticsEvents) {
      // journeyIds is stored as a hex string, need to parse
      if (log.journey_ids) {
        journeyIds.push(log.journey_ids);
      }
    }

    // Check if settled
    const settleEvents = settledByOrder.get(unifiedOrderId) || [];
    const isSettled = settleEvents.length > 0;

    // Determine status
    let status: 'created' | 'matched' | 'settled' | 'cancelled' = 'created';
    if (isSettled) {
      status = 'settled';
    } else if (logisticsEvents.length > 0) {
      status = 'matched';
    }

    // Find latest update
    const allEvents = [createEvent, ...logisticsEvents, ...settleEvents];
    const latestEvent = getLatestEvent(allEvents as BaseEvent[]);

    orders.push({
      unifiedOrderId,
      clobOrderId: createEvent.clob_order_id,
      buyer: createEvent.buyer,
      seller: createEvent.seller,
      token: createEvent.token,
      tokenId: createEvent.token_id,
      quantity: createEvent.quantity,
      price: createEvent.price,
      status,
      journeyIds,
      createdAt: createEvent.block_timestamp,
      updatedAt: latestEvent?.block_timestamp || createEvent.block_timestamp,
    });
  }

  return orders;
}

/**
 * Aggregate journey events
 */
export function aggregateJourneys(
  logistics: LogisticsOrderCreatedEvent[],
  journeyUpdates: JourneyStatusUpdatedEvent[],
): AggregatedJourney[] {
  // Group journey updates by journeyId
  const updatesByJourney = groupEventsBy(journeyUpdates, (e) =>
    e.journey_id.toLowerCase(),
  );

  const journeys: AggregatedJourney[] = [];

  // Each logistics event creates journeys
  for (const log of logistics) {
    const journeyId = log.journey_ids.toLowerCase();

    // Get status updates for this journey
    const statusUpdates = updatesByJourney.get(journeyId) || [];
    const latestUpdate = getLatestEvent(statusUpdates);

    journeys.push({
      journeyId,
      unifiedOrderId: log.unified_order_id,
      ausysOrderId: log.ausys_order_id,
      bounty: log.bounty,
      node: log.node,
      phase: latestUpdate?.phase || '0',
      createdAt: log.block_timestamp,
      updatedAt: latestUpdate?.block_timestamp || log.block_timestamp,
    });
  }

  return journeys;
}

/**
 * Convert AggregatedJourney to domain Journey type
 * Note: This is a partial conversion - some fields require additional data
 */
export function aggregatedJourneyToDomain(
  agg: AggregatedJourney,
): Partial<Journey> {
  return {
    journeyId: agg.journeyId,
    currentStatus: phaseToJourneyStatus(agg.phase),
    bounty: BigInt(agg.bounty),
    journeyStart: BigInt(agg.createdAt),
    // These fields require additional event data or contract calls:
    // parcelData, sender, receiver, driver, journeyEnd, ETA
  };
}

// ============================================================================
// Node Asset Aggregation
// ============================================================================

/**
 * Aggregate supported assets for a specific node
 */
export function aggregateNodeAssets(
  nodeHash: string,
  assetsAdded: SupportedAssetAddedEvent[],
): NodeAsset[] {
  const nodeHashLower = nodeHash.toLowerCase();

  return assetsAdded
    .filter((e) => e.node_hash.toLowerCase() === nodeHashLower)
    .map((e) => ({
      token: e.token,
      tokenId: e.token_id,
      price: BigInt(e.price),
      capacity: Number(e.capacity),
    }));
}

// ============================================================================
// Filter Helpers
// ============================================================================

/**
 * Filter orders by maker address
 */
export function filterOrdersByMaker(
  orders: AggregatedOrder[],
  maker: string,
): AggregatedOrder[] {
  const makerLower = maker.toLowerCase();
  return orders.filter((o) => o.maker.toLowerCase() === makerLower);
}

/**
 * Filter orders by status
 */
export function filterOrdersByStatus(
  orders: AggregatedOrder[],
  statuses: AggregatedOrder['status'][],
): AggregatedOrder[] {
  return orders.filter((o) => statuses.includes(o.status));
}

/**
 * Filter nodes by owner
 */
export function filterNodesByOwner(nodes: Node[], owner: string): Node[] {
  const ownerLower = owner.toLowerCase();
  return nodes.filter((n) => n.owner.toLowerCase() === ownerLower);
}

/**
 * Filter active nodes only
 */
export function filterActiveNodes(nodes: Node[]): Node[] {
  return nodes.filter((n) => n.validNode && n.status === 'Active');
}

/**
 * Find node by address
 */
export function findNodeByAddress(
  nodes: Node[],
  address: string,
): Node | undefined {
  const addressLower = address.toLowerCase();
  return nodes.find((n) => n.address.toLowerCase() === addressLower);
}

/**
 * Find order by ID
 */
export function findOrderById(
  orders: AggregatedOrder[],
  orderId: string,
): AggregatedOrder | undefined {
  const orderIdLower = orderId.toLowerCase();
  return orders.find((o) => o.orderId.toLowerCase() === orderIdLower);
}

// ============================================================================
// P2P Aggregation
// ============================================================================

// Re-export P2P types for consumers
export type { P2POfferCreatedEvent, P2POfferAcceptedEvent, P2PMarketStats };

/**
 * Aggregate P2P market statistics from raw indexer events.
 *
 * Computes:
 * - totalVolume: sum of (price * quantity) for accepted offers
 * - tradeCount: number of unique accepted offers
 * - openOfferCount: created offers minus accepted ones
 * - volumeByTokenId: per-token volume breakdown
 *
 * @param createdEvents - Raw P2POfferCreated events
 * @param acceptedEvents - Raw P2POfferAccepted events
 * @returns Aggregated market statistics
 */
export function aggregateP2PMarketStats(
  createdEvents: P2POfferCreatedEvent[],
  acceptedEvents: P2POfferAcceptedEvent[],
): P2PMarketStats {
  // Index created events by order_id for O(1) lookup
  const createdByOrderId = new Map<string, P2POfferCreatedEvent>();
  for (const evt of createdEvents) {
    createdByOrderId.set(evt.order_id, evt);
  }

  // Deduplicate accepted events by order_id
  const acceptedOrderIds = new Set<string>();
  for (const evt of acceptedEvents) {
    acceptedOrderIds.add(evt.order_id);
  }

  // Calculate volume from accepted offers only
  let totalVolume = 0n;
  let tradeCount = 0;
  const volumeByTokenId: Record<string, bigint> = {};

  for (const orderId of acceptedOrderIds) {
    const created = createdByOrderId.get(orderId);
    if (!created) continue; // Orphan accepted event, skip

    const price = BigInt(created.price);
    const quantity = BigInt(created.token_quantity);
    const volume = price * quantity;

    totalVolume += volume;
    tradeCount++;

    const tokenId = created.token_id;
    volumeByTokenId[tokenId] = (volumeByTokenId[tokenId] || 0n) + volume;
  }

  // Open offers = created - accepted
  const openOfferCount = createdEvents.length - acceptedOrderIds.size;

  // Convert bigint values to strings for JSON serialization
  const volumeByTokenIdStr: Record<string, string> = {};
  for (const [tokenId, vol] of Object.entries(volumeByTokenId)) {
    volumeByTokenIdStr[tokenId] = vol.toString();
  }

  return {
    totalVolume: totalVolume.toString(),
    tradeCount,
    openOfferCount: Math.max(0, openOfferCount),
    volumeByTokenId: volumeByTokenIdStr,
  };
}

// ============================================================================
// P2P Order Aggregation for Dashboard
// ============================================================================

/**
 * Map a contract numeric status to an OrderStatus enum value.
 */
function contractStatusToOrderStatus(status: number): OrderStatus {
  switch (status) {
    case 0:
      return OrderStatus.CREATED;
    case 1:
      return OrderStatus.PROCESSING;
    case 2:
      return OrderStatus.SETTLED;
    case 3:
      return OrderStatus.CANCELLED;
    default:
      return OrderStatus.CREATED;
  }
}

/**
 * Aggregate P2P events into Order domain objects for the customer dashboard.
 *
 * @param createdByUser - P2P offers created by the user
 * @param acceptedByUser - P2P offers accepted by the user
 * @param allCreatedEvents - All P2P created events (to look up details of accepted offers)
 * @param statusUpdates - AuSys order status update events (to get current status)
 * @param userAddress - The current user's address (lowercased)
 * @param journeyEvents - Journey creation events (to link journeys to orders)
 * @param journeyStatusUpdates - Journey status update events (to get current journey phase)
 * @returns Order[] compatible with the dashboard's OrderWithAsset pattern
 */
export function aggregateP2POrdersForUser(
  createdByUser: P2POfferCreatedRawEvent[],
  acceptedByUser: P2POfferAcceptedRawEvent[],
  allCreatedEvents: P2POfferCreatedRawEvent[],
  statusUpdates: AuSysOrderStatusUpdatedRawEvent[],
  userAddress: string,
  journeyEvents: JourneyCreatedForOrderRawEvent[] = [],
  journeyStatusUpdates: JourneyStatusUpdateRawEvent[] = [],
): Order[] {
  const addr = userAddress.toLowerCase();

  // Build lookup: order_id → latest status
  const statusMap = new Map<string, number>();
  for (const su of statusUpdates) {
    const oid = su.order_id.toLowerCase();
    const status = Number(su.new_status);
    // Latest event wins (statusUpdates are ordered desc, first seen is newest)
    if (!statusMap.has(oid)) {
      statusMap.set(oid, status);
    }
  }

  // Build lookup: order_id → created event details
  const createdMap = new Map<string, P2POfferCreatedRawEvent>();
  for (const ce of allCreatedEvents) {
    createdMap.set(ce.order_id.toLowerCase(), ce);
  }

  // Build lookup: order_id → journey IDs
  const orderJourneyMap = new Map<string, string[]>();
  for (const je of journeyEvents) {
    const oid = je.order_id.toLowerCase();
    const existing = orderJourneyMap.get(oid) ?? [];
    existing.push(je.journey_id);
    orderJourneyMap.set(oid, existing);
  }

  // Build lookup: journey_id → latest status
  const journeyStatusMap = new Map<string, number>();
  for (const jsu of journeyStatusUpdates) {
    const jid = jsu.journey_id.toLowerCase();
    const status = Number(jsu.new_status);
    if (!journeyStatusMap.has(jid)) {
      journeyStatusMap.set(jid, status);
    }
  }

  const orders: Order[] = [];
  const seenOrderIds = new Set<string>();

  function buildOrder(
    orderId: string,
    created: P2POfferCreatedRawEvent,
    isBuyer: boolean,
    defaultStatus: number,
    counterparty: string,
  ): Order {
    const oid = orderId.toLowerCase();
    const contractStatus = statusMap.get(oid) ?? defaultStatus;
    const journeyIds = orderJourneyMap.get(oid) ?? [];

    // Get the latest journey status for this order (use the most recent journey)
    let journeyStatus: number | null = null;
    for (const jid of journeyIds) {
      const jStatus = journeyStatusMap.get(jid.toLowerCase());
      if (jStatus !== undefined) {
        journeyStatus = jStatus;
        break; // First journey (most recent) wins
      }
    }

    return {
      id: created.order_id,
      token: created.token,
      tokenId: created.token_id,
      tokenQuantity: created.token_quantity,
      price: created.price,
      txFee: '0',
      buyer: isBuyer ? addr : counterparty,
      seller: isBuyer ? counterparty : addr,
      journeyIds,
      nodes: [],
      currentStatus: contractStatusToOrderStatus(contractStatus),
      contractualAgreement: '',
      isP2P: true,
      journeyStatus,
      createdAt: Number(created.block_timestamp) || 0,
    };
  }

  // 1) Orders the user created
  //    The user is the creator, so the OTHER party is target_counterparty.
  for (const ce of createdByUser) {
    const oid = ce.order_id.toLowerCase();
    if (seenOrderIds.has(oid)) continue;
    seenOrderIds.add(oid);

    const isBuyer = !ce.is_seller_initiated;
    // counterparty = target_counterparty (the other side of the trade)
    orders.push(
      buildOrder(ce.order_id, ce, isBuyer, 0, ce.target_counterparty),
    );
  }

  // 2) Orders the user accepted (they are the counterparty)
  //    The user is the acceptor, so the OTHER party is the original creator.
  for (const ae of acceptedByUser) {
    const oid = ae.order_id.toLowerCase();
    if (seenOrderIds.has(oid)) continue;
    seenOrderIds.add(oid);

    const created = createdMap.get(oid);
    if (!created) continue; // Can't build order without creation details

    // If user accepted a seller-initiated offer, user is buyer; otherwise user is seller
    const isBuyer = created.is_seller_initiated;
    // counterparty = the original creator (the other side of the trade)
    orders.push(buildOrder(ae.order_id, created, isBuyer, 1, created.creator));
  }

  return orders;
}
