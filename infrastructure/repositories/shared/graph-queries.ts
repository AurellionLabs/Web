import { gql } from 'graphql-request';

/**
 * Query to get all tokenIds owned by a specific node address
 * Uses TransferSingle events to track current ownership
 */
export const GET_NODE_TOKENIDS = gql`
  query GetNodeTokenIds($nodeAddress: Bytes!) {
    # Get all transfers TO the node address
    transfersIn: transferSingles(
      where: { to: $nodeAddress }
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      internal_id
      value
      from
      to
      blockTimestamp
      transactionHash
    }

    # Get all transfers FROM the node address
    transfersOut: transferSingles(
      where: { from: $nodeAddress }
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      internal_id
      value
      from
      to
      blockTimestamp
      transactionHash
    }
  }
`;

/**
 * Alternative query using MintedAsset events if you want to get
 * assets that were originally minted to this node
 */
export const GET_NODE_MINTED_ASSETS = gql`
  query GetNodeMintedAssets($nodeAddress: Bytes!) {
    mintedAssets(
      where: { account: $nodeAddress }
      orderBy: blockTimestamp
      orderDirection: desc
    ) {
      tokenId
      hash
      asset_name
      asset_class
      blockTimestamp
      transactionHash
    }
  }
`;

/**
 * Query Ponder indexer for node assets (pricing and capacity)
 * Updated for Ponder's response format
 */
export const GET_NODE_ASSETS_AURUM = gql`
  query GetNodeAssetsAurum($nodeAddress: String!) {
    nodeAssetss(where: { node: $nodeAddress }) {
      items {
        id
        node
        token
        tokenId
        price
        capacity
        createdAt
        updatedAt
      }
    }
  }
`;

/**
 * Query Ponder indexer for ALL node assets (pricing and capacity)
 * Updated for Ponder's response format
 * Note: Ponder uses cursor-based pagination with before/after, not skip
 */
export const GET_ALL_NODE_ASSETS_AURUM = gql`
  query GetAllNodeAssetsAurum($limit: Int!, $after: String) {
    nodeAssetss(
      limit: $limit
      after: $after
      orderBy: "createdAt"
      orderDirection: "desc"
    ) {
      items {
        id
        node
        token
        tokenId
        price
        capacity
        createdAt
        updatedAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Query AuraAsset subgraph for user balances and asset metadata
 * Updated for Ponder API - uses plural table names and limit instead of first/skip
 */
export const GET_USER_BALANCES_AURA = gql`
  query GetUserBalancesAura($userAddress: String!) {
    userBalancess(where: { user: $userAddress }, limit: 100) {
      items {
        id
        user
        tokenId
        balance
        asset
        firstReceived
        lastUpdated
      }
    }
  }
`;

/**
 * Query AuraAsset subgraph for asset metadata by hashes
 * Updated for Ponder API - uses plural table names with items wrapper
 */
export const GET_ASSETS_BY_HASHES = gql`
  query GetAssetsByHashes($hashes: [String!]!) {
    assetss(where: { hash_in: $hashes }, limit: 100) {
      items {
        id
        hash
        tokenId
        name
        assetClass
        className
        account
        amount
        attributes {
          items {
            name
            values
            description
          }
        }
      }
    }
  }
`;

/**
 * Query AuraAsset subgraph for asset metadata by tokenIds
 * Updated for Ponder API - uses plural table names with items wrapper
 * Note: Ponder requires BigInt type for tokenId_in filter, not String
 */
export const GET_ASSETS_BY_TOKEN_IDS = gql`
  query GetAssetsByTokenIds($tokenIds: [BigInt!]!) {
    assetss(where: { tokenId_in: $tokenIds }, limit: 100) {
      items {
        id
        hash
        tokenId
        name
        assetClass
        className
        account
        amount
        attributes {
          items {
            name
            values
            description
          }
        }
      }
    }
  }
`;

export interface NodeTokenBalance {
  tokenId: string;
  balance: string;
  name?: string;
  assetClass?: string;
  hash?: string;
}

export interface GraphTransferEvent {
  internal_id: string;
  value: string;
  from: string;
  to: string;
  blockTimestamp: string;
}

export interface GraphMintedAsset {
  tokenId: string;
  hash: string;
  asset_name: string;
  asset_class: string;
  asset_attributes: string[];
  blockTimestamp: string;
}

// Response interfaces for new queries
export interface NodeAssetAurum {
  id: string;
  node: string;
  token: string;
  tokenId: string;
  price: string;
  capacity: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserBalanceAura {
  id: string;
  user: string;
  tokenId: string;
  balance: string;
  asset: string; // hash reference
  firstReceived: string;
  lastUpdated: string;
}

export interface AssetAura {
  id: string;
  hash: string;
  tokenId: string;
  name: string;
  assetClass: string;
  className: string;
  account: string;
  amount: string;
  attributes: {
    items: Array<{
      name: string;
      values: string;
      description: string;
    }>;
  };
}

// Ponder returns { nodeAssetss: { items: [...] } } for list queries
export interface NodeAssetsAurumResponse {
  nodeAssets: NodeAssetAurum[]; // Legacy format for compatibility
}

// Helper to extract items from Ponder's paginated response
export function extractPonderNodeAssets(response: {
  nodeAssetss?: { items: NodeAssetAurum[] };
}): NodeAssetAurum[] {
  return response?.nodeAssetss?.items || [];
}

export interface UserBalancesAuraResponse {
  userBalancess: { items: UserBalanceAura[] };
}

export interface AssetsAuraResponse {
  assetss: { items: AssetAura[] };
}

// Paginated list of all assets from AuraAsset subgraph
// Updated for Ponder API - uses cursor-based pagination with limit/after
export const GET_ALL_ASSETS = gql`
  query GetAllAssets($limit: Int!, $after: String) {
    assetss(
      limit: $limit
      after: $after
      orderBy: "tokenId"
      orderDirection: "asc"
    ) {
      items {
        id
        hash
        tokenId
        name
        assetClass
        className
        account
        amount
        attributes {
          items {
            name
            values
            description
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
