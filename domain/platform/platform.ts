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
  getSupportedAssets(): Promise<Asset[]>;
  getSupportedAssetClasses(): Promise<string[]>;
  getClassAssets(assetClass: string): Promise<Asset[]>;
}
