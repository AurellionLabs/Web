import { describe, it, expect } from 'vitest';
import { mapAsset, AssetGraphEntity } from '@/infrastructure/shared/mappers';
import { Asset } from '@/domain/shared';

describe('Asset Mapper', () => {
  it('should correctly map a complete asset graph response to domain asset', () => {
    const rawAsset: AssetGraphEntity = {
      id: '0x123-1',
      tokenId: '1',
      name: 'Test Asset',
      assetClass: 'TestClass',
      className: 'TestClassName',
      attributes: {
        items: [
          {
            name: 'Color',
            values: ['Red'],
            description: 'The color of the asset',
          },
          {
            name: 'Size',
            values: ['Large'],
            description: 'The size of the asset',
          },
        ],
      },
    };

    const expectedAsset: Asset = {
      tokenId: '1',
      tokenID: 1n,
      name: 'Test Asset',
      assetClass: 'TestClass',
      attributes: [
        {
          name: 'Color',
          values: ['Red'],
          description: 'The color of the asset',
        },
        {
          name: 'Size',
          values: ['Large'],
          description: 'The size of the asset',
        },
      ],
    };

    const result = mapAsset(rawAsset);

    expect(result).toEqual(expectedAsset);
  });

  it('should handle missing attributes', () => {
    const rawAsset: AssetGraphEntity = {
      id: '0x123-2',
      tokenId: '2',
      name: 'Asset No Attributes',
      assetClass: 'SimpleClass',
    };

    const expectedAsset: Asset = {
      tokenId: '2',
      tokenID: 2n,
      name: 'Asset No Attributes',
      assetClass: 'SimpleClass',
      attributes: [],
    };

    const result = mapAsset(rawAsset);

    expect(result).toEqual(expectedAsset);
  });

  it('should handle empty attributes list', () => {
    const rawAsset: AssetGraphEntity = {
      id: '0x123-3',
      tokenId: '3',
      name: 'Asset Empty Attributes',
      assetClass: 'SimpleClass',
      attributes: {
        items: [],
      },
    };

    const expectedAsset: Asset = {
      tokenId: '3',
      tokenID: 3n,
      name: 'Asset Empty Attributes',
      assetClass: 'SimpleClass',
      attributes: [],
    };

    const result = mapAsset(rawAsset);

    expect(result).toEqual(expectedAsset);
  });
});
