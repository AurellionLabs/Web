/**
 * Order-specific GraphQL queries for legacy compatibility
 *
 * These queries use aggregate tables that are still being migrated.
 * Eventually they will be replaced by raw event queries + aggregators.
 */

import { gql } from 'graphql-request';

// ============================================================================
// JOURNEY QUERIES (Legacy - use aggregate tables)
// ============================================================================

export const GET_JOURNEYS_BY_SENDER = gql`
  query GetJourneysBySender($senderAddress: String!) {
    journeyss(where: { sender: $senderAddress }) {
      items {
        id
        sender
        receiver
        driver
        currentStatus
        bounty
        journeyStart
        journeyEnd
        eta
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        orderId
        createdAt
      }
    }
  }
`;

export const GET_JOURNEYS_BY_RECEIVER = gql`
  query GetJourneysByReceiver($receiverAddress: String!) {
    journeyss(where: { receiver: $receiverAddress }) {
      items {
        id
        sender
        receiver
        driver
        currentStatus
        bounty
        journeyStart
        journeyEnd
        eta
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        orderId
        createdAt
      }
    }
  }
`;

export const GET_JOURNEY_BY_ID = gql`
  query GetJourneyById($journeyId: String!) {
    journeys(id: $journeyId) {
      id
      sender
      receiver
      driver
      currentStatus
      bounty
      journeyStart
      journeyEnd
      eta
      startLocationLat
      startLocationLng
      endLocationLat
      endLocationLng
      startName
      endName
      orderId
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_JOURNEYS = gql`
  query GetAllJourneys($limit: Int = 100) {
    journeyss(limit: $limit, orderBy: "createdAt", orderDirection: "desc") {
      items {
        id
        sender
        receiver
        driver
        currentStatus
        bounty
        journeyStart
        journeyEnd
        eta
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        orderId
        createdAt
      }
    }
  }
`;

export const GET_JOURNEYS_BY_ORDER_ID = gql`
  query GetJourneysByOrderId($orderId: String!) {
    journeyss(where: { orderId: $orderId }) {
      items {
        id
      }
    }
  }
`;

// ============================================================================
// ORDER QUERIES (Legacy - use aggregate tables)
// ============================================================================

export const GET_ORDERS_BY_BUYER = gql`
  query GetOrdersByBuyer($buyerAddress: String!) {
    orderss(where: { buyer: $buyerAddress }) {
      items {
        id
        buyer
        seller
        token
        tokenId
        tokenQuantity
        requestedTokenQuantity
        price
        txFee
        currentStatus
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        nodes
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_ORDERS_BY_SELLER = gql`
  query GetOrdersBySeller($sellerAddress: String!) {
    orderss(where: { seller: $sellerAddress }) {
      items {
        id
        buyer
        seller
        token
        tokenId
        tokenQuantity
        requestedTokenQuantity
        price
        txFee
        currentStatus
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        nodes
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_ORDER_BY_ID = gql`
  query GetOrderById($orderId: String!) {
    orders(id: $orderId) {
      id
      buyer
      seller
      token
      tokenId
      tokenQuantity
      requestedTokenQuantity
      price
      txFee
      currentStatus
      startLocationLat
      startLocationLng
      endLocationLat
      endLocationLng
      startName
      endName
      nodes
      createdAt
      updatedAt
    }
  }
`;

export const GET_ORDERS_BY_NODE = gql`
  query GetOrdersByNode($nodeAddress: String!) {
    orderss(where: { nodes_contains: $nodeAddress }) {
      items {
        id
        buyer
        seller
        token
        tokenId
        tokenQuantity
        requestedTokenQuantity
        price
        txFee
        currentStatus
        startLocationLat
        startLocationLng
        endLocationLat
        endLocationLng
        startName
        endName
        nodes
        createdAt
        updatedAt
      }
    }
  }
`;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface JourneyGraphResponse {
  id: string;
  journey_id: string;
  unified_order_id: string;
  sender: string;
  receiver: string;
  driver: string;
  current_status: string;
  bounty: string;
  journey_start: string;
  journey_end: string;
  eta: string;
  start_location_lat: string;
  start_location_lng: string;
  end_location_lat: string;
  end_location_lng: string;
  start_name: string;
  end_name: string;
  order_id: string;
  created_at: string;
  updated_at?: string;
}

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
 * Convert Graph response to domain Journey
 */
export function convertGraphJourneyToDomain(
  graphJourney: JourneyGraphResponse,
): Journey {
  const startLocation = buildLocation(
    graphJourney.start_location_lat,
    graphJourney.start_location_lng,
  );
  const endLocation = buildLocation(
    graphJourney.end_location_lat,
    graphJourney.end_location_lng,
  );

  return {
    parcelData: {
      startLocation: startLocation ?? { lat: '', lng: '' },
      endLocation: endLocation ?? { lat: '', lng: '' },
      startName: graphJourney.start_name,
      endName: graphJourney.end_name,
    },
    journeyId: graphJourney.id,
    currentStatus: convertNumericToJourneyStatus(graphJourney.current_status),
    sender: graphJourney.sender,
    receiver: graphJourney.receiver,
    driver: graphJourney.driver,
    journeyStart: BigInt(graphJourney.journey_start || '0'),
    journeyEnd: BigInt(graphJourney.journey_end || '0'),
    bounty: BigInt(graphJourney.bounty || '0'),
    ETA: BigInt(graphJourney.eta || '0'),
  };
}

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
