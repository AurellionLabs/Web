import { AuraAsset } from '@/typechain-types';

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

export interface IPlatformRepository {
  contract: AuraAsset;
  getSupportedAssets(): Promise<Asset[]>;
  getSupportedAssetClasses(): Promise<string[]>;
  getClassAssets(assetClass: string): Promise<Asset[]>;
  getAssetByTokenId(tokenId: string | number | bigint): Promise<Asset | null>;
}
