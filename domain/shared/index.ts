export type Location = {
  lat: string;
  lng: string;
};

export type ParcelData = {
  startLocation: Location;
  endLocation: Location;
  startName: string;
  endName: string;
};

/**
 * Journey status enum - matches Ausys contract JourneyStatus
 * Tracks physical delivery progress for individual journey legs
 *
 * Uses string values for readability. Repository layer converts between:
 * - Contract values (0,1,2,3)
 * - Domain strings ('pending', 'in_transit', 'delivered', 'cancelled')
 */
export enum JourneyStatus {
  PENDING = 'pending', // Waiting for pickup signatures (contract: 0)
  IN_TRANSIT = 'in_transit', // Package picked up, in transit (contract: 1)
  DELIVERED = 'delivered', // Package delivered to receiver (contract: 2)
  CANCELLED = 'cancelled', // Journey cancelled (contract: 3)
}

export type Journey = {
  parcelData: ParcelData;
  journeyId: string;
  currentStatus: JourneyStatus; // Changed from bigint to JourneyStatus enum
  sender: string;
  receiver: string;
  driver: string;
  journeyStart: bigint;
  journeyEnd: bigint;
  bounty: bigint;
  ETA: bigint;
};

export interface Asset {
  assetClass: string;
  /** Token ID as string for JSON serialization compatibility */
  tokenId: string;
  /** @deprecated Use tokenId instead - kept for backward compatibility */
  tokenID?: bigint;
  name: string;
  attributes: AssetAttribute[];
}

/**
 * Asset attribute definition
 */
export interface AssetAttribute {
  name: string;
  values: string[];
  description: string;
}
