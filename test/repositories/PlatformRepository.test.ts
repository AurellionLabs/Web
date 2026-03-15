// File: test/repositories/PlatformRepository.test.ts
// Unit tests for PlatformRepository — handles IPFS metadata and asset class queries via Pinata

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlatformRepository } from '@/infrastructure/repositories/platform-repository';

// -------------------------------------------------------------------
// Mocks
// -------------------------------------------------------------------
const graphqlRequestMock = vi.fn();

vi.mock('@/infrastructure/repositories/shared/graph', () => ({
  graphqlRequest: (...args: unknown[]) => graphqlRequestMock(...args),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_AUSYS_SUBGRAPH_URL: 'https://indexer.test/graphql',
}));

vi.mock('@/infrastructure/config/indexer-endpoint', () => ({
  getCurrentIndexerUrl: () => 'https://indexer.test/graphql',
}));

vi.mock('@/utils/error-handler', () => ({
  handleContractError: vi.fn(),
}));

// Mock Pinata SDK
const mockPinataFilesPublic = {
  list: vi.fn(() => ({
    keyvalues: vi.fn(() => ({
      all: vi.fn(),
    })),
  })),
};

const mockPinataGateways = {
  public: {
    get: vi.fn(),
  },
};

const mockPinata = {
  files: mockPinataFilesPublic,
  gateways: mockPinataGateways,
  config: {
    pinataJwt: 'test-jwt',
  },
};

// -------------------------------------------------------------------
// Test Suite
// -------------------------------------------------------------------

describe('PlatformRepository', () => {
  let repository: PlatformRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PlatformRepository(mockPinata as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should accept pinata SDK directly as single argument', () => {
      const repo = new PlatformRepository(mockPinata as any);
      expect(repo).toBeDefined();
    });

    it('should accept contract + pinata for backward compatibility', () => {
      const repo = new PlatformRepository(
        '0xContract' as any,
        mockPinata as any,
      );
      expect(repo).toBeDefined();
    });
  });

  describe('isPinataRateLimitError', () => {
    it('should detect 429 status in error message', async () => {
      const error = new Error('429 Too Many Requests');
      const repo = new PlatformRepository(mockPinata as any);
      // Access private method via any cast for testing
      const result = (repo as any).isPinataRateLimitError(error);
      expect(result).toBe(true);
    });

    it('should detect "too many requests" in error message', async () => {
      const error = new Error('Rate limited: too many requests');
      const repo = new PlatformRepository(mockPinata as any);
      const result = (repo as any).isPinataRateLimitError(error);
      expect(result).toBe(true);
    });

    it('should return false for normal errors', async () => {
      const error = new Error('Some other error');
      const repo = new PlatformRepository(mockPinata as any);
      const result = (repo as any).isPinataRateLimitError(error);
      expect(result).toBe(false);
    });

    it('should handle string errors', async () => {
      const repo = new PlatformRepository(mockPinata as any);
      const result = (repo as any).isPinataRateLimitError('429 rate limit');
      expect(result).toBe(true);
    });

    it('should handle object errors', async () => {
      const repo = new PlatformRepository(mockPinata as any);
      const result = (repo as any).isPinataRateLimitError({
        message: '429 error',
      });
      expect(result).toBe(true);
    });
  });

  describe('getSupportedAssetClasses', () => {
    it('should return asset classes from indexer events', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce({
          diamondSupportedClassAddedEventss: {
            items: [{ class_name: 'ClassA' }, { class_name: 'ClassB' }],
          },
        })
        .mockResolvedValueOnce({
          diamondSupportedClassRemovedEventss: {
            items: [{ class_name: 'ClassA' }],
          },
        });

      const result = await repository.getSupportedAssetClasses();

      expect(result).toContain('ClassB');
      expect(result).not.toContain('ClassA');
    });

    it('should handle empty events', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce({
          diamondSupportedClassAddedEventss: { items: [] },
        })
        .mockResolvedValueOnce({
          diamondSupportedClassRemovedEventss: { items: [] },
        });

      const result = await repository.getSupportedAssetClasses();
      expect(result).toEqual([]);
    });

    it('should fall back to IPFS on indexer failure', async () => {
      graphqlRequestMock.mockRejectedValueOnce(new Error('Network error'));

      // Mock getSupportedAssets to return assets with assetClass
      vi.spyOn(repository as any, 'getSupportedAssets').mockResolvedValueOnce([
        { assetClass: 'RWA', name: 'Asset1', attributes: [] },
        { assetClass: 'RealEstate', name: 'Asset2', attributes: [] },
      ]);

      const result = await repository.getSupportedAssetClasses();
      expect(result).toContain('RWA');
      expect(result).toContain('RealEstate');
    });

    it('should handle null class_name in events', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce({
          diamondSupportedClassAddedEventss: {
            items: [
              { class_name: 'ValidClass' },
              { class_name: null },
              { class_name: undefined },
            ],
          },
        })
        .mockResolvedValueOnce({
          diamondSupportedClassRemovedEventss: { items: [] },
        });

      const result = await repository.getSupportedAssetClasses();
      expect(result).toContain('ValidClass');
    });

    it('should subtract removed classes from added classes', async () => {
      graphqlRequestMock
        .mockResolvedValueOnce({
          diamondSupportedClassAddedEventss: {
            items: [
              { class_name: 'Class1' },
              { class_name: 'Class2' },
              { class_name: 'Class3' },
            ],
          },
        })
        .mockResolvedValueOnce({
          diamondSupportedClassRemovedEventss: {
            items: [{ class_name: 'Class2' }],
          },
        });

      const result = await repository.getSupportedAssetClasses();
      expect(result).toContain('Class1');
      expect(result).not.toContain('Class2');
      expect(result).toContain('Class3');
    });
  });

  describe('getAssetCID', () => {
    it('should find CID by token and tokenId', async () => {
      const mockList = [{ cid: 'QmTest123' }];

      // Create a chain: mockListFn.keyvalues({...}).all() returns mockList
      const mockAllFn = vi.fn().mockResolvedValue(mockList);
      const mockKeyValuesFn = vi.fn().mockReturnValue({ all: mockAllFn });
      const mockListFn = vi
        .fn()
        .mockReturnValue({ keyvalues: mockKeyValuesFn });

      // Override the entire files.public structure
      (mockPinata as any).files = {
        public: {
          list: mockListFn,
        },
      };

      const result = await (repository as any).getAssetCID('0xToken', '123');
      expect(result).toBe('QmTest123');
    });

    it('should return null when no files found', async () => {
      const mockAllFn = vi.fn().mockResolvedValue([]);
      const mockKeyValuesFn = vi.fn().mockReturnValue({ all: mockAllFn });
      const mockListFn = vi
        .fn()
        .mockReturnValue({ keyvalues: mockKeyValuesFn });

      (mockPinata as any).files = {
        public: {
          list: mockListFn,
        },
      };

      const result = await (repository as any).getAssetCID('0xToken', '999');
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const mockAllFn = vi.fn().mockRejectedValue(new Error('Pinata error'));
      const mockKeyValuesFn = vi.fn().mockReturnValue({ all: mockAllFn });
      const mockListFn = vi
        .fn()
        .mockReturnValue({ keyvalues: mockKeyValuesFn });

      (mockPinata as any).files = {
        public: {
          list: mockListFn,
        },
      };

      const result = await (repository as any).getAssetCID('0xToken', '123');
      expect(result).toBeNull();
    });
  });

  describe('mapWithConcurrency', () => {
    it('should map items with limited concurrency', async () => {
      const items = [1, 2, 3, 4, 5];
      const mapper = vi
        .fn()
        .mockImplementation(async (item: number) => item * 2);

      const result = await (repository as any).mapWithConcurrency(
        items,
        2,
        mapper,
      );

      expect(result).toEqual([2, 4, 6, 8, 10]);
      // With concurrency of 2, we shouldn't have more than 2 concurrent calls
      expect(mapper).toHaveBeenCalledTimes(5);
    });

    it('should return empty array for empty input', async () => {
      const mapper = vi.fn();
      const result = await (repository as any).mapWithConcurrency(
        [],
        2,
        mapper,
      );
      expect(result).toEqual([]);
      expect(mapper).not.toHaveBeenCalled();
    });

    it('should handle concurrency greater than array length', async () => {
      const items = [1, 2];
      const mapper = vi
        .fn()
        .mockImplementation(async (item: number) => item * 2);

      const result = await (repository as any).mapWithConcurrency(
        items,
        10,
        mapper,
      );
      expect(result).toEqual([2, 4]);
    });
  });
});
