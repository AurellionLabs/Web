import { IPlatformRepository, Asset } from '@/domain/platform';

const DUMMY_ASSET_CLASSES: string[] = [
  'Goat',
  'Sheep',
  'Horses',
  'Gold',
  'Diamond',
];

const DUMMY_ASSETS: Asset[] = [
  {
    assetClass: 'Goat',
    tokenID: 1n,
    name: 'Mountain Goat',
    attributes: [
      {
        name: 'breed',
        values: ['Boer', 'Kalahari Red', 'Nubian'],
        description: 'Goat breed',
      },
      {
        name: 'age',
        values: ['6 months', '1 year', '2 years+'],
        description: 'Approximate age',
      },
    ],
  },
  {
    assetClass: 'Sheep',
    tokenID: 2n,
    name: 'Wool Sheep',
    attributes: [
      {
        name: 'breed',
        values: ['Merino', 'Suffolk', 'Dorper'],
        description: 'Sheep breed',
      },
      {
        name: 'wool_grade',
        values: ['Fine', 'Medium', 'Coarse'],
        description: 'Wool micron grade',
      },
    ],
  },
  {
    assetClass: 'Horses',
    tokenID: 3n,
    name: 'Racing Horse',
    attributes: [
      {
        name: 'breed',
        values: ['Thoroughbred', 'Arabian', 'Quarter Horse'],
        description: 'Horse breed',
      },
      {
        name: 'training_level',
        values: ['Green', 'Intermediate', 'Advanced'],
        description: 'Training and handling level',
      },
    ],
  },
  {
    assetClass: 'Gold',
    tokenID: 4n,
    name: 'Gold Bar',
    attributes: [
      {
        name: 'purity',
        values: ['99.9%', '99.5%', '99.0%'],
        description: 'Gold purity level',
      },
      {
        name: 'weight',
        values: ['1oz', '10oz', '100oz', '1kg'],
        description: 'Bar weight',
      },
    ],
  },
  {
    assetClass: 'Diamond',
    tokenID: 5n,
    name: 'Polished Diamond',
    attributes: [
      {
        name: 'clarity',
        values: ['IF', 'VVS1', 'VS1', 'SI1'],
        description: 'Clarity grade',
      },
      {
        name: 'carat',
        values: ['0.5ct', '1.0ct', '2.0ct+'],
        description: 'Carat weight',
      },
      {
        name: 'color',
        values: ['D', 'E', 'F', 'G'],
        description: 'Color grade',
      },
    ],
  },
];

export class PlatformRepository implements IPlatformRepository {
  async getSupportedAssets(): Promise<Asset[]> {
    return DUMMY_ASSETS;
  }

  async getSupportedAssetClasses(): Promise<string[]> {
    return DUMMY_ASSET_CLASSES;
  }

  async getClassAssets(assetClass: string): Promise<Asset[]> {
    const normalizedClass = assetClass.toLowerCase();
    return DUMMY_ASSETS.filter(
      (asset) => asset.assetClass.toLowerCase() === normalizedClass,
    );
  }
}
