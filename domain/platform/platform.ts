export interface Asset {
  id: number;
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

export interface PlatformRepository {
  getSupportedAssets(): Promise<Asset[]>;
}
