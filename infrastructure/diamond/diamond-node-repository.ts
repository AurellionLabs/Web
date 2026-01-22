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
} from '@/domain/node';
import { Order } from '@/domain/orders';
import { DiamondContext } from './diamond-context';
import { graphqlRequest } from '@/infrastructure/repositories/shared/graph';
import {
  NEXT_PUBLIC_INDEXER_URL,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
} from '@/chain-constants';
import {
  GET_LOGISTICS_ORDER_CREATED_EVENTS,
  GET_ALL_UNIFIED_ORDER_EVENTS,
  GET_SUPPORTED_ASSET_ADDED_EVENTS,
} from '@/infrastructure/shared/graph-queries';
import { aggregateUnifiedOrders } from '@/infrastructure/shared/event-aggregators';
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
 * Diamond-based implementation of NodeRepository
 * Uses Diamond proxy for on-chain queries and GraphQL for indexed data
 */
export class DiamondNodeRepository implements NodeRepository {
  private context: DiamondContext;
  private graphQLEndpoint: string;
  private pinata: PinataSDK | null = null;

  constructor(context: DiamondContext, pinata?: PinataSDK) {
    this.context = context;
    this.graphQLEndpoint = NEXT_PUBLIC_INDEXER_URL;
    this.pinata = pinata || null;
  }

  /**
   * Fetch asset metadata from IPFS by tokenId
   */
  private async fetchAssetMetadata(
    tokenId: string,
  ): Promise<{ name: string; class: string; fileHash: string }> {
    if (!this.pinata) {
      console.warn(
        '[DiamondNodeRepository] Pinata not available for metadata fetch',
      );
      return { name: '', class: '', fileHash: '' };
    }

    try {
      console.log(
        '[DiamondNodeRepository] Fetching IPFS metadata for tokenId:',
        tokenId,
      );
      const list = await this.pinata.files.public
        .list()
        .keyvalues({ tokenId })
        .all();

      console.log(
        '[DiamondNodeRepository] Pinata list result:',
        list?.length,
        'files found',
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

      console.log(
        '[DiamondNodeRepository] Fetching IPFS content from CID:',
        cid,
      );
      const { data } = await this.pinata.gateways.public.get(cid);
      const json = typeof data === 'string' ? JSON.parse(data) : data;

      console.log('[DiamondNodeRepository] IPFS metadata:', {
        className: json.className,
        class: json.class,
        assetClass: json.assetClass,
        'asset.assetClass': json.asset?.assetClass,
        name: json.name || json.asset?.name,
      });

      // Extract class from multiple possible fields
      const assetClass =
        (json.className as string) ||
        (json.class as string) ||
        (json.assetClass as string) ||
        (json.asset?.assetClass as string) ||
        '';

      return {
        name: (json.name as string) || (json.asset?.name as string) || '',
        class: assetClass,
        fileHash: cid,
      };
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
   *
   * Note: Assets are minted to the Diamond contract address, and Diamond internally
   * tracks which node owns which tokens via creditNodeTokens(). So we query the
   * indexer by tokenId, not by account.
   */
  async getNodeAssets(nodeAddress: string): Promise<TokenizedAsset[]> {
    try {
      // Step 1: Get node data including its asset inventory from Diamond
      const node = await this.getNode(nodeAddress);

      if (!node || !node.assets || node.assets.length === 0) {
        console.log(
          '[DiamondNodeRepository] No assets found in node inventory:',
          nodeAddress,
        );
        return [];
      }

      console.log(
        '[DiamondNodeRepository] Node has',
        node.assets.length,
        'assets in inventory',
      );

      // Step 2: Query raw events to get asset details
      // In the pure dumb indexer, we query diamondSupportedAssetAddedEventss
      // for all assets and filter by nodeHash
      const response = await graphqlRequest<AssetEventsResponse>(
        this.graphQLEndpoint,
        GET_SUPPORTED_ASSET_ADDED_EVENTS,
        { limit: 1000 },
      );

      const allAssets = response.diamondSupportedAssetAddedEventss?.items || [];

      // Step 3: Fetch IPFS metadata for each asset and combine with raw event data
      const assetsWithMetadata = await Promise.all(
        node.assets.map(async (nodeAsset) => {
          // Find matching raw event for this asset on this node
          const rawEvent = allAssets.find(
            (e) =>
              e.node_hash?.toLowerCase() === nodeAddress.toLowerCase() &&
              e.token_id === nodeAsset.tokenId,
          );

          // Fetch IPFS metadata
          const metadata = await this.fetchAssetMetadata(nodeAsset.tokenId);

          return {
            id: nodeAsset.tokenId,
            amount: nodeAsset.capacity.toString(),
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
        }),
      );

      return assetsWithMetadata;
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
      const assetsWithMetadata = await Promise.all(
        allAssets.map(async (event) => {
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
        }),
      );

      return assetsWithMetadata;
    } catch (error) {
      console.error('[DiamondNodeRepository] Error getting all assets:', error);
      return [];
    }
  }

  /**
   * Get orders for a node from GraphQL indexer using raw events
   */
  async getNodeOrders(nodeAddress: string): Promise<Order[]> {
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
      const auraAsset = this.context.getAuraAsset();
      const balance = await auraAsset.balanceOf(ownerAddress, assetId);
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
   */
  async getAssetAttributes(
    _fileHash: string,
  ): Promise<TokenizedAssetAttribute[]> {
    // In the pure dumb indexer, asset attributes are stored on IPFS
    // This method would need IPFS integration to fetch metadata
    // For now, return empty array to avoid GraphQL errors
    return [];
  }
}
