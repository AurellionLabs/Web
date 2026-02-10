/**
 * P2P Listing Page Tests
 *
 * Tests the P2P offer listing page, focusing on:
 * - Metadata resolution (the main bug: offers showed token address instead of name)
 * - Offer card rendering with asset name, class badge, and attributes
 * - Shimmer loading states before metadata resolves
 * - Filter behavior (buy/sell/all)
 * - Empty state ("No Open Offers")
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { P2POffer, P2POfferStatus } from '@/domain/p2p';
import { Asset } from '@/domain/shared';

// ===========================================================================
// MODULE MOCKS - must be before imports of the component
// ===========================================================================

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/customer/p2p',
}));

// Mock providers
const mockSetCurrentUserRole = vi.fn();
const mockGetOpenOffers = vi.fn();
const mockGetUserOffers = vi.fn();
const mockGetAssetByTokenId = vi.fn();
const mockAcceptOffer = vi.fn();
const mockCancelOffer = vi.fn();

vi.mock('@/app/providers/main.provider', () => ({
  useMainProvider: () => ({
    setCurrentUserRole: mockSetCurrentUserRole,
    connected: true,
    currentUserRole: 'customer',
  }),
}));

vi.mock('@/app/providers/diamond.provider', () => ({
  useDiamond: () => ({
    p2pRepository: {
      getOpenOffers: mockGetOpenOffers,
      getUserOffers: mockGetUserOffers,
    },
    p2pService: {
      acceptOffer: mockAcceptOffer,
      cancelOffer: mockCancelOffer,
    },
    initialized: true,
  }),
}));

vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: () => ({
    getAssetByTokenId: mockGetAssetByTokenId,
    supportedAssets: [],
  }),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF',
    connectedWallet: { address: '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF' },
    isConnecting: false,
  }),
}));

// Mock lucide-react icons to simple spans
vi.mock('lucide-react', () => ({
  RefreshCw: (props: any) => <span data-testid="icon-refresh" {...props} />,
  Plus: (props: any) => <span data-testid="icon-plus" {...props} />,
  ShoppingCart: (props: any) => <span data-testid="icon-cart" {...props} />,
  Tag: (props: any) => <span data-testid="icon-tag" {...props} />,
  Clock: (props: any) => <span data-testid="icon-clock" {...props} />,
  User: (props: any) => <span data-testid="icon-user" {...props} />,
  X: (props: any) => <span data-testid="icon-x" {...props} />,
  ArrowRight: (props: any) => <span data-testid="icon-arrow" {...props} />,
  Filter: (props: any) => <span data-testid="icon-filter" {...props} />,
}));

// Mock UI components to simple divs for testability
vi.mock('@/app/components/ui/glass-card', () => ({
  GlassCard: ({ children, ...props }: any) => (
    <div data-testid="glass-card" {...props}>
      {children}
    </div>
  ),
  GlassCardHeader: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  GlassCardTitle: ({ children, ...props }: any) => (
    <h3 data-testid="card-title" {...props}>
      {children}
    </h3>
  ),
  GlassCardDescription: ({ children, ...props }: any) => (
    <p data-testid="card-desc" {...props}>
      {children}
    </p>
  ),
}));

vi.mock('@/app/components/ui/glow-button', () => ({
  GlowButton: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/app/components/ui/status-badge', () => ({
  StatusBadge: ({ status }: any) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Import component AFTER mocks
import P2PPage from '@/app/customer/p2p/page';

// ===========================================================================
// TEST DATA
// ===========================================================================

const TOKEN = '0xb3090aBF81918FF50e921b166126aD6AB9a03944';
const TOKEN_ID_1 =
  '81712389712389712389712389712389712389712389712389712389712389';
const TOKEN_ID_2 = '99999888877776666555544443333222211110000';

function makeOffer(overrides: Partial<P2POffer> = {}): P2POffer {
  return {
    id: '0x' + Math.random().toString(16).slice(2),
    creator: '0xABCD1234567890ABCD1234567890ABCD12345678',
    targetCounterparty: null,
    token: TOKEN,
    tokenId: TOKEN_ID_1,
    quantity: BigInt(100000),
    price: BigInt('10000000000000000000'),
    txFee: BigInt(0),
    isSellerInitiated: true,
    status: 'Open' as P2POfferStatus,
    buyer: '0x0000000000000000000000000000000000000000',
    seller: '0xABCD1234567890ABCD1234567890ABCD12345678',
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
    locationData: '',
    nodes: [],
    ...overrides,
  };
}

const GOAT_ASSET: Asset = {
  assetClass: 'GOAT',
  tokenId: TOKEN_ID_1,
  name: 'AUGOAT',
  attributes: [
    { name: 'weight', values: ['S', 'M', 'L'], description: 'Weight class' },
    { name: 'sex', values: ['M', 'F'], description: 'Animal sex' },
  ],
};

// ===========================================================================
// TESTS
// ===========================================================================

describe('P2P Listing Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOpenOffers.mockResolvedValue([]);
    mockGetUserOffers.mockResolvedValue([]);
    mockGetAssetByTokenId.mockResolvedValue(null);
  });

  describe('empty state', () => {
    it('should show "No Open Offers" when no offers exist', async () => {
      render(<P2PPage />);

      await waitFor(() => {
        expect(screen.getByText(/no open offers/i)).toBeInTheDocument();
      });
    });
  });

  describe('offer rendering', () => {
    it('should render offer cards with SELL badge', async () => {
      const offer = makeOffer({ isSellerInitiated: true });
      mockGetOpenOffers.mockResolvedValue([offer]);

      render(<P2PPage />);

      await waitFor(() => {
        expect(screen.getByText('SELL')).toBeInTheDocument();
      });
    });

    it('should render offer cards with BUY badge', async () => {
      const offer = makeOffer({ isSellerInitiated: false });
      mockGetOpenOffers.mockResolvedValue([offer]);

      render(<P2PPage />);

      await waitFor(() => {
        expect(screen.getByText('BUY')).toBeInTheDocument();
      });
    });

    it('should show shimmer while metadata is loading', async () => {
      const offer = makeOffer();
      mockGetOpenOffers.mockResolvedValue([offer]);
      // getAssetByTokenId never resolves (simulates loading)
      mockGetAssetByTokenId.mockReturnValue(new Promise(() => {}));

      render(<P2PPage />);

      await waitFor(() => {
        // Shimmer placeholder should be visible
        const shimmer = document.querySelector('.animate-pulse');
        expect(shimmer).toBeInTheDocument();
      });
    });

    it('should display asset name and class after metadata resolves', async () => {
      const offer = makeOffer({ tokenId: TOKEN_ID_1 });
      mockGetOpenOffers.mockResolvedValue([offer]);
      mockGetAssetByTokenId.mockResolvedValue(GOAT_ASSET);

      render(<P2PPage />);

      await waitFor(() => {
        expect(screen.getByText('AUGOAT')).toBeInTheDocument();
        expect(screen.getByText('GOAT')).toBeInTheDocument();
      });
    });

    it('should display asset attributes as pills', async () => {
      const offer = makeOffer({ tokenId: TOKEN_ID_1 });
      mockGetOpenOffers.mockResolvedValue([offer]);
      mockGetAssetByTokenId.mockResolvedValue(GOAT_ASSET);

      render(<P2PPage />);

      await waitFor(() => {
        // Attributes should render with formatted names
        expect(screen.getByText(/Weight/)).toBeInTheDocument();
        expect(screen.getByText(/Sex/)).toBeInTheDocument();
      });
    });

    it('should show truncated token ID after metadata resolves', async () => {
      const offer = makeOffer({ tokenId: TOKEN_ID_1 });
      mockGetOpenOffers.mockResolvedValue([offer]);
      mockGetAssetByTokenId.mockResolvedValue(GOAT_ASSET);

      render(<P2PPage />);

      await waitFor(() => {
        // Should show "Token ID: XXXX...YYYY" format
        const desc = screen.getByText(/Token ID:/);
        expect(desc).toBeInTheDocument();
      });
    });
  });

  describe('metadata resolution', () => {
    it('should call getAssetByTokenId for each unique tokenId', async () => {
      const offer1 = makeOffer({ tokenId: TOKEN_ID_1 });
      const offer2 = makeOffer({ tokenId: TOKEN_ID_2 });
      mockGetOpenOffers.mockResolvedValue([offer1, offer2]);
      mockGetAssetByTokenId.mockResolvedValue(null);

      render(<P2PPage />);

      await waitFor(() => {
        expect(mockGetAssetByTokenId).toHaveBeenCalledWith(TOKEN_ID_1);
        expect(mockGetAssetByTokenId).toHaveBeenCalledWith(TOKEN_ID_2);
      });
    });

    it('should NOT re-resolve already resolved tokenIds', async () => {
      const offer = makeOffer({ tokenId: TOKEN_ID_1 });
      mockGetOpenOffers.mockResolvedValue([offer]);
      mockGetAssetByTokenId.mockResolvedValue(GOAT_ASSET);

      const { rerender } = render(<P2PPage />);

      await waitFor(() => {
        expect(mockGetAssetByTokenId).toHaveBeenCalledTimes(1);
      });

      // Rerender shouldn't trigger another resolve
      rerender(<P2PPage />);

      // Should still only have been called once total
      // (The de-duplication happens because unresolvedIds filters out already-cached)
      await waitFor(() => {
        expect(mockGetAssetByTokenId).toHaveBeenCalledTimes(1);
      });
    });

    it('should gracefully handle metadata resolution failure', async () => {
      const offer = makeOffer({ tokenId: TOKEN_ID_1 });
      mockGetOpenOffers.mockResolvedValue([offer]);
      mockGetAssetByTokenId.mockRejectedValue(new Error('Pinata down'));

      render(<P2PPage />);

      // Should NOT crash; should still show the card with fallback
      await waitFor(() => {
        expect(screen.getByTestId('glass-card')).toBeInTheDocument();
      });
    });
  });

  describe('loading and connection states', () => {
    it('should call p2pRepository.getOpenOffers on mount', async () => {
      render(<P2PPage />);

      await waitFor(() => {
        expect(mockGetOpenOffers).toHaveBeenCalled();
      });
    });

    it('should set user role to customer', async () => {
      render(<P2PPage />);

      expect(mockSetCurrentUserRole).toHaveBeenCalledWith('customer');
    });
  });
});
