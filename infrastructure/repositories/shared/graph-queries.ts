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
 * Query Aurum subgraph for node assets (pricing and capacity)
 */
export const GET_NODE_ASSETS_AURUM = gql`
  query GetNodeAssetsAurum($nodeAddress: String!) {
    nodeAssets(where: { node: $nodeAddress }) {
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
`;

/**
 * Query Aurum subgraph for ALL node assets (pricing and capacity)
 */
export const GET_ALL_NODE_ASSETS_AURUM = gql`
  query GetAllNodeAssetsAurum($first: Int!, $skip: Int!) {
    nodeAssets(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
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
`;

/**
 * Query AuraAsset subgraph for user balances and asset metadata
 */
export const GET_USER_BALANCES_AURA = gql`
  query GetUserBalancesAura($userAddress: Bytes!) {
    userBalances(where: { user: $userAddress }) {
      id
      user
      tokenId
      balance
      asset
      firstReceived
      lastUpdated
    }
  }
`;

/**
 * Query AuraAsset subgraph for asset metadata by hashes
 */
export const GET_ASSETS_BY_HASHES = gql`
  query GetAssetsByHashes($hashes: [String!]!) {
    assets(where: { hash_in: $hashes }) {
      id
      hash
      tokenId
      name
      assetClass
      className
      account
      amount
      attributes {
        name
        values
        description
      }
    }
  }
`;

/**
 * Query AuraAsset subgraph for asset metadata by tokenIds
 */
export const GET_ASSETS_BY_TOKEN_IDS = gql`
  query GetAssetsByTokenIds($tokenIds: [BigInt!]!) {
    assets(where: { tokenId_in: $tokenIds }) {
      id
      hash
      tokenId
      name
      assetClass
      className
      account
      amount
      attributes {
        name
        values
        description
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
  attributes: Array<{
    name: string;
    values: string[];
    description: string;
  }>;
}

export interface NodeAssetsAurumResponse {
  nodeAssets: NodeAssetAurum[];
}

export interface UserBalancesAuraResponse {
  userBalances: UserBalanceAura[];
}

export interface AssetsAuraResponse {
  assets: AssetAura[];
}
