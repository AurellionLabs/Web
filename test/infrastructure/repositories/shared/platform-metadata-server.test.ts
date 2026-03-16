import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInitCache = vi.fn().mockResolvedValue(undefined);
const mockCache = {
  getIpfsMetadata: vi.fn(),
  setIpfsMetadata: vi.fn(),
  getCidContent: vi.fn(),
  setCidContent: vi.fn(),
};

const mockHashToAssets = vi.fn();
const mockTokenIdToAssets = vi.fn();
const mockGetIpfsGroupId = vi.fn(() => 'test-group');
const mockGatewayGet = vi.fn();
const mockListAll = vi.fn();
const mockKeyvalues = vi.fn(() => ({ all: mockListAll }));
const mockList = vi.fn(() => {
  const builder = {
    group: vi.fn(() => builder),
    keyvalues: mockKeyvalues,
    all: mockListAll,
  };

  return builder;
});

vi.mock('@/infrastructure/cache', () => ({
  initCache: mockInitCache,
  getCache: () => mockCache,
}));

vi.mock('@/infrastructure/repositories/shared/ipfs', () => ({
  hashToAssets: (...args: unknown[]) => mockHashToAssets(...args),
  tokenIdToAssets: (...args: unknown[]) => mockTokenIdToAssets(...args),
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_DEFAULT_CHAIN_ID: 84532,
  getIpfsGroupId: (...args: unknown[]) => mockGetIpfsGroupId(...args),
}));

vi.mock('pinata', () => ({
  PinataSDK: vi.fn(() => ({
    files: {
      public: {
        list: mockList,
      },
    },
    gateways: {
      public: {
        get: mockGatewayGet,
      },
    },
  })),
}));

describe('platform-metadata-server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PINATA_JWT = 'test-jwt';
    mockCache.getIpfsMetadata.mockResolvedValue(null);
    mockCache.setIpfsMetadata.mockResolvedValue(undefined);
    mockCache.getCidContent.mockResolvedValue(null);
    mockCache.setCidContent.mockResolvedValue(undefined);
    mockHashToAssets.mockResolvedValue([]);
    mockTokenIdToAssets.mockResolvedValue([]);
    mockListAll.mockResolvedValue([]);
    mockGatewayGet.mockResolvedValue({});
  });

  it('passes the chain IPFS group id into hash and tokenId fallback lookups', async () => {
    mockTokenIdToAssets.mockResolvedValue([
      { asset: { name: 'Fallback asset', attributes: [] } },
    ]);

    const { getAssetRecordsByHashFromServerCache } = await import(
      '@/infrastructure/repositories/shared/platform-metadata-server'
    );

    const records = await getAssetRecordsByHashFromServerCache('123', 42161);

    expect(records).toHaveLength(1);
    expect(mockGetIpfsGroupId).toHaveBeenCalledWith(42161);
    expect(mockHashToAssets).toHaveBeenCalledWith(
      '123',
      expect.any(Object),
      'test-group',
    );
    expect(mockTokenIdToAssets).toHaveBeenCalledWith(
      '123',
      expect.any(Object),
      'test-group',
    );
  });

  it('reads token metadata when the Pinata gateway returns raw JSON payloads', async () => {
    mockListAll.mockResolvedValue([{ cid: 'QmRaw' }]);
    mockGatewayGet.mockResolvedValue({
      className: 'GOAT',
      tokenId: '9',
      asset: {
        name: 'Raw Goat',
        attributes: [{ name: 'weight', values: ['M'], description: 'Mass' }],
      },
    });

    const { getAssetByTokenIdFromServerCache } = await import(
      '@/infrastructure/repositories/shared/platform-metadata-server'
    );

    const result = await getAssetByTokenIdFromServerCache('9', 42161);

    expect(result.cid).toBe('QmRaw');
    expect(mockGetIpfsGroupId).toHaveBeenCalledWith(42161);
    expect(result.asset).toEqual({
      assetClass: 'GOAT',
      tokenId: '9',
      name: 'Raw Goat',
      attributes: [{ name: 'weight', values: ['M'], description: 'Mass' }],
    });
  });
});
