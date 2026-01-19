import {
  Node,
  NodeRepository,
  TokenizedAsset,
  AggregateAssetAmount,
  NodeAsset,
  ContractAssetStruct,
  NodeAssetConverters,
} from '@/domain/node';
import { BrowserProvider, ethers } from 'ethers';
import {
  AurumNode__factory,
  AurumNodeManager__factory,
  AuraAsset__factory,
  type AurumNode,
  type AurumNodeManager,
  type AuraAsset,
} from '@/lib/contracts';
import { handleContractError } from '@/utils/error-handler';
import { PinataSDK } from 'pinata';
import { hashToAssets, tokenIdToAssets } from './shared/ipfs';
import { AssetIpfsRecord } from '@/domain/platform';
import { GraphQLClient } from 'graphql-request';
import {
  NEXT_PUBLIC_AURUM_SUBGRAPH_URL,
  NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL,
} from '@/chain-constants';
import {
  GET_NODE_ASSETS_AURUM,
  GET_ALL_NODE_ASSETS_AURUM,
  GET_USER_BALANCES_AURA,
  GET_ASSETS_BY_HASHES,
  GET_ASSETS_BY_TOKEN_IDS,
  NodeAssetsAurumResponse,
  UserBalancesAuraResponse,
  AssetsAuraResponse,
  UserBalanceAura,
  AssetAura,
  NodeAssetAurum,
  extractPonderNodeAssets,
} from './shared/graph-queries';
import { graphqlRequest } from './shared/graph';
import { extractPonderItems } from '../shared/graph-queries';
import {
  GET_NODE_BY_ADDRESS,
  GET_NODES_BY_OWNER,
  GET_ALL_NODE_ASSETS,
  GET_ORDERS_BY_NODE,
  type NodeGraphResponse,
  type OrderGraphResponse,
  convertGraphNodeToDomain,
  convertGraphOrderToDomain,
} from './shared/node-queries';

/**
 * Infrastructure implementation of the NodeRepository interface - REFACTORED
 * This implementation correctly handles the new Asset struct format from contracts
 */
export class BlockchainNodeRepository implements NodeRepository {
  private aurumContract: AurumNodeManager;
  private provider: BrowserProvider;
  private signer: ethers.Signer;
  private auraAsset: string;
  private auraAssetContractInstance: AuraAsset | null = null;
  private graphQLEndpoint = NEXT_PUBLIC_AURUM_SUBGRAPH_URL;
  pinata: PinataSDK;

  constructor(
    aurumContract: AurumNodeManager,
    provider: BrowserProvider,
    signer: ethers.Signer,
    auraAsset: string,
    _pinata: PinataSDK,
    graphQlClient?: GraphQLClient,
  ) {
    this.aurumContract = aurumContract;
    this.provider = provider;
    this.signer = signer;
    this.auraAsset = auraAsset;
    this.pinata = _pinata;
  }

  private async getAuraAssetContract(): Promise<AuraAsset> {
    if (!this.auraAssetContractInstance) {
      this.auraAssetContractInstance = AuraAsset__factory.connect(
        this.auraAsset,
        this.signer,
      );
    }
    return this.auraAssetContractInstance;
  }

  /**
   * Get an AurumNode contract instance for a specific node address
   * This allows calling node-specific functions like nodeSign, nodeHandOn, nodeHandOff
   */
  async getNodeContract(nodeAddress: string): Promise<AurumNode> {
    return AurumNode__factory.connect(nodeAddress, this.signer);
  }

  /**
   * Approve Ausys to transfer this node's ERC1155 tokens
   * This must be called before the node can participate in handOn (journey start)
   */
  async approveAusysForTokens(nodeAddress: string): Promise<void> {
    const nodeContract = await this.getNodeContract(nodeAddress);
    const tx = await nodeContract.approveAusysForTokens();
    await tx.wait();
  }

  /**
   * DEPRECATED: CLOB approval is no longer needed since CLOBFacet is internal to Diamond
   * Kept for backward compatibility - always succeeds immediately
   */
  async approveClobForTokens(
    nodeAddress: string,
    clobAddress: string,
  ): Promise<void> {
    // No-op: CLOB is now internal to Diamond via CLOBFacet
    console.log(
      '[NodeRepository] CLOB approval not needed - CLOBFacet is internal to Diamond',
    );
  }

  /**
   * DEPRECATED: CLOB is always "approved" since it's internal to Diamond
   */
  async isClobApproved(
    nodeAddress: string,
    clobAddress: string,
  ): Promise<boolean> {
    // CLOBFacet is internal to Diamond, always "approved"
    return true;
  }

  /**
   * REFACTORED: Correctly maps contract Node struct with Asset[] to domain Node
   */
  async getNode(nodeAddress: string): Promise<Node | null> {
    try {
      // Basic node info from Aurum subgraph (Ponder returns flat structure)
      const response = await graphqlRequest<{
        nodes: NodeGraphResponse | null;
      }>(this.graphQLEndpoint, GET_NODE_BY_ADDRESS, {
        nodeAddress: nodeAddress.toLowerCase(),
      });
      if (!response.nodes) return null;

      const node = response.nodes;

      // Fetch node asset capacities/prices from nodeAssets table (Ponder format)
      const aurumAssetsResp = await graphqlRequest<{
        nodeAssetss: { items: NodeAssetAurum[] };
      }>(NEXT_PUBLIC_AURUM_SUBGRAPH_URL, GET_NODE_ASSETS_AURUM, {
        nodeAddress: nodeAddress.toLowerCase(),
      });

      const aurumAssets = extractPonderNodeAssets(aurumAssetsResp);
      const nodeAssets: NodeAsset[] = aurumAssets.map((a) => ({
        token: a.token,
        tokenId: a.tokenId,
        price: BigInt(a.price || '0'),
        capacity: Number(a.capacity || '0'),
      }));

      return {
        address: node.id,
        owner: node.owner,
        location: {
          // Ponder uses flat structure - no nested location object
          addressName: node.addressName,
          location: {
            lat: node.lat,
            lng: node.lng,
          },
        },
        validNode: Boolean(node.validNode),
        status: ((s: string) => {
          const x = (s || '').toLowerCase();
          if (x === 'active' || x === '1' || x === 'true' || x === '0x01')
            return 'Active';
          return 'Inactive';
        })(node.status),
        assets: nodeAssets,
      } as Node;
    } catch (error) {
      handleContractError(error, `get node ${nodeAddress}`);
      return null;
    }
  }

  /**
   * REFACTORED: Uses GraphQL instead of on-chain iteration (when available)
   * Falls back to on-chain iteration for now until GraphQL is fully implemented
   */
  async getOwnedNodes(ownerAddress: string): Promise<string[]> {
    try {
      // Ponder returns { nodess: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        nodess: { items: NodeGraphResponse[] };
      }>(this.graphQLEndpoint, GET_NODES_BY_OWNER, {
        ownerAddress: ownerAddress,
      });
      console.log('response for getOwnedNodes', response);
      const items = extractPonderItems(response.nodess || { items: [] });
      return items.map((n) => n.id);
    } catch (error) {
      handleContractError(error, `get owned nodes for ${ownerAddress}`);
      return [];
    }
  }

  /**
   * REFACTORED: Correctly constructs contract Node struct with Asset[]
   */
  // Write operation moved to NodeService

  // Write operation moved to NodeService

  async checkIfNodeExists(ownerAddress: string): Promise<boolean> {
    try {
      const ownedNodes = await this.getOwnedNodes(ownerAddress);
      return ownedNodes.length > 0;
    } catch (error) {
      handleContractError(error, `check if node exists for ${ownerAddress}`);
      return false;
    }
  }

  async getNodeStatus(nodeAddress: string): Promise<'Active' | 'Inactive'> {
    try {
      // Ponder returns single entity directly
      const response = await graphqlRequest<{
        nodes: NodeGraphResponse | null;
      }>(this.graphQLEndpoint, GET_NODE_BY_ADDRESS, {
        nodeAddress: nodeAddress.toLowerCase(),
      });
      const raw = (response.nodes?.status || '').toLowerCase();
      if (raw === 'active' || raw === '1' || raw === '0x01' || raw === 'true')
        return 'Active';
      return 'Inactive';
    } catch (error) {
      handleContractError(error, `get node status for ${nodeAddress}`);
      return 'Inactive';
    }
  }

  /**
   * Gets node assets by combining data from both Aurum and AuraAsset subgraphs
   */
  async getNodeAssets(nodeAddress: string): Promise<TokenizedAsset[]> {
    try {
      // Step 1: Get node pricing/capacity from Ponder indexer
      const aurumResponse = await graphqlRequest<{
        nodeAssetss: { items: NodeAssetAurum[] };
      }>(NEXT_PUBLIC_AURUM_SUBGRAPH_URL, GET_NODE_ASSETS_AURUM, {
        nodeAddress: nodeAddress.toLowerCase(),
      });

      const nodeAssetsData = extractPonderNodeAssets(aurumResponse);
      if (nodeAssetsData.length === 0) {
        return [];
      }

      // Step 2: Get user balances from AuraAsset subgraph
      let auraBalanceResponse: UserBalancesAuraResponse = {
        userBalancess: { items: [] },
      };
      try {
        auraBalanceResponse = await graphqlRequest(
          NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL,
          GET_USER_BALANCES_AURA,
          { userAddress: nodeAddress.toLowerCase() },
        );
      } catch (error) {
        console.warn('[NodeRepository] Failed to get user balances:', error);
        return [];
      }

      // Step 3: Try to get asset metadata directly by tokenIds first
      // Note: Using inline tokenIds because Ponder's BigInt filter requires [BigInt!]! not [String!]!
      const tokenIds = nodeAssetsData.map((asset) => asset.tokenId);
      let assetsMetadata: AssetsAuraResponse = { assetss: { items: [] } };

      if (tokenIds.length > 0) {
        try {
          // Build inline tokenId list for the query (Ponder requires BigInt, not String)
          const tokenIdList = tokenIds.map((id) => `"${id}"`).join(', ');
          const query = `{
            assetss(where: { tokenId_in: [${tokenIdList}] }, limit: 100) {
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
          }`;

          assetsMetadata = await graphqlRequest(
            NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL,
            query,
          );
          console.log(
            '[NodeRepository] Found assets by tokenIds:',
            assetsMetadata.assetss.items.length,
          );
        } catch (error) {
          console.warn(
            '[NodeRepository] Failed to get assets by tokenIds:',
            error,
          );

          // Fallback: try to get by hashes from user balances
          const balanceMap = new Map<string, UserBalanceAura>();
          auraBalanceResponse.userBalancess?.items?.forEach((balance) => {
            balanceMap.set(balance.tokenId, balance);
          });

          const assetHashes = Array.from(balanceMap.values()).map(
            (b) => b.asset,
          );
          if (assetHashes.length > 0) {
            try {
              assetsMetadata = await graphqlRequest(
                NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL,
                GET_ASSETS_BY_HASHES,
                { hashes: assetHashes },
              );
              console.log(
                '[NodeRepository] Found assets by hashes:',
                assetsMetadata.assetss.items.length,
              );
            } catch (hashError) {
              console.warn(
                '[NodeRepository] Failed to get assets by hashes:',
                hashError,
              );
            }
          }
        }
      }

      // Step 4: Create maps for lookups
      const balanceMap = new Map<string, UserBalanceAura>();
      auraBalanceResponse.userBalancess?.items?.forEach((balance) => {
        balanceMap.set(balance.tokenId, balance);
      });

      const metadataMap = new Map<string, AssetAura>();
      assetsMetadata.assetss?.items?.forEach((asset) => {
        metadataMap.set(asset.tokenId, asset);
      });

      // Step 5: Get node location data
      const node = await this.getNode(nodeAddress);

      // Step 6: Combine all data
      return nodeAssetsData.map((nodeAsset) => {
        // Find balance for this token
        const balance = balanceMap.get(nodeAsset.tokenId);

        // Find metadata for this token
        const metadata = metadataMap.get(nodeAsset.tokenId);

        console.log(
          `[NodeRepository] Token ${nodeAsset.tokenId}: balance=${balance?.balance}, metadata=${!!metadata}`,
        );

        return {
          id: nodeAsset.tokenId,
          amount: balance?.balance || '0',
          name: metadata?.name || 'Unknown',
          class: metadata?.assetClass || 'Unknown',
          fileHash: metadata?.hash || '',
          status:
            Number(balance?.balance || '0') > 0 ? 'Available' : 'Unavailable',
          nodeAddress,
          nodeLocation: node?.location || {
            addressName: '',
            location: { lat: '0', lng: '0' },
          },
          price: nodeAsset.price,
          capacity: nodeAsset.capacity,
        };
      });
    } catch (error) {
      console.error('Error fetching node assets from Graph:', error);
      return [];
    }
  }

  async getAllNodeAssets(): Promise<TokenizedAsset[]> {
    try {
      // Page through Ponder nodeAssets using cursor-based pagination
      const PAGE_SIZE = 500;
      let allNodeAssets: NodeAssetAurum[] = [];
      let after: string | undefined = undefined;
      let hasNextPage = true;

      // Fetch pages until no more pages available
      // Cap iterations to avoid runaway loops (e.g., 10k assets)
      const MAX_ITERATIONS = 50;
      let iterations = 0;

      while (hasNextPage && iterations < MAX_ITERATIONS) {
        type PageResponse = {
          nodeAssetss: {
            items: NodeAssetAurum[];
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        };
        const pageResp: PageResponse = await graphqlRequest<PageResponse>(
          NEXT_PUBLIC_AURUM_SUBGRAPH_URL,
          GET_ALL_NODE_ASSETS_AURUM,
          {
            limit: PAGE_SIZE,
            after: after,
          },
        );
        const pageItems = extractPonderNodeAssets(pageResp);
        allNodeAssets = allNodeAssets.concat(pageItems);
        hasNextPage = pageResp.nodeAssetss?.pageInfo?.hasNextPage || false;
        after = pageResp.nodeAssetss?.pageInfo?.endCursor || undefined;
        iterations++;

        if (pageItems.length < PAGE_SIZE) break;
      }

      if (allNodeAssets.length === 0) return [];

      // Unique tokenIds for metadata query and map of tokenId -> list of node assets
      const tokenIdSet = new Set<string>();
      allNodeAssets.forEach((a) => tokenIdSet.add(a.tokenId));
      const tokenIds = Array.from(tokenIdSet);

      // Fetch metadata for all tokenIds from AuraAsset subgraph
      let assetsMetadata: AssetsAuraResponse = { assetss: { items: [] } };
      try {
        // Batch tokenIds to avoid exceeding Graph limits
        const BATCH = 500;
        const metadataAccum: AssetAura[] = [] as any;
        for (let i = 0; i < tokenIds.length; i += BATCH) {
          const batch = tokenIds.slice(i, i + BATCH);
          // Convert tokenIds to BigInt format (Ponder requires BigInt, not String)
          const tokenIdsBigInt = batch.map((id: string) => BigInt(id));
          const res: AssetsAuraResponse = await graphqlRequest(
            NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL,
            GET_ASSETS_BY_TOKEN_IDS,
            { tokenIds: tokenIdsBigInt },
          );
          metadataAccum.push(...(res.assetss?.items || []));
        }
        assetsMetadata.assetss.items = metadataAccum;
      } catch (error) {
        console.warn(
          '[NodeRepository] Failed to get assets metadata for all tokenIds:',
          error,
        );
      }

      const metadataMap = new Map<string, AssetAura>();
      assetsMetadata.assetss?.items?.forEach((asset) => {
        metadataMap.set(asset.tokenId, asset);
      });

      // Fetch per-node ERC1155 balances and node locations
      const nodeSet = new Set<string>();
      allNodeAssets.forEach((a) => nodeSet.add(a.node));

      const nodeLocationMap = new Map<string, Node['location']>();
      const nodeBalanceMap = new Map<string, Map<string, string>>(); // node -> (tokenId -> balance)
      // Fetch each node via existing getNode, but do it sequentially to avoid rate limits
      for (const nodeAddr of nodeSet) {
        const node = await this.getNode(nodeAddr);
        if (node) nodeLocationMap.set(nodeAddr, node.location);

        try {
          const balancesResp: UserBalancesAuraResponse = await graphqlRequest(
            NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL,
            GET_USER_BALANCES_AURA,
            { userAddress: nodeAddr.toLowerCase() },
          );
          const map = new Map<string, string>();
          (balancesResp.userBalancess?.items || []).forEach((b) => {
            map.set(b.tokenId, b.balance);
          });
          nodeBalanceMap.set(nodeAddr, map);
        } catch (e) {
          console.warn(
            '[NodeRepository] Failed to fetch balances for node',
            nodeAddr,
            e,
          );
        }
      }

      // Build TokenizedAsset list
      const results: TokenizedAsset[] = allNodeAssets.map((na) => {
        const meta = metadataMap.get(na.tokenId);
        const nodeLocation = nodeLocationMap.get(na.node) || {
          addressName: '',
          location: { lat: '0', lng: '0' },
        };
        const balancesForNode = nodeBalanceMap.get(na.node);
        const balanceForToken = balancesForNode?.get(na.tokenId) || '0';
        return {
          id: na.tokenId,
          amount: balanceForToken,
          name: meta?.name || 'Unknown',
          class: meta?.assetClass || 'Unknown',
          fileHash: meta?.hash || '',
          status: Number(balanceForToken) > 0 ? 'Available' : 'Unavailable',
          nodeAddress: na.node,
          nodeLocation,
          price: na.price,
          capacity: na.capacity,
        };
      });

      return results;
    } catch (error) {
      handleContractError(error, 'get all node assets');
      return [];
    }
  }

  async getNodeOrders(
    nodeAddress: string,
  ): Promise<import('@/domain/orders/order').Order[]> {
    try {
      // Ponder returns { orderss: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        orderss: { items: OrderGraphResponse[] };
      }>(this.graphQLEndpoint, GET_ORDERS_BY_NODE, {
        nodeAddress: nodeAddress.toLowerCase(),
      });
      const items = extractPonderItems(response.orderss || { items: [] });
      return items.map((o) => convertGraphOrderToDomain(o));
    } catch (error) {
      handleContractError(error, `get orders for node ${nodeAddress}`);
      return [];
    }
  }

  /**
   * REFACTORED: Will use GraphQL aggregation instead of on-chain iteration
   * Falls back to on-chain approach for now
   */
  async loadAvailableAssets(): Promise<AggregateAssetAmount[]> {
    try {
      // Ponder returns { nodeAssetss: { items: [...] } } for list queries
      const response = await graphqlRequest<{
        nodeAssetss: {
          items: { token: string; tokenId: string; capacity: string }[];
        };
      }>(this.graphQLEndpoint, GET_ALL_NODE_ASSETS);

      const items = extractPonderItems(response.nodeAssetss || { items: [] });
      const assetAmounts: { [key: string]: number } = {};
      items.forEach((a) => {
        const key = `${a.token}-${a.tokenId}`;
        assetAmounts[key] = (assetAmounts[key] || 0) + Number(a.capacity);
      });

      return Object.entries(assetAmounts).map(([, amount], index) => ({
        id: index + 1,
        amount,
      }));
    } catch (error) {
      handleContractError(error, 'load available assets');
      return [];
    }
  }

  async getAssetBalance(
    ownerAddress: string,
    assetId: number,
    assetName: string,
    attributes: string[],
  ): Promise<number> {
    try {
      const balancesResp: UserBalancesAuraResponse = await graphqlRequest(
        NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL,
        GET_USER_BALANCES_AURA,
        { userAddress: ownerAddress.toLowerCase() },
      );
      const found = (balancesResp.userBalancess?.items || []).find(
        (b) => String(b.tokenId) === String(assetId),
      );
      return Number(found?.balance || '0');
    } catch (error) {
      handleContractError(error, `get asset balance for ${ownerAddress}`);
      return 0;
    }
  }

  async getAssetAttributes(fileHash: string): Promise<any[]> {
    try {
      // Prefer lookup by hash keyvalue when available; fall back to tokenId lookup if that fails
      let records: AssetIpfsRecord[] = [];
      if (fileHash && fileHash.length > 0) {
        records = await hashToAssets(fileHash, this.pinata);
      }
      if ((!records || records.length === 0) && /^(\d+)$/.test(fileHash)) {
        records = await tokenIdToAssets(fileHash, this.pinata);
      }

      if (!records || records.length === 0) {
        return [];
      }

      // Map the first matching record's attributes into TokenizedAssetAttribute[] shape
      const first = records[0];
      const attrs = first.asset?.attributes || [];
      return attrs.map((a) => ({
        name: a.name,
        value: a.values && a.values.length > 0 ? a.values[0] : '',
        description: a.description || '',
      }));
    } catch (error) {
      handleContractError(error, `get asset attributes for ${fileHash}`);
      return [];
    }
  }
}
