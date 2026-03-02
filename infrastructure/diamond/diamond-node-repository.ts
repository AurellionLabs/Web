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
import { NEXT_PUBLIC_INDEXER_URL } from '@/chain-constants';
import {
  GET_LOGISTICS_ORDER_CREATED_EVENTS,
  GET_ALL_UNIFIED_ORDER_EVENTS,
  GET_SUPPORTED_ASSET_ADDED_EVENTS,
  GET_P2P_OFFERS_BY_CREATOR,
  GET_P2P_OFFERS_ACCEPTED_BY_USER,
  GET_P2P_OFFER_DETAILS_BY_ORDER_IDS,
  GET_AUSYS_ORDER_STATUS_UPDATES,
  GET_JOURNEYS_BY_ORDER,
  GET_JOURNEY_STATUS_UPDATES_ALL,
} from '@/infrastructure/shared/graph-queries';
import type {
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
  private graphQLEndpoint: string;
  private pinata: PinataSDK | null = null;
  private metadataCache = new Map<
    string,
    { name: string; class: string; fileHash: string }
  >();
  private inFlightMetadata = new Map<
    string,
    Promise<{ name: string; class: string; fileHash: string }>
  >();

  constructor(context: DiamondContext, pinata?: PinataSDK) {
    this.context = context;
    this.graphQLEndpoint = NEXT_PUBLIC_INDEXER_URL;
    this.pinata = pinata || null;
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

  /**
   * Fetch asset metadata from IPFS by tokenId
   */
  private async fetchAssetMetadata(
    tokenId: string,
  ): Promise<{ name: string; class: string; fileHash: string }> {
    const cached = this.metadataCache.get(tokenId);
    if (cached) return cached;
    const inFlight = this.inFlightMetadata.get(tokenId);
    if (inFlight) return inFlight;

    const lookupPromise = (async (): Promise<{
      name: string;
      class: string;
      fileHash: string;
    }> => {
      if (!this.pinata) {
        console.warn(
          '[DiamondNodeRepository] Pinata not available for metadata fetch',
        );
        return { name: '', class: '', fileHash: '' };
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
          return { name: '', class: '', fileHash: '' };
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
        this.metadataCache.set(tokenId, result);
        return result;
      } catch (error) {
        console.error(
          `[DiamondNodeRepository] Failed to fetch IPFS metadata for token ${tokenId}:`,
          error,
        );
        return { name: '', class: '', fileHash: '' };
      }
    })();

    this.inFlightMetadata.set(tokenId, lookupPromise);
    try {
      return await lookupPromise;
    } finally {
      this.inFlightMetadata.delete(tokenId);
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
      const nodeHash =
        nodeAddress.startsWith('0x') && nodeAddress.length === 66
          ? nodeAddress // Already a bytes32 hash
          : ethers.zeroPadValue(nodeAddress, 32); // Convert address to bytes32

      const nodeData = await diamond.getNode(nodeHash);

      if (!nodeData || nodeData.owner === ethers.ZeroAddress) {
        return null;
      }

      // Get node assets from Diamond
      const nodeAssets = await diamond.getNodeAssets(nodeHash);
      const assets: NodeAsset[] = nodeAssets.map((asset: any) => ({
        token: asset.token,
        tokenId: asset.tokenId.toString(),
        price: BigInt(asset.price),
        capacity: Number(asset.capacity),
      }));

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
   * 1. Get the node's inventory from Diamond (which tokens are credited to this node)
   * 2. Query raw events from indexer for asset metadata
   * 3. Fetch actual ERC1155 balances from on-chain (source of truth)
   *
   * Note: The 'amount' field now reflects the ACTUAL ERC1155 balance of the
   * node owner, which correctly accounts for tokens escrowed in active orders.
   * 'capacity' is retained as the registered maximum.
   */
  async getNodeAssets(nodeAddress: string): Promise<TokenizedAsset[]> {
    try {
      // Step 1: Get node data including its asset inventory from Diamond
      const node = await this.getNode(nodeAddress);

      if (!node || !node.assets || node.assets.length === 0) {
        return [];
      }

      // Step 2: Query raw events to get asset details
      // In the pure dumb indexer, we query diamondSupportedAssetAddedEventss
      // for all assets and filter by nodeHash
      const response = await graphqlRequest<AssetEventsResponse>(
        this.graphQLEndpoint,
        GET_SUPPORTED_ASSET_ADDED_EVENTS,
        { limit: 1000 },
      );

      const allAssets = response.diamondSupportedAssetAddedEventss?.items || [];

      // Step 3: Get the node owner address for ERC1155 balance lookups
      const nodeOwner = node.owner;
      const diamond = this.context.getDiamond();

      // Step 4: Fetch IPFS metadata and actual ERC1155 balances for each asset
      const assetsWithMetadata = await this.mapWithConcurrency(
        node.assets,
        3,
        async (nodeAsset) => {
          // Find matching raw event for this asset on this node
          const rawEvent = allAssets.find(
            (e) =>
              e.node_hash?.toLowerCase() === nodeAddress.toLowerCase() &&
              e.token_id === nodeAsset.tokenId,
          );

          // Fetch IPFS metadata
          const metadata = await this.fetchAssetMetadata(nodeAsset.tokenId);

          // Fetch actual ERC1155 balance of the node owner (source of truth).
          // This naturally excludes tokens escrowed in the Diamond for active orders.
          let actualBalance: string;
          try {
            const bal = await diamond.balanceOf(nodeOwner, nodeAsset.tokenId);
            actualBalance = bal.toString();
          } catch (e) {
            console.warn(
              '[DiamondNodeRepository] balanceOf failed for token',
              nodeAsset.tokenId,
              '— falling back to capacity',
            );
            actualBalance = nodeAsset.capacity.toString();
          }

          return {
            id: nodeAsset.tokenId,
            amount: actualBalance,
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
            capacity: nodeAsset.capacity.toString(),
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

      // Filter CLOB: linked via logistics node field, OR seller/buyer matches owner wallet
      const clobOrders = allAggregated.filter((order) => {
        const oid = order.unifiedOrderId.toLowerCase();
        if (nodeLinkedOrderIds.has(oid)) return true;
        if (owner && order.seller.toLowerCase() === owner) return true;
        if (owner && order.buyer.toLowerCase() === owner) return true;
        return false;
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

      for (const order of p2pOrders) {
        const oid = order.id.toLowerCase();
        if (seenIds.has(oid)) continue;

        // For P2P orders, only include if the specific node is referenced
        // in the order's nodes array or seller field. This prevents the
        // same P2P order from appearing under every node owned by the
        // same wallet.
        const orderNodes = (order.nodes || []).map((n) => n.toLowerCase());
        const isLinkedToThisNode =
          orderNodes.includes(hash) || order.seller?.toLowerCase() === hash;
        // If the order has no node references (common for P2P), fall back
        // to showing it only on the first node to avoid duplicates.
        const hasNoNodeRef =
          orderNodes.length === 0 ||
          orderNodes.every(
            (n) => n === ethers.ZeroAddress.toLowerCase() || n === '',
          );
        if (!isLinkedToThisNode && !hasNoNodeRef) continue;

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
      console.warn(
        '[DiamondNodeRepository] getAssetAttributes: Pinata not configured, returning empty array',
      );
      return [];
    }

    try {
      // Prefer lookup by hash keyvalue when available; fall back to tokenId lookup if that fails
      let records: import('@/domain/platform').AssetIpfsRecord[] = [];
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

        // Capacity is an on-chain per-registration limit. Sum is correct
        // here since each registration adds capacity.
        const existingCapacity = BigInt(existing.capacity || '0');
        const newCapacity = BigInt(asset.capacity || '0');
        existing.capacity = (existingCapacity + newCapacity).toString();
      } else {
        aggregated.set(asset.id, { ...asset });
      }
    }

    return Array.from(aggregated.values());
  }
}
