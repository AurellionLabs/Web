import type { AuraAsset } from '@/lib/contracts';
import { Asset } from '../shared';

export interface IpfsAssetAttribute {
  name: string;
  values: string[];
  description: string;
}

export interface IpfsAsset {
  name: string;
  class: string;
  attributes: IpfsAssetAttribute[];
}

export interface AssetIpfsRecord {
  tokenId: string;
  hash: string;
  asset: IpfsAsset;
  className: string;
}

/**
 * Represents an asset class with computed statistics
 */
export interface AssetClass {
  /** Class name (e.g., "Goat", "Gold") */
  name: string;
  /** Number of unique asset types in this class */
  assetTypeCount: number;
  /** Total number of individual assets (tokens) in this class */
  assetCount: number;
  /** Total trading volume in USD (from CLOB data) */
  totalVolume: string;
  /** Whether this class is active */
  isActive: boolean;
}

/**
 * Discriminated union for platform loading states
 */
export type PlatformState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; classes: AssetClass[]; assets: Asset[] };

export interface IPlatformRepository {
  contract: AuraAsset;
  getSupportedAssets(): Promise<Asset[]>;
  getSupportedAssetClasses(): Promise<string[]>;
  getClassAssets(assetClass: string): Promise<Asset[]>;
  getAssetByTokenId(tokenId: string | number | bigint): Promise<Asset | null>;
}
