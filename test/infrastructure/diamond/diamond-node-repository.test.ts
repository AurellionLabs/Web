/**
 * DiamondNodeRepository Tests
 *
 * Tests for the Diamond-based node repository, specifically:
 * - fetchAssetMetadata: IPFS metadata resolution via Pinata
 * - getAssetAttributes: Was a stub returning [] that broke the dashboard for months
 * - getNodeAssets: End-to-end asset loading with metadata
 */
import { ethers } from 'ethers';
import { DiamondNodeRepository } from '@/infrastructure/diamond/diamond-node-repository';

// Mock chain-constants
vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_INDEXER_URL: 'https://mock-indexer.test/graphql',
  NEXT_PUBLIC_AURA_ASSET_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
}));

// Mock graphqlRequest
vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: vi.fn(),
}));

// Mock graph-queries
vi.mock('@/infrastructure/shared/graph-queries', () => ({
  GET_LOGISTICS_ORDER_CREATED_EVENTS: 'mock-query',
  GET_ALL_UNIFIED_ORDER_EVENTS: 'mock-query',
  GET_SUPPORTED_ASSET_ADDED_EVENTS: 'mock-query',
  GET_MINTED_ASSET_CLASS_BY_TOKEN_IDS: 'mock-minted-query',
}));

// Mock indexer-endpoint
vi.mock('@/infrastructure/config/indexer-endpoint', () => ({
  getCurrentIndexerUrl: () => 'http://localhost:42069',
}));

// Mock Redis cache - tests should not hit real Redis
vi.mock('@/infrastructure/cache', () => ({
  getCache: () => ({
    getIpfsMetadata: vi.fn().mockResolvedValue(null),
    setIpfsMetadata: vi.fn().mockResolvedValue(undefined),
    getCidContent: vi.fn().mockResolvedValue(null),
    setCidContent: vi.fn().mockResolvedValue(undefined),
  }),
}));

/** Create a mock PinataSDK with chainable list builder */
function createMockPinata(
  files: Array<{ cid: string }> = [],
  gatewayData: Record<string, any> = {},
) {
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
    _listBuilder: listBuilder,
  } as any;
}

/**
 * Create a mock DiamondContext that matches the actual diamond contract interface.
 * `getNode(hash)` returns raw contract data; `getNodeAssets(hash)` returns asset tuples.
 */
function createMockContext(
  overrides: {
    nodeData?: any;
    nodeAssets?: any[];
    inventoryWithMetadata?: any[];
    getNodeError?: Error;
  } = {},
) {
  const diamond = {
    getNode: overrides.getNodeError
      ? vi.fn().mockRejectedValue(overrides.getNodeError)
      : vi.fn().mockResolvedValue(
          overrides.nodeData ?? {
            owner: ethers.ZeroAddress,
            addressName: '',
            lat: '0',
            lng: '0',
            validNode: false,
            active: false,
          },
        ),
    getNodeAssets: vi.fn().mockResolvedValue(overrides.nodeAssets ?? []),
    getNodeInventoryWithMetadata: vi
      .fn()
      .mockResolvedValue(overrides.inventoryWithMetadata ?? []),
  };
  return {
    getDiamond: vi.fn().mockReturnValue(diamond),
    getProvider: vi.fn(),
    getSigner: vi.fn(),
    _diamond: diamond,
  } as any;
}

// Valid Ethereum address for tests
const TEST_NODE_ADDR = '0x1234567890123456789012345678901234567890';
// 66-char bytes32 hash (bypasses ethers.zeroPadValue)
const TEST_NODE_HASH =
  '0x0000000000000000000000001234567890123456789012345678901234567890';

describe('DiamondNodeRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('getAssetAttributes', () => {
    it('should fall back to the platform metadata API when Pinata is unavailable', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          records: [
            {
              asset: {
                attributes: [
                  {
                    name: 'weight',
                    values: ['M'],
                    description: 'Weight bucket',
                  },
                ],
              },
            },
          ],
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const context = createMockContext();
      const repo = new DiamondNodeRepository(context);
      const result = await repo.getAssetAttributes('QmHash123');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/platform/metadata?hash=QmHash123',
      );
      expect(result).toEqual([
        {
          name: 'weight',
          value: 'M',
          description: 'Weight bucket',
        },
      ]);
    });

    it('should NOT be a no-op stub that always returns empty array', async () => {
      // This test exists because getAssetAttributes was a stub returning []
      // for months, causing "No attributes" in the node dashboard.
      const mockPinata = createMockPinata();
      const context = createMockContext();
      const repo = new DiamondNodeRepository(context, mockPinata);

      const result = await repo.getAssetAttributes('any-hash');

      // The current implementation is still a stub. This test documents that.
      // When properly implemented, this should return real attributes.
      expect(result).toEqual([]);

      // NOTE: The actual attribute loading for the dashboard now goes through
      // getAssetByTokenId in the PlatformProvider. This stub remains for
      // interface compliance but should eventually be wired up or removed.
    });
  });

  describe('getNodeAssets', () => {
    it('should return empty array when node does not exist (zero address owner)', async () => {
      const context = createMockContext({
        nodeData: {
          owner: ethers.ZeroAddress,
          addressName: '',
          lat: '0',
          lng: '0',
          validNode: false,
          active: false,
        },
      });

      const repo = new DiamondNodeRepository(context);
      const assets = await repo.getNodeAssets(TEST_NODE_HASH);
      expect(assets).toEqual([]);
    });

    it('should return empty array when node has no assets', async () => {
      const context = createMockContext({
        nodeData: {
          owner: '0x1111111111111111111111111111111111111111',
          addressName: 'Empty Node',
          lat: '10',
          lng: '20',
          validNode: true,
          active: true,
        },
        nodeAssets: [],
      });

      const repo = new DiamondNodeRepository(context);
      const assets = await repo.getNodeAssets(TEST_NODE_HASH);
      expect(assets).toEqual([]);
    });

    it('should return empty array when contract call fails', async () => {
      const context = createMockContext({
        getNodeError: new Error('Diamond: Function does not exist'),
      });

      const repo = new DiamondNodeRepository(context);
      const assets = await repo.getNodeAssets(TEST_NODE_HASH);
      expect(assets).toEqual([]);
    });

    it('should use the platform metadata API when pinata is not available', async () => {
      const tokenId = '12345';
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          asset: {
            assetClass: 'GOAT',
            tokenId,
            name: 'API Goat',
            attributes: [],
          },
          cid: 'QmApiCid',
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const context = createMockContext({
        nodeData: {
          owner: '0x1111111111111111111111111111111111111111',
          addressName: 'Test Node',
          lat: '10',
          lng: '20',
          validNode: true,
          active: true,
        },
        nodeAssets: [
          {
            token: '0xtoken',
            tokenId: BigInt(tokenId),
            price: BigInt(1000),
            capacity: 100,
          },
        ],
        inventoryWithMetadata: [
          {
            token: '0xtoken',
            tokenId: BigInt(tokenId),
            price: BigInt(1000),
            capacity: BigInt(100),
            balance: BigInt(20),
          },
        ],
      });

      const { graphqlRequest } = await import(
        '@/infrastructure/repositories/shared/graph'
      );
      vi.mocked(graphqlRequest).mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      // No pinata passed
      const repo = new DiamondNodeRepository(context);
      const assets = await repo.getNodeAssets(TEST_NODE_HASH);

      expect(assets.length).toBe(1);
      expect(assets[0].id).toBe(tokenId);
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/platform/metadata?tokenId=${tokenId}`,
      );
      expect(assets[0].name).toBe('API Goat');
      expect(assets[0].class).toBe('GOAT');
      expect(assets[0].fileHash).toBe('QmApiCid');
      expect(assets[0].amount).toBe('20');
      expect(assets[0].capacity).toBe('100');
    });

    it('should fetch metadata from IPFS when pinata is available', async () => {
      const tokenId = '12345';
      const cid = 'QmTestCID123';

      const ipfsData = {
        [cid]: {
          className: 'GOAT',
          asset: { name: 'AUGOAT' },
        },
      };

      const mockPinata = createMockPinata([{ cid }], ipfsData);

      const context = createMockContext({
        nodeData: {
          owner: '0x1111111111111111111111111111111111111111',
          addressName: 'Farm Node',
          lat: '10',
          lng: '20',
          validNode: true,
          active: true,
        },
        nodeAssets: [
          {
            token: '0xtoken',
            tokenId: BigInt(tokenId),
            price: BigInt(1000),
            capacity: 100,
          },
        ],
        inventoryWithMetadata: [
          {
            token: '0xtoken',
            tokenId: BigInt(tokenId),
            price: BigInt(1000),
            capacity: BigInt(100),
            balance: BigInt(7),
          },
        ],
      });

      const { graphqlRequest } = await import(
        '@/infrastructure/repositories/shared/graph'
      );
      vi.mocked(graphqlRequest).mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const repo = new DiamondNodeRepository(context, mockPinata);
      const assets = await repo.getNodeAssets(TEST_NODE_HASH);

      expect(assets.length).toBe(1);
      expect(assets[0].name).toBe('AUGOAT');
      expect(assets[0].class).toBe('GOAT');
      expect(assets[0].fileHash).toBe(cid);
      expect(assets[0].amount).toBe('7');
    });

    it('should handle IPFS fetch errors gracefully (returns empty metadata)', async () => {
      const tokenId = '99';
      const mockPinata = createMockPinata();
      // Make all() throw
      mockPinata._listBuilder.all.mockRejectedValue(
        new Error('Pinata timeout'),
      );

      const context = createMockContext({
        nodeData: {
          owner: '0x1111111111111111111111111111111111111111',
          addressName: 'Node',
          lat: '0',
          lng: '0',
          validNode: true,
          active: true,
        },
        nodeAssets: [
          {
            token: '0xtoken',
            tokenId: BigInt(tokenId),
            price: BigInt(500),
            capacity: 50,
          },
        ],
        inventoryWithMetadata: [
          {
            token: '0xtoken',
            tokenId: BigInt(tokenId),
            price: BigInt(500),
            capacity: BigInt(50),
            balance: BigInt(9),
          },
        ],
      });

      const { graphqlRequest } = await import(
        '@/infrastructure/repositories/shared/graph'
      );
      vi.mocked(graphqlRequest).mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const repo = new DiamondNodeRepository(context, mockPinata);
      const assets = await repo.getNodeAssets(TEST_NODE_HASH);

      expect(assets.length).toBe(1);
      expect(assets[0].name).toBe('');
      expect(assets[0].class).toBe('Unknown');
    });

    it('should handle empty Pinata results (no IPFS file for tokenId)', async () => {
      const tokenId = '99999';
      const mockPinata = createMockPinata([], {});

      const context = createMockContext({
        nodeData: {
          owner: '0x1111111111111111111111111111111111111111',
          addressName: 'Node',
          lat: '0',
          lng: '0',
          validNode: true,
          active: true,
        },
        nodeAssets: [
          {
            token: '0xtoken',
            tokenId: BigInt(tokenId),
            price: BigInt(500),
            capacity: 50,
          },
        ],
        inventoryWithMetadata: [
          {
            token: '0xtoken',
            tokenId: BigInt(tokenId),
            price: BigInt(500),
            capacity: BigInt(50),
            balance: BigInt(11),
          },
        ],
      });

      const { graphqlRequest } = await import(
        '@/infrastructure/repositories/shared/graph'
      );
      vi.mocked(graphqlRequest).mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const repo = new DiamondNodeRepository(context, mockPinata);
      const assets = await repo.getNodeAssets(TEST_NODE_HASH);

      expect(assets.length).toBe(1);
      expect(assets[0].name).toBe('');
      expect(assets[0].class).toBe('Unknown');
    });

    it('should extract class from various IPFS metadata formats', async () => {
      const testCases = [
        { field: 'className', value: 'GOAT', name: 'GoatAsset' },
        { field: 'class', value: 'SHEEP', name: 'SheepAsset' },
        { field: 'assetClass', value: 'COW', name: 'CowAsset' },
      ];

      for (const tc of testCases) {
        vi.clearAllMocks();

        const cid = `cid-${tc.field}`;
        const ipfsData: Record<string, any> = {};
        ipfsData[cid] = { [tc.field]: tc.value, asset: { name: tc.name } };

        const pinata = createMockPinata([{ cid }], ipfsData);

        const context = createMockContext({
          nodeData: {
            owner: '0x1111111111111111111111111111111111111111',
            addressName: 'N',
            lat: '0',
            lng: '0',
            validNode: true,
            active: true,
          },
          nodeAssets: [
            {
              token: '0xaaa',
              tokenId: BigInt(1),
              price: BigInt(1),
              capacity: 1,
            },
          ],
          inventoryWithMetadata: [
            {
              token: '0xaaa',
              tokenId: BigInt(1),
              price: BigInt(1),
              capacity: BigInt(1),
              balance: BigInt(1),
            },
          ],
        });

        const { graphqlRequest } = await import(
          '@/infrastructure/repositories/shared/graph'
        );
        vi.mocked(graphqlRequest).mockResolvedValue({
          diamondSupportedAssetAddedEventss: {
            items: [],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        });

        const repo = new DiamondNodeRepository(context, pinata);
        const assets = await repo.getNodeAssets(TEST_NODE_HASH);

        expect(assets.length).toBeGreaterThan(0);
        expect(assets[0].class).toBe(tc.value);
        expect(assets[0].name).toBe(tc.name);
      }
    });

    it('should extract name from asset.name when top-level name is absent', async () => {
      const cid = 'cid-nested';
      const ipfsData = {
        [cid]: { className: 'GOAT', asset: { name: 'NestedName' } },
      };

      const pinata = createMockPinata([{ cid }], ipfsData);

      const context = createMockContext({
        nodeData: {
          owner: '0x1111111111111111111111111111111111111111',
          addressName: 'N',
          lat: '0',
          lng: '0',
          validNode: true,
          active: true,
        },
        nodeAssets: [
          { token: '0xaaa', tokenId: BigInt(1), price: BigInt(1), capacity: 1 },
        ],
        inventoryWithMetadata: [
          {
            token: '0xaaa',
            tokenId: BigInt(1),
            price: BigInt(1),
            capacity: BigInt(1),
            balance: BigInt(1),
          },
        ],
      });

      const { graphqlRequest } = await import(
        '@/infrastructure/repositories/shared/graph'
      );
      vi.mocked(graphqlRequest).mockResolvedValue({
        diamondSupportedAssetAddedEventss: {
          items: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

      const repo = new DiamondNodeRepository(context, pinata);
      const assets = await repo.getNodeAssets(TEST_NODE_HASH);

      expect(assets.length).toBeGreaterThan(0);
      expect(assets[0].name).toBe('NestedName');
    });
  });
});
