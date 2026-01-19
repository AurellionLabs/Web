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
} from './indexer-types';
import { Node, NodeLocation, NodeAsset } from '@/domain/node';
import { Order, OrderStatus } from '@/domain/orders/order';
import { Journey, JourneyStatus, ParcelData } from '@/domain/shared';

// ============================================================================
// Utility Functions
// ============================================================================

/** Sort events by block timestamp ascending (oldest first) */
function sortEventsByTimestamp<T extends BaseEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const timeA = BigInt(a.blockTimestamp);
    const timeB = BigInt(b.blockTimestamp);
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
    e.nodeHash.toLowerCase(),
  );
  const assetsByNode = groupEventsBy(assetsAdded, (e) =>
    e.nodeHash.toLowerCase(),
  );

  const nodes: Node[] = [];

  for (const regEvent of registered) {
    const nodeHash = regEvent.nodeHash.toLowerCase();

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
      tokenId: ae.tokenId,
      price: BigInt(ae.price),
      capacity: Number(ae.capacity),
    }));

    // Build location
    const location: NodeLocation = {
      addressName: latestLocation?.addressName || '',
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
    e.nodeHash.toLowerCase(),
  );

  const nodes: AggregatedNode[] = [];

  for (const regEvent of registered) {
    const nodeHash = regEvent.nodeHash.toLowerCase();

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
      nodeType: regEvent.nodeType,
      addressName: latestLocation?.addressName || '',
      lat: latestLocation?.lat || '',
      lng: latestLocation?.lng || '',
      status,
      isActive: !wasDeactivated,
      createdAt: regEvent.blockTimestamp,
      updatedAt: latestEvent?.blockTimestamp || regEvent.blockTimestamp,
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
  const filledByOrder = groupEventsBy(filled, (e) => e.orderId.toLowerCase());
  const cancelledByOrder = groupEventsBy(cancelled, (e) =>
    e.orderId.toLowerCase(),
  );
  const expiredByOrder = groupEventsBy(expired, (e) => e.orderId.toLowerCase());

  const orders: AggregatedOrder[] = [];

  for (const placedEvent of allPlaced) {
    const orderId = placedEvent.orderId.toLowerCase();

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
    const remainingAmount = latestFill?.remainingAmount || placedEvent.amount;
    const cumulativeFilled = latestFill?.cumulativeFilled || '0';

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
      baseToken: placedEvent.baseToken,
      baseTokenId: placedEvent.baseTokenId,
      quoteToken: placedEvent.quoteToken,
      price: placedEvent.price,
      originalAmount: placedEvent.amount,
      remainingAmount,
      cumulativeFilled,
      isBuy: placedEvent.isBuy,
      orderType: placedEvent.orderType,
      status,
      createdAt: placedEvent.blockTimestamp,
      updatedAt: latestEvent?.blockTimestamp || placedEvent.blockTimestamp,
      transactionHash: placedEvent.transactionHash,
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
    e.unifiedOrderId.toLowerCase(),
  );
  const journeysByOrder = groupEventsBy(journeyUpdates, (e) =>
    e.unifiedOrderId.toLowerCase(),
  );
  const settledByOrder = groupEventsBy(settled, (e) =>
    e.unifiedOrderId.toLowerCase(),
  );

  const orders: AggregatedUnifiedOrder[] = [];

  for (const createEvent of created) {
    const unifiedOrderId = createEvent.unifiedOrderId.toLowerCase();

    // Get logistics info
    const logisticsEvents = logisticsByOrder.get(unifiedOrderId) || [];
    const latestLogistics = getLatestEvent(logisticsEvents);

    // Get journey IDs from logistics events
    const journeyIds: string[] = [];
    for (const log of logisticsEvents) {
      // journeyIds is stored as a hex string, need to parse
      if (log.journeyIds) {
        journeyIds.push(log.journeyIds);
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
      clobOrderId: createEvent.clobOrderId,
      buyer: createEvent.buyer,
      seller: createEvent.seller,
      token: createEvent.token,
      tokenId: createEvent.tokenId,
      quantity: createEvent.quantity,
      price: createEvent.price,
      status,
      journeyIds,
      createdAt: createEvent.blockTimestamp,
      updatedAt: latestEvent?.blockTimestamp || createEvent.blockTimestamp,
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
    e.journeyId.toLowerCase(),
  );

  const journeys: AggregatedJourney[] = [];

  // Each logistics event creates journeys
  for (const log of logistics) {
    const journeyId = log.journeyIds.toLowerCase();

    // Get status updates for this journey
    const statusUpdates = updatesByJourney.get(journeyId) || [];
    const latestUpdate = getLatestEvent(statusUpdates);

    journeys.push({
      journeyId,
      unifiedOrderId: log.unifiedOrderId,
      ausysOrderId: log.ausysOrderId,
      bounty: log.bounty,
      node: log.node,
      phase: latestUpdate?.phase || '0',
      createdAt: log.blockTimestamp,
      updatedAt: latestUpdate?.blockTimestamp || log.blockTimestamp,
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
    .filter((e) => e.nodeHash.toLowerCase() === nodeHashLower)
    .map((e) => ({
      token: e.token,
      tokenId: e.tokenId,
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
