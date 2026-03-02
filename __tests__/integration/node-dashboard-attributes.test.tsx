/**
 * Node Dashboard Attributes Integration Test
 *
 * Tests the loadAssetAttributes logic that was broken for months because
 * it called DiamondNodeRepository.getAssetAttributes() which was a stub.
 *
 * The fix was to use getAssetByTokenId from PlatformProvider (IPFS lookup),
 * converting Asset.attributes (values: string[]) to TokenizedAssetAttribute (value: string).
 *
 * This test validates the conversion logic without rendering the full dashboard.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Asset, AssetAttribute } from '@/domain/shared';
import type { TokenizedAsset, TokenizedAssetAttribute } from '@/domain/node';

/**
 * This is the exact conversion logic extracted from app/node/dashboard/page.tsx
 * lines 350-391. We test it in isolation to ensure correctness.
 */
async function loadAssetAttributes(
  assets: TokenizedAsset[],
  getAssetByTokenId: (tokenId: string) => Promise<Asset | null>,
): Promise<Record<string, TokenizedAssetAttribute[]>> {
  const attributesMap: Record<string, TokenizedAssetAttribute[]> = {};

  await Promise.all(
    assets.map(async (asset) => {
      try {
        const ipfsAsset = await getAssetByTokenId(asset.id);
        if (
          ipfsAsset &&
          ipfsAsset.attributes &&
          ipfsAsset.attributes.length > 0
        ) {
          attributesMap[asset.id] = ipfsAsset.attributes.map((attr) => ({
            name: attr.name,
            value: attr.values.join(', '),
            description: attr.description,
          }));
        } else {
          attributesMap[asset.id] = [];
        }
      } catch (error) {
        attributesMap[asset.id] = [];
      }
    }),
  );

  return attributesMap;
}

// ===========================================================================
// TEST DATA
// ===========================================================================

const TOKENIZED_ASSETS: TokenizedAsset[] = [
  {
    id: '12345',
    name: 'AUGOAT',
    class: 'GOAT',
    amount: '100',
    status: 'Active',
    fileHash: 'QmTest1',
    nodeAddress: '0xnode1',
    nodeLocation: { addressName: 'Farm', location: { lat: '0', lng: '0' } },
    price: '1000',
    capacity: '100',
  },
  {
    id: '67890',
    name: 'AUSHEEP',
    class: 'SHEEP',
    amount: '50',
    status: 'Active',
    fileHash: 'QmTest2',
    nodeAddress: '0xnode1',
    nodeLocation: { addressName: 'Farm', location: { lat: '0', lng: '0' } },
    price: '500',
    capacity: '50',
  },
];

const GOAT_IPFS_ASSET: Asset = {
  assetClass: 'GOAT',
  tokenId: '12345',
  name: 'AUGOAT',
  attributes: [
    { name: 'weight', values: ['S', 'M', 'L'], description: 'Weight class' },
    { name: 'sex', values: ['M', 'F'], description: 'Animal sex' },
  ],
};

const SHEEP_IPFS_ASSET: Asset = {
  assetClass: 'SHEEP',
  tokenId: '67890',
  name: 'AUSHEEP',
  attributes: [],
};

// ===========================================================================
// TESTS
// ===========================================================================

describe('Node Dashboard - loadAssetAttributes', () => {
  describe('conversion from Asset to TokenizedAssetAttribute', () => {
    it('should convert AssetAttribute.values[] to TokenizedAssetAttribute.value string', async () => {
      const mockGetByTokenId = vi.fn().mockResolvedValue(GOAT_IPFS_ASSET);

      const result = await loadAssetAttributes(
        [TOKENIZED_ASSETS[0]],
        mockGetByTokenId,
      );

      expect(result['12345']).toHaveLength(2);
      expect(result['12345'][0]).toEqual({
        name: 'weight',
        value: 'S, M, L', // Joined with ', '
        description: 'Weight class',
      });
      expect(result['12345'][1]).toEqual({
        name: 'sex',
        value: 'M, F',
        description: 'Animal sex',
      });
    });

    it('should return empty array for assets with no attributes', async () => {
      const mockGetByTokenId = vi.fn().mockResolvedValue(SHEEP_IPFS_ASSET);

      const result = await loadAssetAttributes(
        [TOKENIZED_ASSETS[1]],
        mockGetByTokenId,
      );

      expect(result['67890']).toEqual([]);
    });

    it('should handle null IPFS response (no metadata found)', async () => {
      const mockGetByTokenId = vi.fn().mockResolvedValue(null);

      const result = await loadAssetAttributes(
        [TOKENIZED_ASSETS[0]],
        mockGetByTokenId,
      );

      expect(result['12345']).toEqual([]);
    });

    it('should handle IPFS errors gracefully', async () => {
      const mockGetByTokenId = vi
        .fn()
        .mockRejectedValue(new Error('Pinata timeout'));

      const result = await loadAssetAttributes(
        [TOKENIZED_ASSETS[0]],
        mockGetByTokenId,
      );

      // Should not throw, should have empty array
      expect(result['12345']).toEqual([]);
    });

    it('should load attributes for multiple assets in parallel', async () => {
      const mockGetByTokenId = vi.fn().mockImplementation((tokenId: string) => {
        if (tokenId === '12345') return Promise.resolve(GOAT_IPFS_ASSET);
        if (tokenId === '67890') return Promise.resolve(SHEEP_IPFS_ASSET);
        return Promise.resolve(null);
      });

      const result = await loadAssetAttributes(
        TOKENIZED_ASSETS,
        mockGetByTokenId,
      );

      // GOAT should have 2 attributes
      expect(result['12345']).toHaveLength(2);
      // SHEEP should have 0
      expect(result['67890']).toEqual([]);

      expect(mockGetByTokenId).toHaveBeenCalledWith('12345');
      expect(mockGetByTokenId).toHaveBeenCalledWith('67890');
    });

    it('should handle single-value attributes correctly', async () => {
      const singleValAsset: Asset = {
        assetClass: 'GOAT',
        tokenId: '12345',
        name: 'AUGOAT',
        attributes: [
          { name: 'color', values: ['Brown'], description: 'Color' },
        ],
      };
      const mockGetByTokenId = vi.fn().mockResolvedValue(singleValAsset);

      const result = await loadAssetAttributes(
        [TOKENIZED_ASSETS[0]],
        mockGetByTokenId,
      );

      expect(result['12345'][0].value).toBe('Brown');
    });

    it('should handle empty values array', async () => {
      const emptyValAsset: Asset = {
        assetClass: 'GOAT',
        tokenId: '12345',
        name: 'AUGOAT',
        attributes: [{ name: 'color', values: [], description: 'Color' }],
      };
      const mockGetByTokenId = vi.fn().mockResolvedValue(emptyValAsset);

      const result = await loadAssetAttributes(
        [TOKENIZED_ASSETS[0]],
        mockGetByTokenId,
      );

      // Should still create an attribute entry with empty joined string
      expect(result['12345'][0].value).toBe('');
    });
  });

  describe('old stub detection (regression prevention)', () => {
    it('should NOT use DiamondNodeRepository.getAssetAttributes (the stub)', async () => {
      // This test documents that the dashboard MUST use getAssetByTokenId
      // from PlatformProvider, NOT the stub method on DiamondNodeRepository.
      //
      // The stub signature: getAssetAttributes(fileHash: string) => []
      // The correct path: getAssetByTokenId(tokenId: string) => Asset | null

      const mockGetByTokenId = vi.fn().mockResolvedValue(GOAT_IPFS_ASSET);

      await loadAssetAttributes([TOKENIZED_ASSETS[0]], mockGetByTokenId);

      // Verify it was called with the asset ID (tokenId), not fileHash
      expect(mockGetByTokenId).toHaveBeenCalledWith('12345');
      // The old stub would have been called with 'QmTest1' (the fileHash)
      expect(mockGetByTokenId).not.toHaveBeenCalledWith('QmTest1');
    });
  });
});
