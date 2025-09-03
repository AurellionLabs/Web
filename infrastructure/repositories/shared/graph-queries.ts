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
 * Combined query to get both minted assets and current balances
 */
export const GET_NODE_ASSETS_COMPLETE = gql`
  query GetNodeAssetsComplete($nodeAddress: Bytes!) {
    # Originally minted assets
    mintedAssets(where: { account: $nodeAddress }) {
      tokenId
      hash
      asset_name
      asset_class
      asset_attributes
      blockTimestamp
    }

    # All incoming transfers
    transfersIn: transferSingles(where: { to: $nodeAddress }) {
      internal_id
      value
      from
      blockTimestamp
    }

    # All outgoing transfers
    transfersOut: transferSingles(where: { from: $nodeAddress }) {
      internal_id
      value
      to
      blockTimestamp
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

export interface NodeAssetsGraphResponse {
  transfersIn: GraphTransferEvent[];
  transfersOut: GraphTransferEvent[];
  mintedAssets: GraphMintedAsset[];
}

/**
 * Helper function to calculate current balances from transfer events
 */
export function calculateCurrentBalances(
  transfersIn: any[],
  transfersOut: any[],
  mintedAssets: any[],
): NodeTokenBalance[] {
  const balanceMap = new Map<string, bigint>();
  const metadataMap = new Map<
    string,
    { name: string; assetClass: string; hash: string }
  >();

  // Add minted assets metadata
  for (const minted of mintedAssets) {
    const tokenId = minted.tokenId.toString();
    metadataMap.set(tokenId, {
      name: minted.asset_name,
      assetClass: minted.asset_class,
      hash: minted.hash,
    });
  }

  // Process incoming transfers (add to balance)
  for (const transfer of transfersIn) {
    const tokenId = transfer.internal_id.toString();
    const current = balanceMap.get(tokenId) || 0n;
    balanceMap.set(tokenId, current + BigInt(transfer.value));
  }

  // Process outgoing transfers (subtract from balance)
  for (const transfer of transfersOut) {
    const tokenId = transfer.internal_id.toString();
    const current = balanceMap.get(tokenId) || 0n;
    balanceMap.set(tokenId, current - BigInt(transfer.value));
  }

  // Convert to result array, filtering out zero balances
  return Array.from(balanceMap.entries())
    .filter(([, balance]) => balance > 0n)
    .map(([tokenId, balance]) => {
      const metadata = metadataMap.get(tokenId);
      return {
        tokenId,
        balance: balance.toString(),
        name: metadata?.name,
        assetClass: metadata?.assetClass,
        hash: metadata?.hash,
      };
    });
}
