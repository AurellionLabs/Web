/**
 * PlatformRepository Tests
 *
 * Tests the actual implementation of getAssetByTokenId, getClassAssets,
 * getSupportedAssetClasses, etc. These are critical paths for:
 * - P2P metadata resolution (was broken because tokenId format mismatch)
 * - Node dashboard attribute loading
 * - Asset class loading on tokenize page
 */
import { PlatformRepository } from '@/infrastructure/repositories/platform-repository';

// Mock chain-constants
vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_INDEXER_URL: 'https://mock-indexer.test/graphql',
}));

// Mock graphqlRequest
const mockGraphqlRequest = vi.fn();
vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: (...args: any[]) => mockGraphqlRequest(...args),
}));

// Mock graph-queries
vi.mock('@/infrastructure/shared/graph-queries', () => ({
  GET_SUPPORTED_ASSET_ADDED_EVENTS: 'MOCK_ASSET_QUERY',
  GET_SUPPORTED_CLASS_ADDED_EVENTS: 'MOCK_CLASS_ADDED_QUERY',
  GET_SUPPORTED_CLASS_REMOVED_EVENTS: 'MOCK_CLASS_REMOVED_QUERY',
}));

/** Helper to create a mock Pinata */
function createMockPinata(
  opts: {
    files?: Array<{ cid: string }>;
    gatewayData?: Record<string, any>;
    hasJwt?: boolean;
  } = {},
) {
  const { files = [], gatewayData = {}, hasJwt = true } = opts;

  const listBuilder = {
    keyvalues: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue(files),
  };

  return {
    files: {
      public: {
        list: vi.fn().mockReturnValue(listBuilder),
      },
    },
    gateways: {
      public: {
        get: vi.fn().mockImplementation((cid: string) => ({
          data: gatewayData[cid] ?? {},
        })),
      },
    },
    config: { pinataJwt: hasJwt ? 'test-jwt' : undefined },
    _listBuilder: listBuilder,
  } as any;
}

/** Minimal mock AuraAsset contract */
const mockContract = {} as any;

describe('PlatformRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('getSupportedAssets', () => {
    it('should batch metadata lookup through the platform metadata API when Pinata is unavailable', async () => {
      mockGraphqlRequest.mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [
            { token: '0x1', token_id: '1' },
            { token: '0x1', token_id: '2' },
          ],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          assets: [
            {
              assetClass: 'GOAT',
              tokenId: '1',
              name: 'First Goat',
              attributes: [],
            },
            {
              assetClass: 'SHEEP',
              tokenId: '2',
              name: 'Second Sheep',
              attributes: [],
            },
          ],
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const repo = new PlatformRepository(
        mockContract,
        undefined as any,
        42161,
      );
      const assets = await repo.getSupportedAssets();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/platform/metadata?tokenIds=1%2C2&chainId=42161',
      );
      expect(assets).toHaveLength(2);
      expect(assets[0].name).toBe('First Goat');
      expect(assets[1].name).toBe('Second Sheep');
    });
  });

  describe('getAssetByTokenId', () => {
    it('should fall back to the platform metadata API when Pinata is unavailable', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          asset: {
            assetClass: 'GOAT',
            tokenId: '321',
            name: 'API Goat',
            attributes: [],
          },
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const repo = new PlatformRepository(
        mockContract,
        undefined as any,
        42161,
      );
      const asset = await repo.getAssetByTokenId('321');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/platform/metadata?tokenId=321&chainId=42161',
      );
      expect(asset?.name).toBe('API Goat');
    });

    it('should try multiple tokenId formats (raw, decimal, hex) for Pinata query', async () => {
      const hexTokenId =
        '0xb4ea2cef8a0db05f1d5db458b7e725abe12c5dea46810992eae76b8687876a40';

      const pinata = createMockPinata({
        files: [{ cid: 'QmAssetCID' }],
        gatewayData: {
          QmAssetCID: {
            className: 'GOAT',
            tokenId: hexTokenId,
            asset: {
              name: 'AUGOAT',
              attributes: [
                {
                  name: 'weight',
                  values: ['S', 'M', 'L'],
                  description: 'Weight',
                },
              ],
            },
          },
        },
      });

      const repo = new PlatformRepository(mockContract, pinata);
      const asset = await repo.getAssetByTokenId(hexTokenId);

      // Should try raw string first, which matches immediately
      expect(pinata._listBuilder.keyvalues).toHaveBeenCalledWith({
        tokenId: hexTokenId,
      });

      expect(asset).not.toBeNull();
      expect(asset!.name).toBe('AUGOAT');
      expect(asset!.assetClass).toBe('GOAT');
      expect(asset!.attributes).toHaveLength(1);
      expect(asset!.attributes[0].name).toBe('weight');
      expect(asset!.attributes[0].values).toEqual(['S', 'M', 'L']);
    });

    it('should accept numeric tokenId', async () => {
      const pinata = createMockPinata({
        files: [{ cid: 'QmNum' }],
        gatewayData: {
          QmNum: {
            className: 'SHEEP',
            asset: { name: 'AUSHEEP' },
          },
        },
      });

      const repo = new PlatformRepository(mockContract, pinata);
      const asset = await repo.getAssetByTokenId(42);

      expect(pinata._listBuilder.keyvalues).toHaveBeenCalledWith({
        tokenId: '42',
      });
      expect(asset).not.toBeNull();
      expect(asset!.name).toBe('AUSHEEP');
    });

    it('should accept bigint tokenId', async () => {
      const pinata = createMockPinata({
        files: [{ cid: 'QmBig' }],
        gatewayData: {
          QmBig: {
            className: 'COW',
            asset: { name: 'AUCOW' },
          },
        },
      });

      const repo = new PlatformRepository(mockContract, pinata);
      const asset = await repo.getAssetByTokenId(BigInt(999));

      expect(pinata._listBuilder.keyvalues).toHaveBeenCalledWith({
        tokenId: '999',
      });
      expect(asset).not.toBeNull();
    });

    it('should return null when no IPFS file found', async () => {
      const pinata = createMockPinata({ files: [] });
      const repo = new PlatformRepository(mockContract, pinata);
      const asset = await repo.getAssetByTokenId('12345');

      expect(asset).toBeNull();
    });

    it('should return null on Pinata error (not throw)', async () => {
      const pinata = createMockPinata();
      pinata._listBuilder.all.mockRejectedValue(new Error('Network error'));

      const repo = new PlatformRepository(mockContract, pinata);
      const asset = await repo.getAssetByTokenId('12345');

      expect(asset).toBeNull();
    });

    it('should not permanently cache null metadata API misses', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ asset: null, cid: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            asset: {
              assetClass: 'GOLD',
              tokenId: '321',
              name: 'Recovered Gold',
              attributes: [
                {
                  name: 'purity',
                  values: ['24k'],
                  description: 'Purity',
                },
              ],
            },
            cid: 'bafy-recovered',
          }),
        });
      vi.stubGlobal('fetch', fetchMock);

      const repo = new PlatformRepository(
        mockContract,
        undefined as any,
        42161,
      );

      const first = await repo.getAssetByTokenId('321');
      const second = await repo.getAssetByTokenId('321');

      expect(first).toBeNull();
      expect(second?.name).toBe('Recovered Gold');
      expect(second?.attributes).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should handle stringified JSON from gateway', async () => {
      const pinata = createMockPinata({
        files: [{ cid: 'QmStr' }],
      });
      // Override gateway to return a string
      pinata.gateways.public.get.mockResolvedValue({
        data: JSON.stringify({
          className: 'DUCK',
          asset: { name: 'AUDUCK', attributes: [] },
        }),
      });

      const repo = new PlatformRepository(mockContract, pinata);
      const asset = await repo.getAssetByTokenId('777');

      expect(asset).not.toBeNull();
      expect(asset!.name).toBe('AUDUCK');
      expect(asset!.assetClass).toBe('DUCK');
    });

    it('should handle single-object attributes (not array)', async () => {
      const pinata = createMockPinata({
        files: [{ cid: 'QmSingle' }],
        gatewayData: {
          QmSingle: {
            className: 'GOAT',
            asset: {
              name: 'AUGOAT',
              // Attributes as a single object instead of array
              attributes: {
                name: 'weight',
                values: ['S', 'M'],
                description: 'Weight',
              },
            },
          },
        },
      });

      const repo = new PlatformRepository(mockContract, pinata);
      const asset = await repo.getAssetByTokenId('888');

      expect(asset).not.toBeNull();
      expect(asset!.attributes).toHaveLength(1);
      expect(asset!.attributes[0].name).toBe('weight');
    });

    it('should filter out attributes with empty names', async () => {
      const pinata = createMockPinata({
        files: [{ cid: 'QmEmpty' }],
        gatewayData: {
          QmEmpty: {
            className: 'GOAT',
            asset: {
              name: 'AUGOAT',
              attributes: [
                { name: 'weight', values: ['S'], description: '' },
                { name: '', values: ['X'], description: '' }, // should be filtered
                { values: ['Y'] }, // missing name, should be filtered
              ],
            },
          },
        },
      });

      const repo = new PlatformRepository(mockContract, pinata);
      const asset = await repo.getAssetByTokenId('999');

      expect(asset).not.toBeNull();
      expect(asset!.attributes).toHaveLength(1);
      expect(asset!.attributes[0].name).toBe('weight');
    });
  });

  describe('getSupportedAssetClasses', () => {
    it('should compute active classes as added minus removed', async () => {
      mockGraphqlRequest
        .mockResolvedValueOnce({
          diamondSupportedClassAddedEventss: {
            items: [
              { class_name: 'GOAT' },
              { class_name: 'SHEEP' },
              { class_name: 'COW' },
            ],
          },
        })
        .mockResolvedValueOnce({
          diamondSupportedClassRemovedEventss: {
            items: [{ class_name: 'SHEEP' }],
          },
        });

      const pinata = createMockPinata();
      const repo = new PlatformRepository(mockContract, pinata);
      const classes = await repo.getSupportedAssetClasses();

      expect(classes).toContain('GOAT');
      expect(classes).toContain('COW');
      expect(classes).not.toContain('SHEEP');
      expect(classes).toHaveLength(2);
    });

    it('should return empty array when no classes added', async () => {
      mockGraphqlRequest
        .mockResolvedValueOnce({
          diamondSupportedClassAddedEventss: { items: [] },
        })
        .mockResolvedValueOnce({
          diamondSupportedClassRemovedEventss: { items: [] },
        });

      const pinata = createMockPinata();
      const repo = new PlatformRepository(mockContract, pinata);
      const classes = await repo.getSupportedAssetClasses();

      expect(classes).toEqual([]);
    });

    it('should fallback to IPFS when indexer fails', async () => {
      // First two calls (class added/removed) fail
      mockGraphqlRequest
        .mockRejectedValueOnce(new Error('Indexer offline'))
        // Then getSupportedAssets (called by fallback) succeeds
        .mockResolvedValueOnce({
          diamondSupportedAssetAddedEventss: {
            items: [
              { token: '0x1', token_id: '1' },
              { token: '0x1', token_id: '2' },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        });

      const pinata = createMockPinata({
        files: [{ cid: 'QmFallback1' }],
        gatewayData: {
          QmFallback1: { className: 'GOAT', asset: { name: 'AUGOAT' } },
        },
      });

      const repo = new PlatformRepository(mockContract, pinata);
      const classes = await repo.getSupportedAssetClasses();

      // Should have fallen back to IPFS extraction
      expect(classes.length).toBeGreaterThan(0);
      expect(classes).toContain('GOAT');
    });
  });

  describe('getClassAssets', () => {
    it('should fall back to the platform metadata API when Pinata is unavailable', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          assets: [
            {
              assetClass: 'GOAT',
              tokenId: '1',
              name: 'API Goat',
              attributes: [],
            },
          ],
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const repo = new PlatformRepository(mockContract, undefined as any);
      const assets = await repo.getClassAssets('GOAT');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/platform/metadata?className=GOAT',
      );
      expect(assets).toHaveLength(1);
      expect(assets[0].name).toBe('API Goat');
    });

    it('should return empty array when Pinata JWT is missing', async () => {
      const pinata = createMockPinata({ hasJwt: false });
      const repo = new PlatformRepository(mockContract, pinata);
      const assets = await repo.getClassAssets('GOAT');

      expect(assets).toEqual([]);
    });

    it('should query Pinata with className keyvalue', async () => {
      const pinata = createMockPinata({
        files: [{ cid: 'QmGoat1' }, { cid: 'QmGoat2' }],
        gatewayData: {
          QmGoat1: {
            className: 'GOAT',
            tokenId: '1',
            asset: {
              name: 'AUGOAT Standard',
              attributes: [
                { name: 'weight', values: ['S', 'M', 'L'], description: '' },
              ],
            },
          },
          QmGoat2: {
            className: 'GOAT',
            tokenId: '2',
            asset: {
              name: 'AUGOAT Premium',
              attributes: [
                { name: 'sex', values: ['M', 'F'], description: '' },
              ],
            },
          },
        },
      });

      const repo = new PlatformRepository(mockContract, pinata);
      const assets = await repo.getClassAssets('GOAT');

      expect(pinata._listBuilder.keyvalues).toHaveBeenCalledWith({
        className: 'GOAT',
      });
      expect(assets).toHaveLength(2);
      expect(assets[0].name).toBe('AUGOAT Standard');
      expect(assets[1].name).toBe('AUGOAT Premium');
    });

    it('should fall back to scanning payloads when Pinata keyvalues are missing', async () => {
      const keyvalueBuilder = {
        keyvalues: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([]),
      };
      const scanBuilder = {
        all: vi.fn().mockResolvedValue([{ cid: 'QmGoat' }, { cid: 'QmSheep' }]),
      };
      const pinata = {
        files: {
          public: {
            list: vi
              .fn()
              .mockReturnValueOnce(keyvalueBuilder)
              .mockReturnValueOnce(scanBuilder),
          },
        },
        gateways: {
          public: {
            get: vi.fn().mockImplementation((cid: string) => ({
              data:
                cid === 'QmGoat'
                  ? {
                      className: 'GOAT',
                      tokenId: '1',
                      asset: {
                        name: 'AUGOAT',
                        attributes: [
                          {
                            name: 'weight',
                            values: ['S', 'M', 'L'],
                            description: '',
                          },
                        ],
                      },
                    }
                  : {
                      className: 'SHEEP',
                      tokenId: '2',
                      asset: {
                        name: 'AUSHEEP',
                        attributes: [
                          {
                            name: 'weight',
                            values: ['S', 'M', 'L'],
                            description: '',
                          },
                        ],
                      },
                    },
            })),
          },
        },
        config: { pinataJwt: 'test-jwt' },
      } as any;

      const repo = new PlatformRepository(mockContract, pinata);
      const assets = await repo.getClassAssets('GOAT');

      expect(keyvalueBuilder.keyvalues).toHaveBeenCalledWith({
        className: 'GOAT',
      });
      expect(scanBuilder.all).toHaveBeenCalledTimes(1);
      expect(assets).toHaveLength(1);
      expect(assets[0].assetClass).toBe('GOAT');
      expect(assets[0].name).toBe('AUGOAT');
    });

    it('should handle individual asset fetch failures gracefully', async () => {
      const pinata = createMockPinata({
        files: [{ cid: 'QmGood' }, { cid: 'QmBad' }],
        gatewayData: {
          QmGood: {
            className: 'GOAT',
            tokenId: '1',
            asset: { name: 'Good Asset' },
          },
        },
      });
      // QmBad will throw when gateway.get is called
      pinata.gateways.public.get.mockImplementation((cid: string) => {
        if (cid === 'QmBad') throw new Error('CID not found');
        return { data: pinata.gateways.public.get.__originalData?.[cid] ?? {} };
      });
      // Fix: override to return data for QmGood, throw for QmBad
      pinata.gateways.public.get.mockImplementation((cid: string) => {
        if (cid === 'QmBad') throw new Error('CID not found');
        return {
          data: {
            className: 'GOAT',
            tokenId: '1',
            asset: { name: 'Good Asset' },
          },
        };
      });

      const repo = new PlatformRepository(mockContract, pinata);
      const assets = await repo.getClassAssets('GOAT');

      // Should still return the good asset, filtering out the failed one
      expect(assets).toHaveLength(1);
      expect(assets[0].name).toBe('Good Asset');
    });
  });
});
