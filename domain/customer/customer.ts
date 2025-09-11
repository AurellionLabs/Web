/**
 * Node Management Domain Interfaces
 *
 * This file contains the domain interfaces for the node management system.
 * These interfaces define the core domain models and their relationships.
 */

import { Order } from '../orders';
import { Asset } from '../shared';

/**
 * Core node entity
 */
export interface Customer {
  address: string;
  location: NodeLocation;
  validNode: string; // bytes1
  owner: string;
  supportedAssets: number[];
  status: 'Active' | 'Inactive';
  capacity: number[];
  assetPrices: number[];
}

/**
 * Location data for a node
 */
export interface NodeLocation {
  addressName: string;
  location: {
    lat: string;
    lng: string;
  };
}

/**
 * Asset types supported by nodes
 */
export enum AssetType {
  GOAT = 1,
  SHEEP = 2,
  COW = 3,
  CHICKEN = 4,
  DUCK = 5,
}

/**
 * Order status types
 */

/**
 * Resource data
 */
export interface AggregateAssetAmount {
  id: number;
  amount: number;
}

/**
 * Tokenized asset representation
 */
export interface TokenizedAsset {
  id: number;
  amount: string;
  name: string;
  status: string;
  nodeAddress: string;
  nodeLocation: NodeLocation;
  price: string;
  capacity: string;
}

/**
 * Order information
 */

/**
 * Node repository interface
 */
export interface NodeRepository {
  getNode(nodeAddress: string): Promise<Node | null>;
  getOwnedNodes(ownerAddress: string): Promise<string[]>;
  registerNode(nodeData: Node): Promise<string>;
  updateNodeStatus(
    nodeAddress: string,
    status: 'Active' | 'Inactive',
  ): Promise<void>;
  checkIfNodeExists(ownerAddress: string): Promise<boolean>;
  getNodeStatus(nodeAddress: string): Promise<'Active' | 'Inactive'>;
  getNodeAssets(nodeAddress: string): Promise<TokenizedAsset[]>;
  getAllNodeAssets(): Promise<TokenizedAsset[]>;
  getNodeOrders(nodeAddress: string): Promise<Order[]>;
  loadAvailableAssets(): Promise<AggregateAssetAmount[]>;
  getAssetBalance(ownerAddress: string, assetId: number): Promise<number>;
}

/**
 * Node asset service interface
 */
export interface INodeAssetService {
  mintAsset(
    nodeAddress: string,
    asset: Asset,
    amount: number,
    className: string,
  ): Promise<void>;
  updateAssetCapacity(
    nodeAddress: string,
    assetId: number,
    newCapacity: number,
    supportedAssets: number[],
    capacities: number[],
    assetPrices: number[],
  ): Promise<void>;
  updateAssetPrice(
    nodeAddress: string,
    assetId: number,
    newPrice: number,
    supportedAssets: number[],
    assetPrices: number[],
  ): Promise<void>;
  updateSupportedAssets(
    nodeAddress: string,
    quantities: number[],
    assets: number[],
    prices: number[],
  ): Promise<void>;
}

/**
 * Node handoff service interface
 */
