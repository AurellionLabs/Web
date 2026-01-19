/**
 * Mappers - Convert between GraphQL responses and domain types
 *
 * Note: With the "pure dumb" indexer pattern, most complex mapping is now
 * done by event-aggregators.ts. These mappers handle simpler conversions
 * and are kept for backward compatibility.
 */

import {
  Asset,
  AssetAttribute,
  Location,
  ParcelData,
  JourneyStatus,
  Journey,
} from '@/domain/shared';
import { Order, OrderStatus } from '@/domain/orders/order';
import { Node, NodeLocation, NodeAsset } from '@/domain/node';

// ============================================================================
// Asset Mapping
// ============================================================================

export interface AssetGraphEntity {
  id: string;
  tokenId: string;
  name: string;
  assetClass: string;
  className?: string;
  attributes?: {
    items: {
      name: string;
      values: string[];
      description: string;
    }[];
  };
}

export function mapAsset(graphAsset: AssetGraphEntity): Asset {
  return {
    tokenId: graphAsset.tokenId,
    assetClass: graphAsset.assetClass,
    name: graphAsset.name,
    attributes: (graphAsset.attributes?.items || []).map(
      (attr): AssetAttribute => ({
        name: attr.name,
        values: attr.values,
        description: attr.description,
      }),
    ),
    tokenID: BigInt(graphAsset.tokenId),
  };
}

// ============================================================================
// Status Conversion Helpers
// ============================================================================

export function mapStatusToOrderStatus(status: string): OrderStatus {
  const normalizedStatus = status.toUpperCase();
  switch (normalizedStatus) {
    case 'OPEN':
      return OrderStatus.CREATED;
    case 'FILLED':
    case 'SETTLED':
      return OrderStatus.SETTLED;
    case 'CANCELLED':
    case 'EXPIRED':
      return OrderStatus.CANCELLED;
    case 'PARTIAL':
    case 'PARTIAL_FILL':
      return OrderStatus.PROCESSING;
    default:
      return OrderStatus.CREATED;
  }
}

export function mapNumericStatusToJourneyStatus(
  status: string | number,
): JourneyStatus {
  const numStatus = typeof status === 'string' ? parseInt(status, 10) : status;
  switch (numStatus) {
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

// ============================================================================
// Location Helpers
// ============================================================================

export function parseNodesArray(nodesJson?: string): string[] {
  if (!nodesJson) return [];
  try {
    const parsed = JSON.parse(nodesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildLocation(
  lat?: string,
  lng?: string,
): Location | undefined {
  if (!lat || !lng) return undefined;
  return { lat, lng };
}

// ============================================================================
// Node Asset Mapping (from raw event data)
// ============================================================================

export interface NodeAssetEventData {
  token: string;
  tokenId: string;
  price: string;
  capacity: string;
}

export function mapNodeAssetFromEvent(raw: NodeAssetEventData): NodeAsset {
  return {
    token: raw.token,
    tokenId: raw.tokenId,
    price: BigInt(raw.price),
    capacity: Number(raw.capacity),
  };
}

// ============================================================================
// Hex Status Conversion
// ============================================================================

export function hexStatusToNodeStatus(
  hexStatus: string,
): 'Active' | 'Inactive' {
  return hexStatus === '0x01' || hexStatus === '0x1' ? 'Active' : 'Inactive';
}

export function nodeStatusToHex(status: 'Active' | 'Inactive'): string {
  return status === 'Active' ? '0x01' : '0x00';
}

// ============================================================================
// Legacy Mappers (deprecated - use event-aggregators instead)
// ============================================================================

/**
 * @deprecated Use aggregateNodes from event-aggregators.ts instead
 */
export function mapGraphQLNodeToDomain(raw: {
  id: string;
  owner: string;
  addressName?: string;
  lat?: string;
  lng?: string;
  validNode: boolean;
  status?: string;
}): Node {
  const nodeLocation: NodeLocation = {
    addressName: raw.addressName ?? '',
    location: {
      lat: raw.lat ?? '',
      lng: raw.lng ?? '',
    },
  };

  return {
    address: raw.id,
    location: nodeLocation,
    validNode: raw.validNode,
    owner: raw.owner,
    assets: [],
    status: raw.status === 'Active' ? 'Active' : 'Inactive',
  };
}
