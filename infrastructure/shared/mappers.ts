import {
  Asset,
  AssetAttribute,
  Location,
  ParcelData,
  JourneyStatus,
  Journey,
} from '@/domain/shared';
import { Order, OrderStatus } from '@/domain/orders/order';
import { Node, NodeLocation } from '@/domain/node';
import {
  AssetGraphQLItem,
  OrderGraphQLItem,
  JourneyGraphQLItem,
  NodeGraphQLItem,
  NodeAssetGraphQLItem,
} from './indexer-types';

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

export function mapGraphQLAssetToDomain(raw: AssetGraphQLItem): Asset {
  return {
    tokenId: raw.id,
    assetClass: raw.assetClass,
    name: raw.name,
    attributes: [],
  };
}

function mapStatusToOrderStatus(status: string): OrderStatus {
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
    case 'PARTIAL_FILL':
      return OrderStatus.PROCESSING;
    default:
      return OrderStatus.CREATED;
  }
}

function parseNodesArray(nodesJson?: string): string[] {
  if (!nodesJson) return [];
  try {
    const parsed = JSON.parse(nodesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildLocation(lat?: string, lng?: string): Location | undefined {
  if (!lat || !lng) return undefined;
  return { lat, lng };
}

function buildParcelData(raw: OrderGraphQLItem): ParcelData | undefined {
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

export function mapGraphQLOrderToDomain(raw: OrderGraphQLItem): Order {
  return {
    id: raw.id,
    token: raw.token,
    tokenId: raw.tokenId,
    tokenQuantity: raw.quantity,
    price: raw.price,
    txFee: '0',
    buyer: raw.buyer,
    seller: raw.seller,
    journeyIds: [],
    nodes: parseNodesArray(raw.nodes),
    locationData: buildParcelData(raw),
    currentStatus: mapStatusToOrderStatus(raw.status),
    contractualAgreement: '',
  };
}

function mapNumericStatusToJourneyStatus(
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

export function mapGraphQLJourneyToDomain(raw: JourneyGraphQLItem): Journey {
  const startLocation = buildLocation(raw.startLat, raw.startLng);
  const endLocation = buildLocation(raw.endLat, raw.endLng);

  return {
    journeyId: raw.id,
    parcelData: {
      startLocation: startLocation ?? { lat: '', lng: '' },
      endLocation: endLocation ?? { lat: '', lng: '' },
      startName: raw.startName ?? '',
      endName: raw.endName ?? '',
    },
    sender: raw.sender ?? '0x0000000000000000000000000000000000000000',
    receiver: raw.receiver ?? '0x0000000000000000000000000000000000000000',
    driver: raw.driver ?? '0x0000000000000000000000000000000000000000',
    journeyStart: raw.createdAt ? BigInt(raw.createdAt) : 0n,
    journeyEnd: 0n,
    bounty: raw.bounty ? BigInt(raw.bounty) : 0n,
    ETA: raw.eta ? BigInt(raw.eta) : 0n,
    currentStatus: mapNumericStatusToJourneyStatus(raw.status),
  };
}

export function mapGraphQLNodeToDomain(raw: NodeGraphQLItem): Node {
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

export function mapNodeAssetToDomain(raw: NodeAssetGraphQLItem): {
  token: string;
  tokenId: string;
  price: bigint;
  capacity: number;
} {
  return {
    token: raw.token,
    tokenId: raw.tokenId,
    price: BigInt(raw.price),
    capacity: Number(raw.capacity),
  };
}
