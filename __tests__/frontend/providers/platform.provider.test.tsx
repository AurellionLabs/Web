/**
 * PlatformProvider Tests
 *
 * Tests the platform provider's wiring to the repository layer.
 * This catches bugs where:
 * - getAssetByTokenId doesn't delegate to repository
 * - Cache prevents fresh data from loading
 * - Error handling swallows important failures
 * - getClassTokenizableAssets filter logic is wrong
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Asset } from '@/domain/shared';

const mocks = vi.hoisted(() => ({
  getSupportedAssets: vi.fn(),
  getSupportedAssetClasses: vi.fn(),
  getClassAssets: vi.fn(),
  getAssetByTokenId: vi.fn(),
  getVolumeByBaseTokenId: vi.fn(),
  setCurrentChainId: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/app',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    chainId: 84532,
  }),
}));

vi.mock('@/chain-constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/chain-constants')>();
  return {
    ...actual,
    NEXT_PUBLIC_DEFAULT_CHAIN_ID: 84532,
    NEXT_PUBLIC_RPC_URL_42161: 'https://arb1.example',
    NEXT_PUBLIC_RPC_URL_84532: 'https://base-sepolia.example',
    NEXT_PUBLIC_RPC_URL_8453: 'https://base.example',
  };
});

vi.mock('@/infrastructure/config/indexer-endpoint', () => ({
  setCurrentChainId: mocks.setCurrentChainId,
}));

vi.mock('@/infrastructure/repositories/platform-repository', () => ({
  PlatformRepository: vi.fn().mockImplementation(() => ({
    getSupportedAssets: mocks.getSupportedAssets,
    getSupportedAssetClasses: mocks.getSupportedAssetClasses,
    getClassAssets: mocks.getClassAssets,
    getAssetByTokenId: mocks.getAssetByTokenId,
  })),
}));

vi.mock('@/infrastructure/repositories/clob-v2-repository', () => ({
  CLOBV2Repository: vi.fn().mockImplementation(() => ({
    getVolumeByBaseTokenId: mocks.getVolumeByBaseTokenId,
  })),
}));

// Import after mocks
import {
  PlatformProvider,
  usePlatform,
} from '@/app/providers/platform.provider';

/** Test consumer that exposes context values */
function TestConsumer({
  onContext,
}: {
  onContext: (ctx: ReturnType<typeof usePlatform>) => void;
}) {
  const ctx = usePlatform();
  React.useEffect(() => {
    onContext(ctx);
  });
  return (
    <div>
      <span data-testid="loading">{ctx.isLoading ? 'loading' : 'done'}</span>
      <span data-testid="classes">{ctx.supportedAssetClasses.join(',')}</span>
      <span data-testid="error">{ctx.error ?? 'none'}</span>
    </div>
  );
}

describe('PlatformProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSupportedAssets.mockResolvedValue([]);
    mocks.getSupportedAssetClasses.mockResolvedValue([]);
    mocks.getClassAssets.mockResolvedValue([]);
    mocks.getAssetByTokenId.mockResolvedValue(null);
    mocks.getVolumeByBaseTokenId.mockResolvedValue(new Map());
  });

  describe('initial load', () => {
    it('should fetch supported assets and classes on mount', async () => {
      mocks.getSupportedAssets.mockResolvedValue([]);
      mocks.getSupportedAssetClasses.mockResolvedValue(['GOAT', 'SHEEP']);

      const onContext = vi.fn();

      render(
        <PlatformProvider>
          <TestConsumer onContext={onContext} />
        </PlatformProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('classes').textContent).toBe('GOAT,SHEEP');
      });

      expect(mocks.getSupportedAssets).toHaveBeenCalledTimes(1);
      expect(mocks.getSupportedAssetClasses).toHaveBeenCalledTimes(1);
    });

    it('should set error state when fetch fails', async () => {
      mocks.getSupportedAssets.mockRejectedValue(new Error('Indexer offline'));

      render(
        <PlatformProvider>
          <TestConsumer onContext={vi.fn()} />
        </PlatformProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).toContain(
          'Indexer offline',
        );
      });
    });
  });

  describe('getAssetByTokenId', () => {
    it('should delegate to repository', async () => {
      const mockAsset: Asset = {
        assetClass: 'GOAT',
        tokenId: '12345',
        name: 'AUGOAT',
        attributes: [
          { name: 'weight', values: ['S', 'M', 'L'], description: '' },
        ],
      };
      mocks.getAssetByTokenId.mockResolvedValue(mockAsset);

      let capturedCtx: ReturnType<typeof usePlatform> | null = null;
      render(
        <PlatformProvider>
          <TestConsumer onContext={(ctx) => (capturedCtx = ctx)} />
        </PlatformProvider>,
      );

      await waitFor(() => {
        expect(capturedCtx).not.toBeNull();
      });

      const result = await capturedCtx!.getAssetByTokenId('12345');

      expect(mocks.getAssetByTokenId).toHaveBeenCalledWith('12345');
      expect(result).toEqual(mockAsset);
      expect(result!.attributes).toHaveLength(1);
      expect(result!.attributes[0].name).toBe('weight');
    });

    it('should return null on repository error (not throw)', async () => {
      mocks.getAssetByTokenId.mockRejectedValue(new Error('Pinata down'));

      let capturedCtx: ReturnType<typeof usePlatform> | null = null;
      render(
        <PlatformProvider>
          <TestConsumer onContext={(ctx) => (capturedCtx = ctx)} />
        </PlatformProvider>,
      );

      await waitFor(() => {
        expect(capturedCtx).not.toBeNull();
      });

      const result = await capturedCtx!.getAssetByTokenId('99999');
      expect(result).toBeNull();
    });

    it('should hydrate past cached assets with empty attributes', async () => {
      mocks.getSupportedAssets.mockResolvedValue([
        {
          assetClass: 'GOAT',
          tokenId: '12345',
          name: 'Cached Goat',
          attributes: [],
        },
      ]);

      const hydratedAsset: Asset = {
        assetClass: 'GOAT',
        tokenId: '12345',
        name: 'Hydrated Goat',
        attributes: [
          {
            name: 'weight',
            values: ['M'],
            description: 'Weight',
          },
        ],
      };
      mocks.getAssetByTokenId.mockResolvedValue(hydratedAsset);

      let capturedCtx: ReturnType<typeof usePlatform> | null = null;
      render(
        <PlatformProvider>
          <TestConsumer onContext={(ctx) => (capturedCtx = ctx)} />
        </PlatformProvider>,
      );

      await waitFor(() => {
        expect(capturedCtx).not.toBeNull();
      });

      const result = await capturedCtx!.getAssetByTokenId('12345');

      expect(mocks.getAssetByTokenId).toHaveBeenCalledWith('12345');
      expect(result?.name).toBe('Hydrated Goat');
      expect(result?.attributes).toHaveLength(1);
      expect(result?.attributes[0].name).toBe('weight');
    });
  });

  describe('getClassTokenizableAssets', () => {
    it('should filter to assets with multiple attribute values', async () => {
      const assets: Asset[] = [
        {
          assetClass: 'GOAT',
          tokenId: '1',
          name: 'Tokenizable',
          attributes: [
            { name: 'weight', values: ['S', 'M', 'L'], description: '' },
          ],
        },
        {
          assetClass: 'GOAT',
          tokenId: '2',
          name: 'Not Tokenizable',
          attributes: [
            { name: 'weight', values: ['S'], description: '' }, // Only 1 value
          ],
        },
        {
          assetClass: 'GOAT',
          tokenId: '3',
          name: 'No Attrs',
          attributes: [],
        },
      ];
      mocks.getClassAssets.mockResolvedValue(assets);

      let capturedCtx: ReturnType<typeof usePlatform> | null = null;
      render(
        <PlatformProvider>
          <TestConsumer onContext={(ctx) => (capturedCtx = ctx)} />
        </PlatformProvider>,
      );

      await waitFor(() => {
        expect(capturedCtx).not.toBeNull();
      });

      const result = await capturedCtx!.getClassTokenizableAssets('GOAT');

      // Only the first asset should pass (3 values)
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Tokenizable');
    });
  });

  describe('getClassAssets caching', () => {
    it('should cache results on first call', async () => {
      const assets: Asset[] = [
        { assetClass: 'GOAT', tokenId: '1', name: 'AUGOAT', attributes: [] },
      ];
      mocks.getClassAssets.mockResolvedValue(assets);

      let capturedCtx: ReturnType<typeof usePlatform> | null = null;
      render(
        <PlatformProvider>
          <TestConsumer onContext={(ctx) => (capturedCtx = ctx)} />
        </PlatformProvider>,
      );

      await waitFor(() => {
        expect(capturedCtx).not.toBeNull();
      });

      // First call -> hits repository
      await capturedCtx!.getClassAssets('GOAT');
      expect(mocks.getClassAssets).toHaveBeenCalledTimes(1);

      // Second call -> should use cache
      await capturedCtx!.getClassAssets('GOAT');
      expect(mocks.getClassAssets).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should serve fresh data after invalidateCache', async () => {
      const assets1: Asset[] = [
        { assetClass: 'GOAT', tokenId: '1', name: 'Old', attributes: [] },
      ];
      const assets2: Asset[] = [
        { assetClass: 'GOAT', tokenId: '1', name: 'New', attributes: [] },
      ];
      mocks.getClassAssets
        .mockResolvedValueOnce(assets1)
        .mockResolvedValueOnce(assets2);

      let capturedCtx: ReturnType<typeof usePlatform> | null = null;
      render(
        <PlatformProvider>
          <TestConsumer onContext={(ctx) => (capturedCtx = ctx)} />
        </PlatformProvider>,
      );

      await waitFor(() => {
        expect(capturedCtx).not.toBeNull();
      });

      const result1 = await capturedCtx!.getClassAssets('GOAT');
      expect(result1[0].name).toBe('Old');

      // Invalidate cache
      capturedCtx!.invalidateCache();

      const result2 = await capturedCtx!.getClassAssets('GOAT');
      expect(result2[0].name).toBe('New');
      expect(mocks.getClassAssets).toHaveBeenCalledTimes(2);
    });
  });

  describe('usePlatform hook', () => {
    it('should throw when used outside provider', () => {
      // Suppress console.error from React error boundary
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        function BadConsumer() {
          usePlatform();
          return null;
        }
        render(<BadConsumer />);
      }).toThrow('usePlatform must be used within a PlatformProvider');

      spy.mockRestore();
    });
  });
});
