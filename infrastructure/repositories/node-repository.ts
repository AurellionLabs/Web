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
import {
  GET_LOGISTICS_ORDER_CREATED_EVENTS,
  GET_ALL_UNIFIED_ORDER_EVENTS,
  GET_NODE_BY_ADDRESS,
  GET_ALL_NODE_EVENTS,
} from '../shared/graph-queries';
import {
  aggregateUnifiedOrders,
  aggregateNodes,
  NodeEventSources,
} from '../shared/event-aggregators';
import {
  AggregatedUnifiedOrder,
  LogisticsOrderCreatedEvent,
  UnifiedOrderCreatedEvent,
  NodeRegisteredEvent,
  NodeDeactivatedEvent,
  UpdateLocationEvent,
  UpdateStatusEvent,
  SupportedAssetAddedEvent,
} from '../shared/indexer-types';
import { Order, OrderStatus } from '@/domain/orders/order';

interface GraphQLResponse<T> {
  items: T[];
  pageInfo?: {
    hasNextPage: boolean;
    endCursor?: string;
  };
}

interface LogisticsEventsResponse {
  diamondLogisticsOrderCreatedEventss: GraphQLResponse<LogisticsOrderCreatedEvent>;
}

interface UnifiedOrderEventsResponse {
  diamondUnifiedOrderCreatedEventss: GraphQLResponse<UnifiedOrderCreatedEvent>;
}

interface NodeEventsResponse {
  registered: GraphQLResponse<NodeRegisteredEvent>;
  deactivated: GraphQLResponse<NodeDeactivatedEvent>;
  locations: GraphQLResponse<UpdateLocationEvent>;
  statuses: GraphQLResponse<UpdateStatusEvent>;
  assets: GraphQLResponse<SupportedAssetAddedEvent>;
}

interface AllNodesEventsResponse {
  registered: GraphQLResponse<NodeRegisteredEvent>;
  deactivated: GraphQLResponse<NodeDeactivatedEvent>;
  locations: GraphQLResponse<UpdateLocationEvent>;
  statuses: GraphQLResponse<UpdateStatusEvent>;
}

function aggregatedUnifiedOrderToDomain(
  order: AggregatedUnifiedOrder,
  _logistics?: LogisticsOrderCreatedEvent,
): Order {
  return {
    id: order.unifiedOrderId,
    token: order.token,
    tokenId: order.tokenId,
    tokenQuantity: order.quantity,
    price: order.price,
    txFee: '0',
    buyer: order.buyer,
    seller: order.seller,
    journeyIds: order.journeyIds,
    nodes: [],
    locationData: undefined,
    currentStatus: mapOrderStatus(order.status),
    contractualAgreement: '',
  };
}

function mapOrderStatus(status: AggregatedUnifiedOrder['status']): OrderStatus {
  switch (status) {
    case 'settled':
      return OrderStatus.SETTLED;
    case 'cancelled':
      return OrderStatus.CANCELLED;
    case 'matched':
    case 'created':
      return OrderStatus.CREATED;
    default:
      return OrderStatus.CREATED;
  }
}

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
   * Get node data from raw events
   */
  async getNode(nodeAddress: string): Promise<Node | null> {
    try {
      const nodeAddr = nodeAddress.toLowerCase();

      const response = await graphqlRequest<NodeEventsResponse>(
        this.graphQLEndpoint,
        GET_NODE_BY_ADDRESS,
        { nodeAddress: nodeAddr },
      );

      const sources: NodeEventSources = {
        registered: response.registered?.items || [],
        deactivated: response.deactivated?.items || [],
        locationUpdates: response.locations?.items || [],
        statusUpdates: response.statuses?.items || [],
        assetsAdded: response.assets?.items || [],
      };

      const nodes = aggregateNodes(sources);
      return nodes.find((n) => n.address.toLowerCase() === nodeAddr) || null;
    } catch (error) {
      handleContractError(error, `get node ${nodeAddress}`);
      return null;
    }
  }

  /**
   * Get all nodes owned by an address using raw events
   */
  async getOwnedNodes(ownerAddress: string): Promise<string[]> {
    try {
      const response = await graphqlRequest<AllNodesEventsResponse>(
        this.graphQLEndpoint,
        GET_ALL_NODE_EVENTS,
        { limit: 1000 },
      );

      const sources: NodeEventSources = {
        registered: response.registered?.items || [],
        deactivated: response.deactivated?.items || [],
        locationUpdates: response.locations?.items || [],
        statusUpdates: response.statuses?.items || [],
        assetsAdded: [],
      };

      const nodes = aggregateNodes(sources);
      return nodes
        .filter((n) => n.owner.toLowerCase() === ownerAddress.toLowerCase())
        .map((n) => n.address);
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
      const node = await this.getNode(nodeAddress);
      return node?.status || 'Inactive';
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

      // Step 3: In the pure dumb indexer, asset metadata is fetched from IPFS directly
      // The assetss table no longer exists, so we work with available data
      const tokenIds = nodeAssetsData.map((asset) => asset.tokenId);
      console.log(
        '[NodeRepository] Asset metadata will be fetched from IPFS in pure dumb pattern',
      );

      // Step 4: Create maps for lookups
      const balanceMap = new Map<string, UserBalanceAura>();
      auraBalanceResponse.userBalancess?.items?.forEach((balance) => {
        balanceMap.set(balance.tokenId, balance);
      });

      // Step 5: Get node location data
      const node = await this.getNode(nodeAddress);

      // Step 6: Combine all data (without metadata from assetss table)
      return nodeAssetsData.map((nodeAsset) => {
        // Find balance for this token
        const balance = balanceMap.get(nodeAsset.tokenId);

        return {
          id: nodeAsset.tokenId,
          amount: balance?.balance || '0',
          name: 'Unknown', // Would need IPFS metadata
          class: 'Unknown', // Would need IPFS metadata
          fileHash: '', // Would need IPFS metadata
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

      // In the pure dumb indexer, asset metadata is fetched from IPFS directly
      // The assetss table no longer exists, so we work without metadata
      console.log(
        '[NodeRepository] Asset metadata will be fetched from IPFS in pure dumb pattern',
      );

      const metadataMap = new Map<string, AssetAura>(); // Empty in pure dumb pattern

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
      const [orderResponse, logisticsResponse] = await Promise.all([
        graphqlRequest<UnifiedOrderEventsResponse>(
          this.graphQLEndpoint,
          GET_ALL_UNIFIED_ORDER_EVENTS,
          { limit: 500 },
        ),
        graphqlRequest<LogisticsEventsResponse>(
          this.graphQLEndpoint,
          GET_LOGISTICS_ORDER_CREATED_EVENTS,
          { limit: 500 },
        ),
      ]);

      const orders = aggregateUnifiedOrders({
        created: orderResponse.diamondUnifiedOrderCreatedEventss?.items || [],
        logistics:
          logisticsResponse.diamondLogisticsOrderCreatedEventss?.items || [],
        journeyUpdates: [],
        settled: [],
      });

      const nodeOrders = orders.filter((order) =>
        order.journeyIds.some(
          (jid) => jid.toLowerCase() === nodeAddress.toLowerCase(),
        ),
      );

      return nodeOrders.map((order) => aggregatedUnifiedOrderToDomain(order));
    } catch (error) {
      handleContractError(error, `get orders for node ${nodeAddress}`);
      return [];
    }
  }

  async loadAvailableAssets(): Promise<AggregateAssetAmount[]> {
    try {
      const response = await graphqlRequest<AllNodesEventsResponse>(
        this.graphQLEndpoint,
        GET_ALL_NODE_EVENTS,
        { limit: 1000 },
      );

      const sources: NodeEventSources = {
        registered: response.registered?.items || [],
        deactivated: response.deactivated?.items || [],
        locationUpdates: response.locations?.items || [],
        statusUpdates: response.statuses?.items || [],
        assetsAdded: [],
      };

      const nodes = aggregateNodes(sources);

      const assetAmounts: { [key: string]: number } = {};
      for (const node of nodes) {
        for (const asset of node.assets) {
          const key = `${asset.token}-${asset.tokenId}`;
          assetAmounts[key] = (assetAmounts[key] || 0) + asset.capacity;
        }
      }

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
