/**
 * Diamond Node Repository - Implements NodeRepository using the Diamond proxy
 *
 * This replaces BlockchainNodeRepository with Diamond-based operations.
 * All node queries go through the Diamond's NodesFacet.
 */

import { ethers } from 'ethers';
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

/**
 * Diamond-based implementation of NodeRepository
 * Uses Diamond proxy for on-chain queries and GraphQL for indexed data
 */
export class DiamondNodeRepository implements NodeRepository {
  private context: DiamondContext;
  private graphQLEndpoint: string;

  constructor(context: DiamondContext) {
    this.context = context;
    this.graphQLEndpoint = NEXT_PUBLIC_INDEXER_URL;
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
   * Get tokenized assets for a node from GraphQL indexer
   */
  async getNodeAssets(nodeAddress: string): Promise<TokenizedAsset[]> {
    try {
      // Query indexed assets from GraphQL
      const query = `
        query GetNodeAssets($nodeAddress: String!) {
          assetss(where: { account: $nodeAddress }, limit: 100) {
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

      const response = await graphqlRequest<{
        assetss: { items: any[] };
      }>(this.graphQLEndpoint, query, {
        nodeAddress: nodeAddress.toLowerCase(),
      });

      const node = await this.getNode(nodeAddress);

      return response.assetss.items.map((asset: any) => {
        // Find matching node asset for price/capacity
        const nodeAsset = node?.assets?.find(
          (na) => na.tokenId === asset.tokenId.toString(),
        );

        return {
          id: asset.tokenId.toString(),
          amount: asset.amount?.toString() || '0',
          name: asset.name || '',
          class: asset.assetClass || asset.className || '',
          fileHash: asset.hash || '',
          status: 'Active',
          nodeAddress: nodeAddress,
          nodeLocation: node?.location || {
            addressName: '',
            location: { lat: '0', lng: '0' },
          },
          price: nodeAsset?.price?.toString() || '0',
          capacity: nodeAsset?.capacity?.toString() || '0',
        };
      });
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
      const query = `
        query GetAllAssets {
          assetss(limit: 1000) {
            items {
              id
              hash
              tokenId
              name
              assetClass
              className
              account
              amount
            }
          }
        }
      `;

      const response = await graphqlRequest<{
        assetss: { items: any[] };
      }>(this.graphQLEndpoint, query);

      return response.assetss.items.map((asset: any) => ({
        id: asset.tokenId.toString(),
        amount: asset.amount?.toString() || '0',
        name: asset.name || '',
        class: asset.assetClass || asset.className || '',
        fileHash: asset.hash || '',
        status: 'Active',
        nodeAddress: asset.account || '',
        nodeLocation: { addressName: '', location: { lat: '0', lng: '0' } },
        price: '0',
        capacity: '0',
      }));
    } catch (error) {
      console.error('[DiamondNodeRepository] Error getting all assets:', error);
      return [];
    }
  }

  /**
   * Get orders for a node from GraphQL indexer
   */
  async getNodeOrders(nodeAddress: string): Promise<Order[]> {
    try {
      const query = `
        query GetNodeOrders($nodeAddress: String!) {
          orderss(where: { seller: $nodeAddress }, limit: 100) {
            items {
              id
              buyer
              seller
              token
              tokenId
              tokenQuantity
              price
              txFee
              currentStatus
            }
          }
        }
      `;

      const response = await graphqlRequest<{
        orderss: { items: any[] };
      }>(this.graphQLEndpoint, query, {
        nodeAddress: nodeAddress.toLowerCase(),
      });

      return (
        response.orderss?.items?.map((order: any) => ({
          id: order.id,
          buyer: order.buyer,
          seller: order.seller,
          token: order.token,
          tokenId: order.tokenId,
          tokenQuantity: order.tokenQuantity?.toString() || '0',
          price: order.price?.toString() || '0',
          txFee: order.txFee?.toString() || '0',
          currentStatus: order.currentStatus || 0,
          journeyIds: [],
          nodes: [nodeAddress],
          locationData: null,
          contractualAgreement: '',
        })) || []
      );
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
   * Get asset attributes from GraphQL indexer
   */
  async getAssetAttributes(
    fileHash: string,
  ): Promise<TokenizedAssetAttribute[]> {
    try {
      const query = `
        query GetAssetAttributes($hash: String!) {
          assetAttributess(where: { assetId: $hash }, limit: 100) {
            items {
              name
              values
              description
            }
          }
        }
      `;

      const response = await graphqlRequest<{
        assetAttributess: { items: any[] };
      }>(this.graphQLEndpoint, query, { hash: fileHash.toLowerCase() });

      return (
        response.assetAttributess?.items?.map((attr: any) => ({
          name: attr.name || '',
          value: Array.isArray(attr.values)
            ? attr.values[0]
            : attr.values || '',
          description: attr.description || '',
        })) || []
      );
    } catch (error) {
      console.error(
        '[DiamondNodeRepository] Error getting asset attributes:',
        error,
      );
      return [];
    }
  }
}
