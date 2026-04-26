import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInitCache = vi.fn().mockResolvedValue(undefined);
const mockCache = {
  getIpfsMetadata: vi.fn(),
  setIpfsMetadata: vi.fn(),
  getCidContent: vi.fn(),
  setCidContent: vi.fn(),
};

const mockListAll = vi.fn();
const mockKeyvalues = vi.fn(() => ({ all: mockListAll }));
const mockList = vi.fn(() => ({ keyvalues: mockKeyvalues }));
const mockGatewayGet = vi.fn();

vi.mock('@/infrastructure/cache', () => ({
  initCache: mockInitCache,
  getCache: () => mockCache,
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

describe('GET /api/platform/metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PINATA_JWT = 'test-jwt';
    mockInitCache.mockResolvedValue(undefined);
    mockCache.getIpfsMetadata.mockResolvedValue(null);
    mockCache.setIpfsMetadata.mockResolvedValue(undefined);
    mockCache.getCidContent.mockResolvedValue(null);
    mockCache.setCidContent.mockResolvedValue(undefined);
    mockList.mockImplementation(() => ({ keyvalues: mockKeyvalues }));
    mockListAll.mockResolvedValue([]);
    mockGatewayGet.mockResolvedValue({ data: {} });
  });

  it('returns cached token metadata without calling Pinata', async () => {
    mockCache.getIpfsMetadata.mockResolvedValue({
      name: 'Cached Goat',
      class: 'GOAT',
      cid: 'QmCached',
      attributes: [{ name: 'weight', values: ['L'], description: '' }],
    });

    const { GET } = await import('@/app/api/platform/metadata/route');
    const response = await GET(
      new NextRequest('http://localhost/api/platform/metadata?tokenId=42'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.asset).toEqual({
      assetClass: 'GOAT',
      tokenId: '42',
      name: 'Cached Goat',
      attributes: [{ name: 'weight', values: ['L'], description: '' }],
    });
    expect(body.cid).toBe('QmCached');
    expect(mockList).not.toHaveBeenCalled();
  });

  it('normalizes cached metadata attributes that omit description', async () => {
    mockCache.getIpfsMetadata.mockResolvedValue({
      name: 'Cached Goat',
      class: 'GOAT',
      cid: 'QmCached',
      attributes: [{ name: 'weight', values: ['L'] }],
    });

    const { GET } = await import('@/app/api/platform/metadata/route');
    const response = await GET(
      new NextRequest('http://localhost/api/platform/metadata?tokenId=42'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.asset).toEqual({
      assetClass: 'GOAT',
      tokenId: '42',
      name: 'Cached Goat',
      attributes: [{ name: 'weight', values: ['L'], description: '' }],
    });
  });

  it('repopulates Redis from Pinata on a token metadata miss', async () => {
    mockListAll.mockResolvedValue([{ cid: 'QmFresh' }]);
    mockGatewayGet.mockResolvedValue({
      data: {
        className: 'SHEEP',
        tokenId: '99',
        asset: {
          name: 'Fresh Sheep',
          attributes: [{ name: 'sex', values: ['F'], description: '' }],
        },
      },
    });

    const { GET } = await import('@/app/api/platform/metadata/route');
    const response = await GET(
      new NextRequest('http://localhost/api/platform/metadata?tokenId=99'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.asset?.name).toBe('Fresh Sheep');
    expect(body.cid).toBe('QmFresh');
    expect(mockCache.setIpfsMetadata).toHaveBeenCalledWith(
      'ipfs:token:84532:99',
      {
        name: 'Fresh Sheep',
        class: 'SHEEP',
        cid: 'QmFresh',
        attributes: [{ name: 'sex', values: ['F'], description: '' }],
      },
    );
  });

  it('returns class assets from Pinata and caches them on class cache miss', async () => {
    mockListAll.mockResolvedValue([{ cid: 'QmClass1' }]);
    mockGatewayGet.mockResolvedValue({
      data: {
        className: 'GOAT',
        tokenId: '7',
        asset: {
          name: 'Class Goat',
          attributes: [{ name: 'weight', values: ['M'], description: '' }],
        },
      },
    });

    const { GET } = await import('@/app/api/platform/metadata/route');
    const response = await GET(
      new NextRequest('http://localhost/api/platform/metadata?className=GOAT'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0].name).toBe('Class Goat');
    expect(mockCache.setCidContent).toHaveBeenCalled();
  });

  it('falls back to scanning metadata payloads when Pinata class keyvalues are missing', async () => {
    mockList.mockReset();
    const mockScanAll = vi
      .fn()
      .mockResolvedValue([{ cid: 'QmGoat' }, { cid: 'QmSheep' }]);
    mockList
      .mockImplementationOnce(() => ({ keyvalues: mockKeyvalues }))
      .mockImplementationOnce(() => ({ all: mockScanAll }));
    mockListAll.mockResolvedValue([]);
    mockGatewayGet.mockImplementation(async (cid: string) => ({
      data:
        cid === 'QmGoat'
          ? {
              className: 'GOAT',
              tokenId: '7',
              asset: {
                name: 'Fallback Goat',
                attributes: [
                  { name: 'weight', values: ['M'], description: '' },
                ],
              },
            }
          : {
              className: 'SHEEP',
              tokenId: '8',
              asset: {
                name: 'Fallback Sheep',
                attributes: [
                  { name: 'weight', values: ['M'], description: '' },
                ],
              },
            },
    }));

    const { GET } = await import('@/app/api/platform/metadata/route');
    const response = await GET(
      new NextRequest('http://localhost/api/platform/metadata?className=GOAT'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0].assetClass).toBe('GOAT');
    expect(body.assets[0].name).toBe('Fallback Goat');
    expect(mockScanAll).toHaveBeenCalledTimes(1);
  });

  it('returns cached hash records without requiring Pinata', async () => {
    delete process.env.PINATA_JWT;
    mockCache.getCidContent.mockResolvedValue([
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
    ]);

    const { GET } = await import('@/app/api/platform/metadata/route');
    const response = await GET(
      new NextRequest('http://localhost/api/platform/metadata?hash=QmHash123'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.records).toHaveLength(1);
    expect(mockList).not.toHaveBeenCalled();
  });

  it('falls back to Pinata when Redis init fails', async () => {
    mockInitCache.mockRejectedValueOnce(new Error('redis unavailable'));
    mockListAll.mockResolvedValue([{ cid: 'QmAfterRedisFailure' }]);
    mockGatewayGet.mockResolvedValue({
      data: {
        className: 'GOAT',
        tokenId: '123',
        asset: { name: 'Recovered Goat', attributes: [] },
      },
    });

    const { GET } = await import('@/app/api/platform/metadata/route');
    const response = await GET(
      new NextRequest('http://localhost/api/platform/metadata?tokenId=123'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.asset?.name).toBe('Recovered Goat');
  });
});
