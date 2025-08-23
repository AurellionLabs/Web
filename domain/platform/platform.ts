import { AuraAsset } from '@/typechain-types';

export interface Asset {
  assetClass: string;
  tokenID: bigint;
  name: string;
  attributes: AssetAttribute[];
}

/**
 * Asset attribute definition
 */
export interface AssetAttribute {
  name: string;
  values: string[];
  description: string;
}

export interface IPlatformRepository {
  contract: AuraAsset;
  getSupportedAssets(): Promise<Asset[]>;
  getSupportedAssetClasses(): Promise<string[]>;
  getClassAssets(assetClass: string): Promise<Asset[]>;
  getAssetByHash(hash: string): Promise<Asset | null>;
}
