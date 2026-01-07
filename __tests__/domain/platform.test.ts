// @ts-nocheck - Test file with vitest
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  IpfsAssetAttribute,
  IpfsAsset,
  AssetIpfsRecord,
  AssetClass,
  PlatformState,
  IPlatformRepository,
} from '@/domain/platform';
import { Asset, AssetAttribute } from '@/domain/shared';

describe('Platform Domain', () => {
  describe('IpfsAssetAttribute Type', () => {
    it('should have correct structure', () => {
      const attribute: IpfsAssetAttribute = {
        name: 'color',
        values: ['red', 'blue', 'green'],
        description: 'The color of the asset',
      };

      expect(attribute).toHaveProperty('name');
      expect(attribute).toHaveProperty('values');
      expect(attribute).toHaveProperty('description');
      expect(Array.isArray(attribute.values)).toBe(true);
    });
  });

  describe('IpfsAsset Type', () => {
    it('should have correct structure', () => {
      const asset: IpfsAsset = {
        name: 'Gold Bar',
        class: 'Precious Metals',
        attributes: [
          {
            name: 'weight',
            values: ['1oz', '10oz', '1kg'],
            description: 'Weight options',
          },
          {
            name: 'purity',
            values: ['99.9%', '99.99%'],
            description: 'Gold purity',
          },
        ],
      };

      expect(asset).toHaveProperty('name');
      expect(asset).toHaveProperty('class');
      expect(asset).toHaveProperty('attributes');
      expect(asset.attributes).toHaveLength(2);
    });
  });

  describe('AssetIpfsRecord Type', () => {
    it('should have correct structure', () => {
      const record: AssetIpfsRecord = {
        tokenId: '12345',
        hash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        asset: {
          name: 'Premium Goat',
          class: 'Livestock',
          attributes: [
            {
              name: 'breed',
              values: ['Boer', 'Nubian'],
              description: 'Goat breed',
            },
          ],
        },
        className: 'Livestock',
      };

      expect(record).toHaveProperty('tokenId');
      expect(record).toHaveProperty('hash');
      expect(record).toHaveProperty('asset');
      expect(record).toHaveProperty('className');
      expect(typeof record.tokenId).toBe('string');
      expect(typeof record.hash).toBe('string');
    });
  });

  describe('AssetClass Type', () => {
    it('should have correct structure with computed statistics', () => {
      const assetClass: AssetClass = {
        name: 'Precious Metals',
        assetTypeCount: 5,
        assetCount: 1000,
        totalVolume: '5000000000000000000000',
        isActive: true,
      };

      expect(assetClass).toHaveProperty('name');
      expect(assetClass).toHaveProperty('assetTypeCount');
      expect(assetClass).toHaveProperty('assetCount');
      expect(assetClass).toHaveProperty('totalVolume');
      expect(assetClass).toHaveProperty('isActive');

      expect(typeof assetClass.assetTypeCount).toBe('number');
      expect(typeof assetClass.assetCount).toBe('number');
      expect(typeof assetClass.totalVolume).toBe('string');
      expect(typeof assetClass.isActive).toBe('boolean');
    });

    it('should allow inactive classes', () => {
      const inactiveClass: AssetClass = {
        name: 'Deprecated Assets',
        assetTypeCount: 0,
        assetCount: 0,
        totalVolume: '0',
        isActive: false,
      };

      expect(inactiveClass.isActive).toBe(false);
    });
  });

  describe('PlatformState Discriminated Union', () => {
    it('should handle idle state', () => {
      const state: PlatformState = { status: 'idle' };
      expect(state.status).toBe('idle');
    });

    it('should handle loading state', () => {
      const state: PlatformState = { status: 'loading' };
      expect(state.status).toBe('loading');
    });

    it('should handle error state', () => {
      const state: PlatformState = {
        status: 'error',
        error: 'Failed to load platform data',
      };
      expect(state.status).toBe('error');
      expect(state.error).toBe('Failed to load platform data');
    });

    it('should handle success state with data', () => {
      const classes: AssetClass[] = [
        {
          name: 'Livestock',
          assetTypeCount: 10,
          assetCount: 500,
          totalVolume: '1000000000000000000000',
          isActive: true,
        },
      ];

      const assets: Asset[] = [
        {
          assetClass: 'Livestock',
          tokenId: '1',
          name: 'Premium Goat',
          attributes: [
            { name: 'breed', values: ['Boer'], description: 'Goat breed' },
          ],
        },
      ];

      const state: PlatformState = {
        status: 'success',
        classes,
        assets,
      };

      expect(state.status).toBe('success');
      expect(state.classes).toHaveLength(1);
      expect(state.assets).toHaveLength(1);
    });
  });

  describe('IPlatformRepository Interface', () => {
    let mockRepository: IPlatformRepository;

    beforeEach(() => {
      mockRepository = {
        contract: {} as any, // Mock contract
        getSupportedAssets: vi.fn(),
        getSupportedAssetClasses: vi.fn(),
        getClassAssets: vi.fn(),
        getAssetByTokenId: vi.fn(),
      };
    });

    describe('getSupportedAssets', () => {
      it('should return all supported assets', async () => {
        const expectedAssets: Asset[] = [
          {
            assetClass: 'Livestock',
            tokenId: '1',
            name: 'Goat',
            attributes: [
              {
                name: 'breed',
                values: ['Boer', 'Nubian'],
                description: 'Breed type',
              },
            ],
          },
          {
            assetClass: 'Livestock',
            tokenId: '2',
            name: 'Sheep',
            attributes: [
              {
                name: 'breed',
                values: ['Merino', 'Suffolk'],
                description: 'Breed type',
              },
            ],
          },
          {
            assetClass: 'Precious Metals',
            tokenId: '3',
            name: 'Gold Bar',
            attributes: [
              {
                name: 'weight',
                values: ['1oz', '10oz'],
                description: 'Weight',
              },
            ],
          },
        ];

        vi.mocked(mockRepository.getSupportedAssets).mockResolvedValue(
          expectedAssets,
        );

        const result = await mockRepository.getSupportedAssets();

        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('Goat');
        expect(result[2].assetClass).toBe('Precious Metals');
      });

      it('should return empty array when no assets', async () => {
        vi.mocked(mockRepository.getSupportedAssets).mockResolvedValue([]);

        const result = await mockRepository.getSupportedAssets();

        expect(result).toHaveLength(0);
      });
    });

    describe('getSupportedAssetClasses', () => {
      it('should return all asset class names', async () => {
        const expectedClasses = [
          'Livestock',
          'Precious Metals',
          'Real Estate',
          'Commodities',
        ];

        vi.mocked(mockRepository.getSupportedAssetClasses).mockResolvedValue(
          expectedClasses,
        );

        const result = await mockRepository.getSupportedAssetClasses();

        expect(result).toHaveLength(4);
        expect(result).toContain('Livestock');
        expect(result).toContain('Precious Metals');
      });
    });

    describe('getClassAssets', () => {
      it('should return assets for a specific class', async () => {
        const livestockAssets: Asset[] = [
          {
            assetClass: 'Livestock',
            tokenId: '1',
            name: 'Goat',
            attributes: [],
          },
          {
            assetClass: 'Livestock',
            tokenId: '2',
            name: 'Sheep',
            attributes: [],
          },
        ];

        vi.mocked(mockRepository.getClassAssets).mockResolvedValue(
          livestockAssets,
        );

        const result = await mockRepository.getClassAssets('Livestock');

        expect(result).toHaveLength(2);
        expect(result.every((a) => a.assetClass === 'Livestock')).toBe(true);
        expect(mockRepository.getClassAssets).toHaveBeenCalledWith('Livestock');
      });

      it('should return empty array for unknown class', async () => {
        vi.mocked(mockRepository.getClassAssets).mockResolvedValue([]);

        const result = await mockRepository.getClassAssets('UnknownClass');

        expect(result).toHaveLength(0);
      });
    });

    describe('getAssetByTokenId', () => {
      it('should return asset by string token ID', async () => {
        const expectedAsset: Asset = {
          assetClass: 'Livestock',
          tokenId: '123',
          name: 'Premium Goat',
          attributes: [
            { name: 'breed', values: ['Boer'], description: 'Breed' },
          ],
        };

        vi.mocked(mockRepository.getAssetByTokenId).mockResolvedValue(
          expectedAsset,
        );

        const result = await mockRepository.getAssetByTokenId('123');

        expect(result).toEqual(expectedAsset);
        expect(mockRepository.getAssetByTokenId).toHaveBeenCalledWith('123');
      });

      it('should return asset by number token ID', async () => {
        const expectedAsset: Asset = {
          assetClass: 'Precious Metals',
          tokenId: '456',
          name: 'Gold Bar',
          attributes: [],
        };

        vi.mocked(mockRepository.getAssetByTokenId).mockResolvedValue(
          expectedAsset,
        );

        const result = await mockRepository.getAssetByTokenId(456);

        expect(result).toEqual(expectedAsset);
      });

      it('should return asset by bigint token ID', async () => {
        const expectedAsset: Asset = {
          assetClass: 'Real Estate',
          tokenId: '789',
          name: 'Property Token',
          attributes: [],
        };

        vi.mocked(mockRepository.getAssetByTokenId).mockResolvedValue(
          expectedAsset,
        );

        const result = await mockRepository.getAssetByTokenId(789n);

        expect(result).toEqual(expectedAsset);
      });

      it('should return null when asset not found', async () => {
        vi.mocked(mockRepository.getAssetByTokenId).mockResolvedValue(null);

        const result = await mockRepository.getAssetByTokenId('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('contract property', () => {
      it('should have contract property', () => {
        expect(mockRepository).toHaveProperty('contract');
      });
    });
  });

  describe('Asset Type from shared', () => {
    it('should have correct structure', () => {
      const asset: Asset = {
        assetClass: 'Livestock',
        tokenId: '1',
        name: 'Goat',
        attributes: [
          {
            name: 'breed',
            values: ['Boer', 'Nubian'],
            description: 'The breed of goat',
          },
          {
            name: 'age',
            values: ['1-2 years', '2-3 years'],
            description: 'Age range',
          },
        ],
      };

      expect(asset).toHaveProperty('assetClass');
      expect(asset).toHaveProperty('tokenId');
      expect(asset).toHaveProperty('name');
      expect(asset).toHaveProperty('attributes');
    });

    it('should support deprecated tokenID field', () => {
      const asset: Asset = {
        assetClass: 'Livestock',
        tokenId: '1',
        tokenID: 1n, // Deprecated
        name: 'Goat',
        attributes: [],
      };

      expect(asset.tokenId).toBe('1');
      expect(asset.tokenID).toBe(1n);
    });
  });

  describe('AssetAttribute Type from shared', () => {
    it('should have correct structure', () => {
      const attribute: AssetAttribute = {
        name: 'color',
        values: ['red', 'blue', 'green'],
        description: 'Available colors',
      };

      expect(attribute).toHaveProperty('name');
      expect(attribute).toHaveProperty('values');
      expect(attribute).toHaveProperty('description');
      expect(Array.isArray(attribute.values)).toBe(true);
    });

    it('should allow empty values array', () => {
      const attribute: AssetAttribute = {
        name: 'custom',
        values: [],
        description: 'User-defined value',
      };

      expect(attribute.values).toHaveLength(0);
    });
  });
});
