export interface PublicNodeAssetDto {
  token: string;
  tokenId: string;
  price: string;
  capacity: string;
  sellableQuantity: string;
  custodyQuantity: string;
}

export interface PublicNodeDto {
  nodeId: string;
  owner: string;
  status: 'Active' | 'Inactive';
  validNode: boolean;
  location: {
    addressName: string;
    lat: string;
    lng: string;
  };
  assets: PublicNodeAssetDto[];
}

export interface PublicJourneyDto {
  journeyId: string;
  status: string;
  sender: string;
  receiver: string;
  driver: string;
  journeyStart: string;
  journeyEnd: string;
  bounty: string;
  eta: string;
  parcelData: {
    startLocation: { lat: string; lng: string };
    endLocation: { lat: string; lng: string };
    startName: string;
    endName: string;
  };
}

export interface PublicOrderDto {
  orderId: string;
  token: string;
  tokenId: string;
  tokenQuantity: string;
  price: string;
  txFee: string;
  buyer: string;
  seller: string;
  status: string;
  contractualAgreement: string;
  isP2P: boolean;
  createdAt?: number;
  journeyIds: string[];
  nodes: string[];
  locationData?: {
    startLocation: { lat: string; lng: string };
    endLocation: { lat: string; lng: string };
    startName: string;
    endName: string;
  };
  journeys: PublicJourneyDto[];
}
