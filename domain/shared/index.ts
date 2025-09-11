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

export type Journey = {
  parcelData: ParcelData;
  journeyId: string;
  currentStatus: bigint;
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
  tokenID: bigint;
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
