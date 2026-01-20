/**
 * Node-specific GraphQL queries using raw event tables
 *
 * These queries use the pure dumb indexer pattern - query raw events
 * and aggregate in the repository/service layer.
 */

import { gql } from 'graphql-request';

// ============================================================================
// NODE QUERIES (Raw Event Tables)
// ============================================================================

/**
 * Get node registration events for a specific node address
 */
export const GET_NODE_BY_ADDRESS = gql`
  query GetNodeByAddress($nodeAddress: String!) {
    registered: diamondNodeRegisteredEventss(
      where: { node_hash: $nodeAddress }
      limit: 1
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        node_hash
        owner
        node_type
        block_number
        block_timestamp
        transaction_hash
      }
    }
    locations: diamondUpdateLocationEventss(
      where: { node: $nodeAddress }
      limit: 1
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        address_name
        lat
        lng
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
    statuses: diamondUpdateStatusEventss(
      where: { node: $nodeAddress }
      limit: 1
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        status
        node
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get node registration events by owner address
 */
export const GET_NODES_BY_OWNER = gql`
  query GetNodesByOwner($ownerAddress: String!) {
    registered: diamondNodeRegisteredEventss(
      where: { owner: $ownerAddress }
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        node_hash
        owner
        node_type
        block_number
        block_timestamp
        transaction_hash
      }
    }
  }
`;

/**
 * Get all supported asset added events
 */
export const GET_ALL_NODE_ASSETS = gql`
  query GetAllNodeAssets($limit: Int = 1000) {
    assets: diamondSupportedAssetAddedEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        id
        node_hash
        token
        token_id
        price
        capacity
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
// ============================================================================

export interface NodeRegisteredRawEvent {
  id: string;
  node_hash: string;
  owner: string;
  node_type: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface UpdateLocationRawEvent {
  id: string;
  address_name: string;
  lat: string;
  lng: string;
  node: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface UpdateStatusRawEvent {
  id: string;
  status: string;
  node: string;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
}

export interface SupportedAssetRawEvent {
  id: string;
  node_hash: string;
  token: string;
  token_id: string;
  price: string;
  capacity: string;
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
// LEGACY RESPONSE TYPES (For backward compatibility)
// ============================================================================

export interface NodeGraphResponse {
  id: string;
  owner: string;
  addressName: string;
  lat: string;
  lng: string;
  validNode: boolean;
  status: string;
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

import { Node, NodeLocation } from '@/domain/node';
import { Order, OrderStatus } from '@/domain/orders/order';
import { ParcelData, Location } from '@/domain/shared';

/**
 * Convert Graph response to domain Node
 */
export function convertGraphNodeToDomain(node: NodeGraphResponse): Node {
  return {
    address: node.id,
    location: {
      addressName: node.addressName,
      location: { lat: node.lat, lng: node.lng },
    },
    validNode: Boolean(node.validNode),
    owner: node.owner,
    assets: [],
    status: ((s: string) => {
      const x = (s || '').toLowerCase();
      if (x === 'active' || x === '1' || x === 'true' || x === '0x01')
        return 'Active';
      return 'Inactive';
    })(node.status),
  };
}

/**
 * Convert numeric status to OrderStatus
 */
function convertNumericToOrderStatus(status: string | number): OrderStatus {
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
