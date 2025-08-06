import { IPlatformRepository, Asset } from '@/domain/platform';

export class PlatformRepository implements IPlatformRepository {
  async getSupportedAssets(): Promise<Asset[]> {
    // TODO: Implement actual platform assets retrieval
    // Dummy data for testing
    return [
      {
        tokenID: BigInt(1),
        name: 'Gold Bars',
        attributes: [
          {
            name: 'purity',
            values: ['99.9%', '99.5%', '99.0%'],
            description: 'Gold purity level',
          },
          {
            name: 'weight',
            values: ['1oz', '10oz', '100oz', '1kg'],
            description: 'Weight of the gold bar',
          },
        ],
      },
      {
        tokenID: BigInt(2),
        name: 'Silver Coins',
        attributes: [
          {
            name: 'type',
            values: [
              'American Eagle',
              'Canadian Maple Leaf',
              'Austrian Philharmonic',
            ],
            description: 'Type of silver coin',
          },
          {
            name: 'condition',
            values: ['Mint', 'Excellent', 'Good'],
            description: 'Condition of the coin',
          },
        ],
      },
    ];
  }

  async getSupportedAssetClasses(): Promise<string[]> {
    // TODO: Implement actual asset classes retrieval
    // Dummy data for testing
    return [
      'Precious Metals',
      'Real Estate',
      'Commodities',
      'Art & Collectibles',
      'Energy Assets',
      'Agricultural Products',
      'Industrial Materials',
      'Luxury Goods',
    ];
  }
}
