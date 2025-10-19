/**
 * Node Management Domain Interfaces - REFACTORED
 *
 * This file contains the updated domain interfaces that align with the
 * refactored smart contracts (Asset struct instead of separate arrays)
 */

import { Asset } from '@/domain/shared';
import { Order } from '@/domain/orders/order';
/**
 * Asset as stored on a node - matches contract Asset struct
 */
export interface NodeAsset {
  token: string; // Contract address of the token
  tokenId: string; // Token ID (converted from BigInt to string for domain)
  price: bigint; // Price in wei (kept as BigInt for precision)
  capacity: number; // Available capacity (converted from BigInt to number)
}

/**
 * Core node entity - SIMPLIFIED STRUCTURE
 */
export interface Node {
  address: string;
  location: NodeLocation;
  validNode: boolean; // Changed from string to boolean (contract now uses bool)
  owner: string;
  assets: NodeAsset[]; // SIMPLIFIED: Single assets array instead of separate arrays
  status: 'Active' | 'Inactive';
}

/**
 * Location data for a node (unchanged)
 */
export interface NodeLocation {
  addressName: string;
  location: {
    lat: string;
    lng: string;
  };
}

/**
 * Resource data (unchanged)
 */
export interface AggregateAssetAmount {
  id: number;
  amount: number;
}

/**
 * Tokenized asset representation (updated for new structure)
 */
export interface TokenizedAsset {
  id: string;
  amount: string;
  name: string;
  class: string;
  fileHash: string;
  status: string;
  nodeAddress: string;
  nodeLocation: NodeLocation;
  price: string;
  capacity: string;
}

export interface TokenizedAssetAttribute {
  name: string;
  value: string;
  description: string;
}

/**
 * Node repository interface - UPDATED for new structure
 */
export interface NodeRepository {
  getNode(nodeAddress: string): Promise<Node | null>;
  getOwnedNodes(ownerAddress: string): Promise<string[]>;
  checkIfNodeExists(ownerAddress: string): Promise<boolean>;
  getNodeStatus(nodeAddress: string): Promise<'Active' | 'Inactive'>;
  getNodeAssets(nodeAddress: string): Promise<TokenizedAsset[]>;
  getAllNodeAssets(): Promise<TokenizedAsset[]>;
  getNodeOrders(nodeAddress: string): Promise<Order[]>; // Order type to be imported
  loadAvailableAssets(): Promise<AggregateAssetAmount[]>;
  getAssetBalance(
    ownerAddress: string,
    assetId: number,
    assetName: string,
    attributes: string[],
  ): Promise<number>;
  getAssetAttributes(fileHash: string): Promise<TokenizedAssetAttribute[]>;
}

/**
 * Node asset service interface - UPDATED for new Asset struct
 */
export interface INodeAssetService {
  mintAsset(
    nodeAddress: string,
    asset: Asset,
    amount: number,
    priceWei: bigint,
  ): Promise<void>;

  // Updated to work with NodeAsset instead of separate arrays
  updateAssetCapacity(
    nodeAddress: string,
    assetToken: string,
    assetTokenId: string,
    newCapacity: number,
  ): Promise<void>;

  updateAssetPrice(
    nodeAddress: string,
    assetToken: string,
    assetTokenId: string,
    newPrice: bigint,
  ): Promise<void>;

  // Updated to work with NodeAsset array
  updateSupportedAssets(
    nodeAddress: string,
    assets: NodeAsset[],
  ): Promise<void>;
}

/**
 * Helper type for contract interactions
 */
export interface ContractAssetStruct {
  token: string;
  tokenId: bigint;
  price: bigint;
  capacity: bigint;
}

/**
 * Conversion utilities
 */
export const NodeAssetConverters = {
  /**
   * Convert domain NodeAsset to contract Asset struct
   */
  toContractStruct(nodeAsset: NodeAsset): ContractAssetStruct {
    return {
      token: nodeAsset.token,
      tokenId: BigInt(nodeAsset.tokenId),
      price: nodeAsset.price,
      capacity: BigInt(nodeAsset.capacity),
    };
  },

  /**
   * Convert contract Asset struct to domain NodeAsset
   */
  fromContractStruct(contractAsset: ContractAssetStruct): NodeAsset {
    return {
      token: contractAsset.token,
      tokenId: contractAsset.tokenId.toString(),
      price: contractAsset.price,
      capacity: Number(contractAsset.capacity),
    };
  },

  /**
   * Convert domain status to contract bytes1
   */
  statusToBytes1(status: 'Active' | 'Inactive'): string {
    return status === 'Active' ? '0x01' : '0x00';
  },

  /**
   * Convert contract bytes1 to domain status
   */
  bytes1ToStatus(bytes1: string): 'Active' | 'Inactive' {
    return bytes1 === '0x01' ? 'Active' : 'Inactive';
  },
};
