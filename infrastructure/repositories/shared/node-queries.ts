/**
 * Node-specific GraphQL queries for legacy compatibility
 *
 * These queries use aggregate tables that are still being migrated.
 * Eventually they will be replaced by raw event queries + aggregators.
 */

import { gql } from 'graphql-request';

// ============================================================================
// NODE QUERIES (Legacy - use aggregate tables)
// ============================================================================

export const GET_NODE_BY_ADDRESS = gql`
  query GetNodeByAddress($nodeAddress: String!) {
    nodes(id: $nodeAddress) {
      id
      owner
      addressName
      lat
      lng
      validNode
      status
      createdAt
      updatedAt
    }
  }
`;

export const GET_NODES_BY_OWNER = gql`
  query GetNodesByOwner($ownerAddress: String!) {
    nodess(where: { owner: $ownerAddress }) {
      items {
        id
        owner
        addressName
        lat
        lng
        validNode
        status
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_ALL_NODE_ASSETS = gql`
  query GetAllNodeAssets($limit: Int = 1000) {
    nodeAssetss(limit: $limit) {
      items {
        id
        node
        token
        tokenId
        price
        capacity
      }
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
