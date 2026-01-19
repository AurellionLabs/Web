export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string;
}

export interface AssetGraphQLItem {
  id: string;
  name: string;
  assetClass: string;
  className?: string;
  hash: string;
  account?: string;
  amount?: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface AssetsGraphQLResponse {
  assetss: {
    items: AssetGraphQLItem[];
    pageInfo?: PageInfo;
  };
}

export interface OrderGraphQLItem {
  id: string;
  clobOrderId?: string;
  ausysOrderId?: string;
  buyer: string;
  seller: string;
  token: string;
  tokenId: string;
  quantity: string;
  price: string;
  bounty?: string;
  status: string;
  logisticsStatus?: number;
  startLocationLat?: string;
  startLocationLng?: string;
  endLocationLat?: string;
  endLocationLng?: string;
  startName?: string;
  endName?: string;
  nodes?: string;
  createdAt?: string;
  updatedAt?: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface OrdersGraphQLResponse {
  orderss: {
    items: OrderGraphQLItem[];
    pageInfo?: PageInfo;
  };
}

export interface JourneyGraphQLItem {
  id: string;
  unifiedOrderId: string;
  sender?: string;
  receiver?: string;
  driver?: string;
  status: string;
  bounty?: string;
  eta?: string;
  startLat?: string;
  startLng?: string;
  endLat?: string;
  endLng?: string;
  startName?: string;
  endName?: string;
  orderId?: string;
  createdAt?: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface JourneysGraphQLResponse {
  journeyss: {
    items: JourneyGraphQLItem[];
    pageInfo?: PageInfo;
  };
}

export interface NodeGraphQLItem {
  id: string;
  owner: string;
  addressName?: string;
  lat?: string;
  lng?: string;
  validNode: boolean;
  status?: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface NodesGraphQLResponse {
  nodess: {
    items: NodeGraphQLItem[];
    pageInfo?: PageInfo;
  };
}

export interface NodeAssetGraphQLItem {
  id: string;
  node: string;
  token: string;
  tokenId: string;
  price: string;
  capacity: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

export interface NodeAssetsGraphQLResponse {
  nodeAssetss: {
    items: NodeAssetGraphQLItem[];
    pageInfo?: PageInfo;
  };
}
