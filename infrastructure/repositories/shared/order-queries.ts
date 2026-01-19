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
  sender: string;
  receiver: string;
  driver: string;
  currentStatus: string;
  bounty: string;
  journeyStart: string;
  journeyEnd: string;
  eta: string;
  startLocationLat: string;
  startLocationLng: string;
  endLocationLat: string;
  endLocationLng: string;
  startName: string;
  endName: string;
  orderId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderGraphResponse {
  id: string;
  buyer: string;
  seller: string;
  token: string;
  tokenId: string;
  tokenQuantity: string;
  requestedTokenQuantity: string;
  price: string;
  txFee: string;
  currentStatus: string;
  startLocationLat: string;
  startLocationLng: string;
  endLocationLat: string;
  endLocationLng: string;
  startName: string;
  endName: string;
  nodes: string[];
  createdAt: string;
  updatedAt?: string;
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
    raw.startLocationLat,
    raw.startLocationLng,
  );
  const endLocation = buildLocation(raw.endLocationLat, raw.endLocationLng);

  if (!startLocation && !endLocation && !raw.startName && !raw.endName) {
    return undefined;
  }

  return {
    startLocation: startLocation ?? { lat: '', lng: '' },
    endLocation: endLocation ?? { lat: '', lng: '' },
    startName: raw.startName ?? '',
    endName: raw.endName ?? '',
  };
}

/**
 * Convert Graph response to domain Journey
 */
export function convertGraphJourneyToDomain(
  graphJourney: JourneyGraphResponse,
): Journey {
  const startLocation = buildLocation(
    graphJourney.startLocationLat,
    graphJourney.startLocationLng,
  );
  const endLocation = buildLocation(
    graphJourney.endLocationLat,
    graphJourney.endLocationLng,
  );

  return {
    parcelData: {
      startLocation: startLocation ?? { lat: '', lng: '' },
      endLocation: endLocation ?? { lat: '', lng: '' },
      startName: graphJourney.startName,
      endName: graphJourney.endName,
    },
    journeyId: graphJourney.id,
    currentStatus: convertNumericToJourneyStatus(graphJourney.currentStatus),
    sender: graphJourney.sender,
    receiver: graphJourney.receiver,
    driver: graphJourney.driver,
    journeyStart: BigInt(graphJourney.journeyStart || '0'),
    journeyEnd: BigInt(graphJourney.journeyEnd || '0'),
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
    tokenId: graphOrder.tokenId,
    tokenQuantity: graphOrder.tokenQuantity,
    price: graphOrder.price,
    txFee: graphOrder.txFee,
    buyer: graphOrder.buyer,
    seller: graphOrder.seller,
    journeyIds: [],
    nodes: graphOrder.nodes || [],
    locationData: buildParcelData(graphOrder),
    currentStatus: convertNumericToOrderStatus(graphOrder.currentStatus),
    contractualAgreement: '',
  };
}
