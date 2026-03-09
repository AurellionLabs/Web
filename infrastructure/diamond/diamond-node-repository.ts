/**
 * Diamond Node Repository - Implements NodeRepository using the Diamond proxy
 *
 * This replaces BlockchainNodeRepository with Diamond-based operations.
 * All node queries go through the Diamond's NodesFacet.
 */

import { ethers } from 'ethers';
import { PinataSDK } from 'pinata';
import {
  Node,
  NodeRepository,
  TokenizedAsset,
  AggregateAssetAmount,
  NodeAsset,
  TokenizedAssetAttribute,
  SupportingDocument,
} from '@/domain/node';
import { Order } from '@/domain/orders';
import { DiamondContext } from './diamond-context';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  hashToAssets,
  tokenIdToAssets,
} from '@/infrastructure/repositories/shared/ipfs';
import { getIpfsGroupId } from '@/chain-constants';
import {
  fetchAssetByTokenIdFromMetadataApi,
  fetchAssetRecordsByHashFromMetadataApi,
} from '@/infrastructure/repositories/shared/platform-metadata-api';
import { getCurrentIndexerUrl } from '@/infrastructure/config/indexer-endpoint';
import { getCache, type AssetMetadata } from '@/infrastructure/cache';
import {
  GET_LOGISTICS_ORDER_CREATED_EVENTS,
  GET_ALL_UNIFIED_ORDER_EVENTS,
  GET_SUPPORTED_ASSET_ADDED_EVENTS,
  GET_P2P_OFFERS_BY_CREATOR,
  GET_P2P_OFFERS_ACCEPTED_BY_USER,
  GET_ALL_P2P_OFFER_ACCEPTED_EVENTS,
  GET_P2P_OFFER_DETAILS_BY_ORDER_IDS,
  GET_AUSYS_ORDER_STATUS_UPDATES,
  GET_JOURNEYS_BY_ORDER,
  GET_JOURNEY_STATUS_UPDATES_ALL,
} from '@/infrastructure/shared/graph-queries';
import type {
  AllP2POfferAcceptedEventsResponse,
  P2POffersByCreatorResponse,
  P2POffersAcceptedByUserResponse,
  P2POfferDetailsResponse,
  AuSysOrderStatusUpdatesResponse,
  JourneysByOrderResponse,
  JourneyStatusUpdatesAllResponse,
} from '@/infrastructure/shared/graph-queries';
import {
  aggregateUnifiedOrders,
  aggregateP2POrdersForUser,
} from '@/infrastructure/shared/event-aggregators';
import {
  AggregatedUnifiedOrder,
  LogisticsOrderCreatedEvent,
  UnifiedOrderCreatedEvent,
  SupportedAssetAddedEvent,
} from '@/infrastructure/shared/indexer-types';
import { OrderStatus } from '@/domain/orders/order';

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

interface AssetEventsResponse {
  diamondSupportedAssetAddedEventss: GraphQLResponse<SupportedAssetAddedEvent>;
}

interface UnifiedOrderEventsResponse {
  diamondUnifiedOrderCreatedEventss: GraphQLResponse<UnifiedOrderCreatedEvent>;
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
    createdAt: Number(order.createdAt) || 0,
  };
}

function mapOrderStatus(status: AggregatedUnifiedOrder['status']): OrderStatus {
  switch (status) {
    case 'settled':
      return OrderStatus.SETTLED;
    case 'cancelled':
      return OrderStatus.CANCELLED;
    case 'matched':
      return OrderStatus.PROCESSING;
    case 'created':
      return OrderStatus.CREATED;
    default:
      return OrderStatus.CREATED;
  }
}

/**
 * Diamond-based implementation of NodeRepository
 * Uses Diamond proxy for on-chain queries and GraphQL for indexed data
 */
export class DiamondNodeRepository implements NodeRepository {
  private context: DiamondContext;
  private get graphQLEndpoint() {
    return getCurrentIndexerUrl();
  }
  private pinata: PinataSDK | null = null;

  constructor(context: DiamondContext, pinata?: PinataSDK) {
    this.context = context;
    this.pinata = pinata || null;
  }

  private toBytes32NodeHash(nodeAddress: string): string {
    return nodeAddress.startsWith('0x') && nodeAddress.length === 66
      ? nodeAddress
      : ethers.zeroPadValue(nodeAddress, 32);
  }

  private isPinataRateLimitError(error: unknown): boolean {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    return (
      message.includes('429') ||
      message.toLowerCase().includes('too many requests')
    );
  }

  private async withPinataRetry<T = any>(
    fn: () => Promise<T> | T,
    maxAttempts = 3,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (!this.isPinataRateLimitError(error) || attempt === maxAttempts) {
          throw error;
        }
        const backoffMs = 300 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
    throw lastError;
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    if (items.length === 0) return [];
    const results: R[] = new Array(items.length);
    let nextIndex = 0;
    const workers = Array.from({
      length: Math.min(concurrency, items.length),
    }).map(async () => {
      while (true) {
        const current = nextIndex++;
        if (current >= items.length) break;
        results[current] = await mapper(items[current], current);
      }
    });
    await Promise.all(workers);
    return results;
  }

  private async getOwnerNodeSellableAmount(
    owner: string,
    tokenId: bigint,
    nodeHash: string,
  ): Promise<bigint> {
    const diamond = this.context.getDiamond();

    try {
      const [nodeHashes, amounts] = await diamond.getOwnerNodeSellableBalances(
        owner,
        tokenId,
      );
      const targetHash = nodeHash.toLowerCase();
      const matchIndex = (nodeHashes as string[]).findIndex(
        (hash) => hash.toLowerCase() === targetHash,
      );
      if (matchIndex >= 0) {
        return BigInt(amounts[matchIndex].toString());
      }
      return 0n;
    } catch (bulkError) {
      console.warn(
        '[DiamondNodeRepository] getOwnerNodeSellableBalances failed, falling back to per-node query:',
        bulkError,
      );
      try {
        const amount = await diamond.getNodeSellableAmount(
          owner,
          tokenId,
          nodeHash,
        );
        return BigInt(amount.toString());
      } catch (singleError) {
        console.error(
          '[DiamondNodeRepository] Failed to query node sellable amount:',
          singleError,
        );
        return 0n;
      }
    }
  }

  /**
   * Fetch asset metadata from IPFS by tokenId
   */
  /**
   * Fallback: fetch asset metadata from indexer MintedAsset events
   * when IPFS/Pinata has no data for a tokenId
   */
  private async fetchMetadataFromIndexer(
    tokenId: string,
  ): Promise<{ name: string; class: string; fileHash: string }> {
    try {
      const { graphqlRequest } = await import(
        '@/infrastructure/repositories/shared/graph'
      );
      const { getCurrentIndexerUrl } = await import(
        '@/infrastructure/config/indexer-endpoint'
      );
      const { GET_MINTED_ASSET_CLASS_BY_TOKEN_IDS } = await import(
        '@/infrastructure/shared/graph-queries'
      );

      type MintedResp = {
        diamondMintedAssetEventss?: {
          items: Array<{
            token_id: string;
            name: string;
            asset_class: string;
          }>;
        };
      };

      const resp = await graphqlRequest<MintedResp>(
        getCurrentIndexerUrl(),
        GET_MINTED_ASSET_CLASS_BY_TOKEN_IDS,
        { tokenIds: [tokenId], limit: 1 },
      );

      const item = resp.diamondMintedAssetEventss?.items?.[0];
      if (item) {
        return {
          name: item.name || '',
          class: item.asset_class || '',
          fileHash: '',
        };
      }
    } catch (err) {
      console.warn(
        '[DiamondNodeRepository] Indexer fallback also failed for tokenId:',
        tokenId,
        err,
      );
    }
    return { name: '', class: '', fileHash: '' };
  }

  private async fetchAssetMetadata(
    tokenId: string,
  ): Promise<{ name: string; class: string; fileHash: string }> {
    // Try Redis cache first
    const cache = getCache();
    const cached = await cache.getIpfsMetadata(tokenId);
    if (cached) {
      return {
        name: cached.name || '',
        class: cached.class || '',
        fileHash: cached.cid || '',
      };
    }

    if (!this.pinata) {
      const { asset, cid } = await fetchAssetByTokenIdFromMetadataApi(tokenId);
      if (asset) {
        return {
          name: asset.name,
          class: asset.assetClass,
          fileHash: cid || '',
        };
      }
      return this.fetchMetadataFromIndexer(tokenId);
    }

    try {
      const list = await this.withPinataRetry(() =>
        this.pinata!.files.public.list().keyvalues({ tokenId }).all(),
      );

      if (!list || list.length === 0) {
        console.warn(
          '[DiamondNodeRepository] No IPFS files found for tokenId:',
          tokenId,
        );
        // Fallback: try indexer MintedAsset events for metadata
        return this.fetchMetadataFromIndexer(tokenId);
      }

      const item = list[0];
      const cid = item.cid;

      const { data } = await this.withPinataRetry<any>(() =>
        this.pinata!.gateways.public.get(cid),
      );
      const json = typeof data === 'string' ? JSON.parse(data) : data;

      // Extract class from multiple possible fields
      const assetClass =
        (json.className as string) ||
        (json.class as string) ||
        (json.assetClass as string) ||
        (json.asset?.assetClass as string) ||
        '';

      const result = {
        name: (json.name as string) || (json.asset?.name as string) || '',
        class: assetClass,
        fileHash: cid,
      };

      // Cache in Redis (permanent - immutable metadata)
      await cache.setIpfsMetadata(tokenId, {
        name: result.name,
        class: result.class,
        cid: result.fileHash,
      });

      return result;
    } catch (error) {
      console.error(
        `[DiamondNodeRepository] Failed to fetch IPFS metadata for token ${tokenId}:`,
        error,
      );
      return { name: '', class: '', fileHash: '' };
    }
  }

  /**
   * Get node by hash from Diamond
   * Diamond uses bytes32 nodeHash instead of address
   */
  async getNode(nodeAddress: string): Promise<Node | null> {
    try {
      const diamond = this.context.getDiamond();

      // In Diamond, nodes are identified by bytes32 hash
      // For compatibility, we treat the address as a hash or query by owner
      const nodeHash = this.toBytes32NodeHash(nodeAddress);

      const nodeData = await diamond.getNode(nodeHash);

      if (!nodeData || nodeData.owner === ethers.ZeroAddress) {
        return null;
      }

      // Keep node-level capacity consistent with the dashboard asset read model:
      // display at least live custody even if registered capacity is lower.
      const nodeAssets = await diamond.getNodeAssets(nodeHash);
      const assets: NodeAsset[] = await Promise.all(
        nodeAssets.map(async (asset: any) => {
          const tokenId = BigInt(asset.tokenId.toString());
          const registeredCapacity = BigInt(asset.capacity.toString());
          const custodyAmount = await diamond.getNodeCustodyInfo(
            tokenId,
            nodeHash,
          );
          const effectiveCapacity =
            custodyAmount > registeredCapacity
              ? custodyAmount
              : registeredCapacity;

          return {
            token: asset.token,
            tokenId: asset.tokenId.toString(),
            price: BigInt(asset.price),
            capacity: Number(effectiveCapacity),
          };
        }),
      );

      return {
        address: nodeAddress,
        owner: nodeData.owner,
        location: {
          addressName: nodeData.addressName,
          location: {
            lat: nodeData.lat,
            lng: nodeData.lng,
          },
        },
        validNode: nodeData.validNode,
        status: nodeData.active ? 'Active' : 'Inactive',
        assets,
      };
    } catch (error) {
      console.error('[DiamondNodeRepository] Error getting node:', error);
      return null;
    }
  }

  /**
   * Get all nodes owned by an address
   */
  async getOwnedNodes(ownerAddress: string): Promise<string[]> {
    try {
      const diamond = this.context.getDiamond();
      const nodeHashes: string[] = await diamond.getOwnerNodes(ownerAddress);

      // Convert bytes32 hashes to hex strings
      return nodeHashes.map((hash) => hash.toLowerCase());
    } catch (error) {
      console.error(
        '[DiamondNodeRepository] Error getting owned nodes:',
        error,
      );
      return [];
    }
  }

  /**
   * Check if owner has any nodes
   */
  async checkIfNodeExists(ownerAddress: string): Promise<boolean> {
    const nodes = await this.getOwnedNodes(ownerAddress);
    return nodes.length > 0;
  }

  /**
   * Get node status
   */
  async getNodeStatus(nodeAddress: string): Promise<'Active' | 'Inactive'> {
    const node = await this.getNode(nodeAddress);
    return node?.status ?? 'Inactive';
  }

  /**
   * Get tokenized assets for a node
   *
   * Strategy:
   * 1. Get the node's inventory from Diamond (which tokens are configured on this node)
   * 2. Query raw events from indexer for asset metadata
   * 3. Fetch node sellable amounts from on-chain (source of truth for sell actions)
   *
   * Note: The 'amount' field reflects owner-node sellable balance.
   * Custody remains a separate metric and is only used to keep operational
   * capacity from displaying below node-held custody.
   */
  async getNodeAssets(nodeAddress: string): Promise<TokenizedAsset[]> {
    try {
      // Step 1: Get node data including its asset inventory from Diamond
      const node = await this.getNode(nodeAddress);

      if (!node || !node.assets || node.assets.length === 0) {
        return [];
      }

      const diamond = this.context.getDiamond();
      const nodeHash = this.toBytes32NodeHash(nodeAddress);

      // Fetch IPFS metadata and use node sellable balances as primary quantity.
      const assetsWithMetadata = await this.mapWithConcurrency(
        node.assets,
        3,
        async (nodeAsset: {
          token: string;
          tokenId: bigint | { toString(): string };
          price: bigint | { toString(): string };
          capacity: bigint | { toString(): string };
        }) => {
          const tokenId = nodeAsset.tokenId.toString();
          const tokenIdBigInt = BigInt(tokenId);
          // Fetch IPFS metadata
          const metadata = await this.fetchAssetMetadata(tokenId);
          const sellableAmount = await this.getOwnerNodeSellableAmount(
            node.owner,
            tokenIdBigInt,
            nodeHash,
          );
          const custodyAmount = await diamond.getNodeCustodyInfo(
            tokenIdBigInt,
            nodeHash,
          );

          const registeredCapacity = BigInt(nodeAsset.capacity.toString());
          const effectiveCapacity =
            custodyAmount > registeredCapacity
              ? custodyAmount
              : registeredCapacity;

          return {
            id: tokenId,
            amount: sellableAmount.toString(),
            name: metadata.name,
            class: metadata.class || 'Unknown',
            fileHash: metadata.fileHash,
            status: 'Active',
            nodeAddress: nodeAddress,
            nodeLocation: node.location || {
              addressName: '',
              location: { lat: '0', lng: '0' },
            },
            price: nodeAsset.price.toString(),
            capacity: effectiveCapacity.toString(),
          };
        },
      );

      const aggregatedAssets =
        this.aggregateAssetsByTokenId(assetsWithMetadata);

      return aggregatedAssets;
    } catch (error) {
      console.error(
        '[DiamondNodeRepository] Error getting node assets:',
        error,
      );
      return [];
    }
  }

  /**
   * Get all tokenized assets across all nodes
   */
  async getAllNodeAssets(): Promise<TokenizedAsset[]> {
    try {
      // Query raw events for all supported assets
      const response = await graphqlRequest<AssetEventsResponse>(
        this.graphQLEndpoint,
        GET_SUPPORTED_ASSET_ADDED_EVENTS,
        { limit: 1000 },
      );

      const allAssets = response.diamondSupportedAssetAddedEventss?.items || [];

      // Fetch IPFS metadata for each asset and convert to TokenizedAsset objects
      const assetsWithMetadata = await this.mapWithConcurrency(
        allAssets,
        3,
        async (event) => {
          const metadata = await this.fetchAssetMetadata(event.token_id);
          return {
            id: event.token_id,
            amount: event.capacity,
            name: metadata.name,
            class: metadata.class || 'Unknown',
            fileHash: metadata.fileHash,
            status: 'Active',
            nodeAddress: event.node_hash,
            nodeLocation: { addressName: '', location: { lat: '0', lng: '0' } },
            price: event.price,
            capacity: event.capacity,
          };
        },
      );

      return assetsWithMetadata;
    } catch (error) {
      console.error('[DiamondNodeRepository] Error getting all assets:', error);
      return [];
    }
  }

  /**
   * Get orders for a node from GraphQL indexer using raw events.
   * Fetches both CLOB orders (via logistics node field / seller wallet)
   * AND P2P orders (via creator/acceptor wallet address).
   */
  async getNodeOrders(
    nodeHash: string,
    ownerAddress?: string,
  ): Promise<Order[]> {
    const hash = nodeHash.toLowerCase();
    const owner = ownerAddress?.toLowerCase();

    try {
      // 1. Fetch CLOB orders + logistics data
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

      const logisticsItems =
        logisticsResponse.diamondLogisticsOrderCreatedEventss?.items || [];

      // Find order IDs linked to this node via the logistics `node` field
      const nodeLinkedOrderIds = new Set(
        logisticsItems
          .filter((l) => l.node?.toLowerCase() === hash)
          .map((l) => l.unified_order_id.toLowerCase()),
      );

      const allAggregated = aggregateUnifiedOrders({
        created: orderResponse.diamondUnifiedOrderCreatedEventss?.items || [],
        logistics: logisticsItems,
        journeyUpdates: [],
        settled: [],
      });

      // Build logistics lookup for order → logistics data
      const logisticsByOrder = new Map(
        logisticsItems.map((l) => [l.unified_order_id.toLowerCase(), l]),
      );

      // Filter CLOB orders strictly by logistics node linkage for this node.
      // Owner-level matching causes the same order set to appear under every
      // node owned by the same wallet.
      const clobOrders = allAggregated.filter((order) => {
        const oid = order.unifiedOrderId.toLowerCase();
        return nodeLinkedOrderIds.has(oid);
      });

      // 2. Fetch P2P orders where the node OWNER is creator or acceptor
      //    P2P offers use wallet addresses, NOT node hashes — skip if no owner wallet
      if (!owner) {
        return clobOrders.map((order) => {
          const logistics = logisticsByOrder.get(
            order.unifiedOrderId.toLowerCase(),
          );
          return aggregatedUnifiedOrderToDomain(order, logistics);
        });
      }
      const queryAddr = owner;
      const [
        p2pCreatedResp,
        p2pAcceptedResp,
        allP2PCreatedResp,
        allAcceptedResp,
        statusResp,
        journeysResp,
        journeyStatusResp,
      ] = await Promise.all([
        graphqlRequest<P2POffersByCreatorResponse>(
          this.graphQLEndpoint,
          GET_P2P_OFFERS_BY_CREATOR,
          { creator: queryAddr, limit: 500 },
        ),
        graphqlRequest<P2POffersAcceptedByUserResponse>(
          this.graphQLEndpoint,
          GET_P2P_OFFERS_ACCEPTED_BY_USER,
          { acceptor: queryAddr, limit: 500 },
        ),
        graphqlRequest<P2POfferDetailsResponse>(
          this.graphQLEndpoint,
          GET_P2P_OFFER_DETAILS_BY_ORDER_IDS,
          { limit: 500 },
        ),
        graphqlRequest<AllP2POfferAcceptedEventsResponse>(
          this.graphQLEndpoint,
          GET_ALL_P2P_OFFER_ACCEPTED_EVENTS,
          { limit: 500 },
        ),
        graphqlRequest<AuSysOrderStatusUpdatesResponse>(
          this.graphQLEndpoint,
          GET_AUSYS_ORDER_STATUS_UPDATES,
          { limit: 500 },
        ),
        graphqlRequest<JourneysByOrderResponse>(
          this.graphQLEndpoint,
          GET_JOURNEYS_BY_ORDER,
          { limit: 500 },
        ),
        graphqlRequest<JourneyStatusUpdatesAllResponse>(
          this.graphQLEndpoint,
          GET_JOURNEY_STATUS_UPDATES_ALL,
          { limit: 500 },
        ),
      ]);

      const p2pOrders = aggregateP2POrdersForUser(
        p2pCreatedResp.diamondP2POfferCreatedEventss?.items || [],
        p2pAcceptedResp.diamondP2POfferAcceptedEventss?.items || [],
        allP2PCreatedResp.diamondP2POfferCreatedEventss?.items || [],
        allAcceptedResp.diamondP2POfferAcceptedEventss?.items || [],
        statusResp.diamondAuSysOrderStatusUpdatedEventss?.items || [],
        queryAddr,
        journeysResp.diamondJourneyCreatedEventss?.items || [],
        journeyStatusResp.diamondAuSysJourneyStatusUpdatedEventss?.items || [],
      );

      // 3. Merge CLOB + P2P orders, deduplicating by ID
      const seenIds = new Set<string>();
      const allOrders: Order[] = [];

      for (const order of clobOrders) {
        const oid = order.unifiedOrderId.toLowerCase();
        if (!seenIds.has(oid)) {
          seenIds.add(oid);
          const logistics = logisticsByOrder.get(oid);
          allOrders.push(aggregatedUnifiedOrderToDomain(order, logistics));
        }
      }

      // Build map of order_id -> journey sender for P2P order filtering
      // This allows filtering P2P orders by the actual node that created the journey
      const orderSenderMap = new Map<string, string>();
      const journeyItems =
        journeysResp.diamondJourneyCreatedEventss?.items || [];
      for (const journey of journeyItems) {
        const oid = journey.order_id?.toLowerCase();
        if (oid && journey.sender) {
          // Keep the first sender encountered for each order
          if (!orderSenderMap.has(oid)) {
            orderSenderMap.set(oid, journey.sender.toLowerCase());
          }
        }
      }

      for (const order of p2pOrders) {
        const oid = order.id.toLowerCase();
        if (seenIds.has(oid)) continue;

        // For node dashboards, include P2P orders only when this node is
        // explicitly linked by the order metadata or the created journey.
        const orderNodes = (order.nodes || []).map((n) => n.toLowerCase());
        const journeySender = orderSenderMap.get(oid);
        const isLinkedToThisNode =
          orderNodes.includes(hash) ||
          order.seller?.toLowerCase() === hash ||
          journeySender === hash;
        if (!isLinkedToThisNode) continue;

        seenIds.add(oid);
        allOrders.push(order);
      }

      allOrders.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

      return allOrders;
    } catch (error) {
      console.error(
        '[DiamondNodeRepository] Error getting node orders:',
        error,
      );
      return [];
    }
  }

  /**
   * Load available assets for marketplace
   */
  async loadAvailableAssets(): Promise<AggregateAssetAmount[]> {
    try {
      const assets = await this.getAllNodeAssets();

      // Aggregate by asset ID
      const aggregated = new Map<number, number>();
      assets.forEach((asset) => {
        const id = parseInt(asset.id, 10);
        const amount = parseInt(asset.amount, 10) || 0;
        aggregated.set(id, (aggregated.get(id) || 0) + amount);
      });

      return Array.from(aggregated.entries()).map(([id, amount]) => ({
        id,
        amount,
      }));
    } catch (error) {
      console.error(
        '[DiamondNodeRepository] Error loading available assets:',
        error,
      );
      return [];
    }
  }

  /**
   * Get asset balance for a specific owner
   */
  async getAssetBalance(
    ownerAddress: string,
    assetId: number,
    _assetName: string,
    _attributes: string[],
  ): Promise<number> {
    try {
      const diamond = this.context.getDiamond();
      const balance = await diamond.balanceOf(ownerAddress, assetId);
      return Number(balance);
    } catch (error) {
      console.error(
        '[DiamondNodeRepository] Error getting asset balance:',
        error,
      );
      return 0;
    }
  }

  /**
   * Get asset attributes from IPFS
   * Uses Pinata to fetch asset metadata by file hash or token ID
   */
  async getAssetAttributes(
    fileHash: string,
  ): Promise<TokenizedAssetAttribute[]> {
    if (!this.pinata) {
      const records = await fetchAssetRecordsByHashFromMetadataApi(fileHash);
      const first = records[0];
      const attrs = first?.asset?.attributes || [];
      return attrs.map((a) => ({
        name: a.name,
        value: a.values && a.values.length > 0 ? a.values[0] : '',
        description: a.description || '',
      }));
    }

    try {
      // Get chain-specific IPFS group
      const chainId =
        typeof (this.context as { getChainId?: () => number }).getChainId ===
        'function'
          ? (this.context as { getChainId: () => number }).getChainId()
          : 84532;
      const groupId = getIpfsGroupId(chainId);

      // Prefer lookup by hash keyvalue when available; fall back to tokenId lookup if that fails
      let records: import('@/domain/platform').AssetIpfsRecord[] = [];
      if (fileHash && fileHash.length > 0) {
        records = await hashToAssets(fileHash, this.pinata, groupId);
      }
      if ((!records || records.length === 0) && /^(\d+)$/.test(fileHash)) {
        records = await tokenIdToAssets(fileHash, this.pinata, groupId);
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
      console.error(
        '[DiamondNodeRepository] Error getting asset attributes:',
        error,
      );
      return [];
    }
  }

  /**
   * Get supporting documents for a node
   * Fetches all documents (both active and removed) from the Diamond contract
   */
  async getSupportingDocuments(
    nodeHash: string,
  ): Promise<SupportingDocument[]> {
    try {
      const diamond = this.context.getDiamond();

      // Normalize nodeHash to bytes32 format
      const normalizedHash =
        nodeHash.startsWith('0x') && nodeHash.length === 66
          ? nodeHash
          : ethers.zeroPadValue(nodeHash, 32);

      // Call the contract to get all supporting documents
      const contractDocs = await diamond.getSupportingDocuments(normalizedHash);

      // Convert contract structs to domain objects
      const documents: SupportingDocument[] = contractDocs.map((doc: any) => ({
        url: doc.url,
        title: doc.title,
        description: doc.description,
        documentType: doc.documentType,
        isFrozen: doc.isFrozen,
        isRemoved: doc.isRemoved,
        addedAt: Number(doc.addedAt),
        removedAt: doc.isRemoved ? Number(doc.removedAt) : undefined,
        addedBy: doc.addedBy,
        removedBy: doc.isRemoved ? doc.removedBy : undefined,
      }));

      return documents;
    } catch (error) {
      console.error(
        '[DiamondNodeRepository] Error getting supporting documents:',
        error,
      );
      return [];
    }
  }

  /**
   * Aggregates assets by tokenId to combine quantities from multiple tokenizations
   * of the same asset. When a user tokenizes the same underlying asset multiple
   * times, the indexer stores each tokenization as a separate event. This method
   * consolidates them into a single entry with summed amounts.
   */
  private aggregateAssetsByTokenId(assets: TokenizedAsset[]): TokenizedAsset[] {
    const aggregated = new Map<string, TokenizedAsset>();

    for (const asset of assets) {
      const existing = aggregated.get(asset.id);

      if (existing) {
        // `amount` comes from balanceOf(owner, tokenId) which is a GLOBAL
        // per-owner balance — it returns the same value regardless of how
        // many times the tokenId is registered. Taking the max ensures we
        // don't multiply the real balance by the number of registrations.
        const existingAmount = BigInt(existing.amount || '0');
        const newAmount = BigInt(asset.amount || '0');
        existing.amount =
          newAmount > existingAmount
            ? newAmount.toString()
            : existingAmount.toString();

        // Capacity is a node-level operational limit. Registrations add
        // capacity, but it should never display below live node custody.
        const existingCapacity = BigInt(existing.capacity || '0');
        const newCapacity = BigInt(asset.capacity || '0');
        const summedCapacity = existingCapacity + newCapacity;
        existing.capacity = (
          summedCapacity > existingAmount ? summedCapacity : existingAmount
        ).toString();
      } else {
        aggregated.set(asset.id, { ...asset });
      }
    }

    return Array.from(aggregated.values());
  }
}
