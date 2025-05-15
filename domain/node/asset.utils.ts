import { AssetType } from './node'; // Assuming AssetType enum is defined in node.ts

const ASSET_ID_TO_NAME_MAP: { [key in AssetType]?: string } = {
  [AssetType.GOAT]: 'Goat',
  [AssetType.SHEEP]: 'Sheep',
  [AssetType.COW]: 'Cow',
  [AssetType.CHICKEN]: 'Chicken',
  [AssetType.DUCK]: 'Duck',
  // Add other asset types here
};

export function getAssetNameById(id: number): string {
  return ASSET_ID_TO_NAME_MAP[id as AssetType] || `Unknown Asset (${id})`;
}

// You could also add other asset-related utility functions here
