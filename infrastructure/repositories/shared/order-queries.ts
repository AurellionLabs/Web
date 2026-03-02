/**
 * Order-specific GraphQL queries using raw event tables
 *
 * These queries use raw event tables (pure dumb indexer pattern).
 * Aggregation happens in the repository/service layer.
 */

import { gql } from 'graphql-request';

// ============================================================================
// JOURNEY QUERIES (Raw Event Tables)
// Note: Journey data must be aggregated from multiple event tables:
// - diamondUnifiedOrderCreatedEvents (buyer/seller)
// - diamondLogisticsOrderCreatedEvents (bounty, journey_ids)
// - diamondJourneyStatusUpdatedEvents (phase/status)
// - diamondOrderSettledEvents (driver, amounts)
// ============================================================================

/**
 * Get journey events by buyer (sender) address
 * Returns unified orders where buyer matches
 */
export const GET_JOURNEYS_BY_SENDER = gql`
  query GetJourneysBySender($senderAddress: String!) {
    unifiedOrders: diamondUnifiedOrderCreatedEventss(
      where: { buyer: $senderAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        clob_order_id
        buyer
        seller
        token
        token_id
        quantity
        price
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get journey events by receiver (seller) address
 * Returns unified orders where seller matches
 */
export const GET_JOURNEYS_BY_RECEIVER = gql`
  query GetJourneysByReceiver($receiverAddress: String!) {
    unifiedOrders: diamondUnifiedOrderCreatedEventss(
      where: { seller: $receiverAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        clob_order_id
        buyer
        seller
        token
        token_id
        quantity
        price
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get journey status updates by journey ID
 */
export const GET_JOURNEY_BY_ID = gql`
  query GetJourneyById($journeyId: String!) {
    journeyUpdates: diamondJourneyStatusUpdatedEventss(
      where: { journey_id: $journeyId }
      orderBy: "block_timestamp"
      orderDirection: "desc"
      limit: 1
    ) {
      items {
        id
        unified_order_id
        journey_id
        phase
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get all logistics orders (which contain journey data)
 */
export const GET_ALL_JOURNEYS = gql`
  query GetAllJourneys($limit: Int = 100) {
    logistics: diamondLogisticsOrderCreatedEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        ausys_order_id
        journey_ids
        bounty
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
    journeyUpdates: diamondJourneyStatusUpdatedEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        journey_id
        phase
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get logistics order by unified_order_id (which contains journey_ids)
 */
export const GET_JOURNEYS_BY_ORDER_ID = gql`
  query GetJourneysByOrderId($orderId: String!) {
    logistics: diamondLogisticsOrderCreatedEventss(
      where: { unified_order_id: $orderId }
    ) {
      items {
        id
        unified_order_id
        journey_ids
        bounty
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// ============================================================================
// ORDER QUERIES (Raw Event Tables)
// Note: Order data comes from UnifiedOrderCreated events
// ============================================================================

/**
 * Get unified orders by buyer address
 */
export const GET_ORDERS_BY_BUYER = gql`
  query GetOrdersByBuyer($buyerAddress: String!) {
    unifiedOrders: diamondUnifiedOrderCreatedEventss(
      where: { buyer: $buyerAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        clob_order_id
        buyer
        seller
        token
        token_id
        quantity
        price
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get unified orders by seller address
 */
export const GET_ORDERS_BY_SELLER = gql`
  query GetOrdersBySeller($sellerAddress: String!) {
    unifiedOrders: diamondUnifiedOrderCreatedEventss(
      where: { seller: $sellerAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        clob_order_id
        buyer
        seller
        token
        token_id
        quantity
        price
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get unified order by order ID
 */
export const GET_ORDER_BY_ID = gql`
  query GetOrderById($orderId: String!) {
    unifiedOrders: diamondUnifiedOrderCreatedEventss(
      where: { unified_order_id: $orderId }
      limit: 1
    ) {
      items {
        id
        unified_order_id
        clob_order_id
        buyer
        seller
        token
        token_id
        quantity
        price
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get logistics orders by node address
 */
export const GET_ORDERS_BY_NODE = gql`
  query GetOrdersByNode($nodeAddress: String!) {
    logistics: diamondLogisticsOrderCreatedEventss(
      where: { node: $nodeAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        unified_order_id
        ausys_order_id
        journey_ids
        bounty
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

// ============================================================================
// RAW EVENT RESPONSE TYPES (Pure Dumb Indexer Pattern)
// These types match the generated schema from AuSysFacet events
// ============================================================================

/**
 * JourneyCreated event from AuSysFacet
 * Table: diamond_journey_created_events
 */
export interface JourneyCreatedRawEvent {
  id: string;
  journey_id: string;
  sender: string;
  receiver: string;
  driver: string;
  bounty: string;
  e_t_a: string;
  order_id: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

/**
 * DriverAssigned event from AuSysFacet
 * Table: diamond_driver_assigned_events
 */
export interface DriverAssignedRawEvent {
  id: string;
  journey_id: string;
  driver: string;
  sender: string;
  receiver: string;
  bounty: string;
  e_t_a: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

/**
 * AuSysJourneyStatusUpdated event from AuSysFacet
 * Table: diamond_au_sys_journey_status_updated_events
 */
export interface JourneyStatusUpdatedRawEvent {
  id: string;
  journey_id: string;
  new_status: string;
  sender: string;
  receiver: string;
  driver: string;
  bounty: string;
  e_t_a: string;
  journey_start: string;
  journey_end: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

/**
 * JourneyCanceled event from AuSysFacet
 * Table: diamond_journey_canceled_events
 */
export interface JourneyCanceledRawEvent {
  id: string;
  journey_id: string;
  sender: string;
  receiver: string;
  driver: string;
  refunded_amount: string;
  bounty: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  start_name: string;
  end_name: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

/**
 * AuSysOrderCreated event from AuSysFacet
 * Table: diamond_au_sys_order_created_events
 */
export interface AuSysOrderCreatedRawEvent {
  id: string;
  order_id: string;
  buyer: string;
  seller: string;
  token: string;
  token_id: string;
  token_quantity: string;
  price: string;
  tx_fee: string;
  current_status: string;
  nodes: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

// Bridge events (from BridgeFacet)
export interface UnifiedOrderRawEvent {
  id: string;
  unified_order_id: string;
  clob_order_id: string;
  buyer: string;
  seller: string;
  token: string;
  token_id: string;
  quantity: string;
  price: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface LogisticsOrderRawEvent {
  id: string;
  unified_order_id: string;
  ausys_order_id: string;
  journey_ids: string;
  bounty: string;
  node: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

// ============================================================================
// LEGACY RESPONSE TYPE ALIAS
// JourneyGraphResponse now maps to JourneyCreatedRawEvent for compatibility
// ============================================================================

export type JourneyGraphResponse = JourneyCreatedRawEvent;

export interface OrderGraphResponse {
  id: string;
  buyer: string;
  seller: string;
  token: string;
  token_id: string;
  token_quantity: string;
  requested_token_quantity: string;
  price: string;
  tx_fee: string;
  current_status: string;
  start_location_lat: string;
  start_location_lng: string;
  end_location_lat: string;
  end_location_lng: string;
  start_name: string;
  end_name: string;
  nodes: string[];
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

import { Order, OrderStatus } from '@/domain/orders/order';
import { Journey, JourneyStatus, ParcelData, Location } from '@/domain/shared';

/**
 * Convert numeric to JourneyStatus
 */
export function convertNumericToJourneyStatus(
  status: string | number | bigint,
): JourneyStatus {
  const statusNum = Number(status);
  switch (statusNum) {
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

/**
 * Convert numeric to OrderStatus
 */
export function convertNumericToOrderStatus(
  status: string | number | bigint,
): OrderStatus {
  const statusNum = Number(status);
  switch (statusNum) {
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
 * Build location from coordinates
 */
function buildLocation(lat?: string, lng?: string): Location | undefined {
  if (!lat || !lng) return undefined;
  return { lat, lng };
}

/**
 * Build ParcelData from order response
 */
function buildParcelData(raw: OrderGraphResponse): ParcelData | undefined {
  const startLocation = buildLocation(
    raw.start_location_lat,
    raw.start_location_lng,
  );
  const endLocation = buildLocation(raw.end_location_lat, raw.end_location_lng);

  if (!startLocation && !endLocation && !raw.start_name && !raw.end_name) {
    return undefined;
  }

  return {
    startLocation: startLocation ?? { lat: '', lng: '' },
    endLocation: endLocation ?? { lat: '', lng: '' },
    startName: raw.start_name ?? '',
    endName: raw.end_name ?? '',
  };
}

/**
 * Convert JourneyCreated raw event to domain Journey
 * Note: JourneyCreated doesn't have current_status, journey_start, journey_end
 * Those come from JourneyStatusUpdated events
 */
export function convertJourneyCreatedToDomain(
  event: JourneyCreatedRawEvent,
  statusEvent?: JourneyStatusUpdatedRawEvent,
): Journey {
  const startLocation = buildLocation(event.start_lat, event.start_lng);
  const endLocation = buildLocation(event.end_lat, event.end_lng);

  return {
    parcelData: {
      startLocation: startLocation ?? { lat: '', lng: '' },
      endLocation: endLocation ?? { lat: '', lng: '' },
      startName: event.start_name,
      endName: event.end_name,
    },
    journeyId: event.journey_id,
    currentStatus: statusEvent
      ? convertNumericToJourneyStatus(statusEvent.new_status)
      : JourneyStatus.PENDING,
    sender: event.sender,
    receiver: event.receiver,
    driver: statusEvent?.driver || event.driver,
    journeyStart: BigInt(statusEvent?.journey_start || '0'),
    journeyEnd: BigInt(statusEvent?.journey_end || '0'),
    bounty: BigInt(event.bounty || '0'),
    ETA: BigInt(event.e_t_a || '0'),
  };
}

/**
 * @deprecated Use convertJourneyCreatedToDomain instead
 * Legacy alias for backward compatibility
 */
export const convertGraphJourneyToDomain = convertJourneyCreatedToDomain;

/**
 * Convert Graph response to domain Order
 */
export function convertGraphOrderToDomain(
  graphOrder: OrderGraphResponse,
): Order {
  return {
    id: graphOrder.id,
    token: graphOrder.token,
    tokenId: graphOrder.token_id,
    tokenQuantity: graphOrder.token_quantity,
    price: graphOrder.price,
    txFee: graphOrder.tx_fee,
    buyer: graphOrder.buyer,
    seller: graphOrder.seller,
    journeyIds: [],
    nodes: graphOrder.nodes || [],
    locationData: buildParcelData(graphOrder),
    currentStatus: convertNumericToOrderStatus(graphOrder.current_status),
    contractualAgreement: '',
  };
}
