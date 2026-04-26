/**
 * P2P Markets Page Tests
 *
 * Tests the market selection grid that users see before viewing P2P offers.
 * Like the CLOB trading page, users pick a market (asset class) first,
 * then see offers filtered to that market.
 *
 * Open offer counts are fetched live from the Diamond P2P repository.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ===========================================================================
// MODULE MOCKS
// ===========================================================================

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockSetCurrentUserRole = vi.fn();
vi.mock('@/app/providers/main.provider', () => ({
  useMainProvider: () => ({
    setCurrentUserRole: mockSetCurrentUserRole,
    connected: true,
  }),
}));

// P2P repository mock – stable reference to avoid infinite re-render loops
const mockGetOpenOffers = vi.fn();
const mockP2PRepository = { getOpenOffers: mockGetOpenOffers };
vi.mock('@/app/providers/diamond.provider', () => ({
  useDiamond: () => ({
    p2pRepository: mockP2PRepository,
    initialized: true,
  }),
}));

// Platform mock with asset classes
const mockAssetClasses = [
  {
    name: 'GOAT',
    assetTypeCount: 3,
    assetCount: 50,
    totalVolume: '0',
    isActive: true,
  },
  {
    name: 'SHEEP',
    assetTypeCount: 2,
    assetCount: 30,
    totalVolume: '0',
    isActive: true,
  },
];

vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: () => ({
    assetClasses: mockAssetClasses,
    supportedAssetClasses: ['GOAT', 'SHEEP'],
    supportedAssets: [
      { tokenId: '100', assetClass: 'GOAT', name: 'Boer' },
      { tokenId: '200', assetClass: 'GOAT', name: 'Kalahari' },
      { tokenId: '300', assetClass: 'SHEEP', name: 'Merino' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF',
    isConnected: true,
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) => (
    <span data-testid={`icon-${name}`} {...props} />
  );
  return {
    ArrowLeft: icon('arrow-left'),
    ArrowRight: icon('arrow-right'),
    Package: icon('package'),
    TrendingUp: icon('trending-up'),
    BarChart3: icon('bar-chart'),
    ShoppingCart: icon('cart'),
    Tag: icon('tag'),
    Plus: icon('plus'),
    RefreshCw: icon('refresh'),
    Filter: icon('filter'),
    Handshake: icon('handshake'),
    Activity: icon('activity'),
    X: icon('x'),
  };
});

vi.mock('@/app/components/ui/glass-card', () => ({
  GlassCard: ({ children, ...props }: any) => (
    <div data-testid="glass-card" {...props}>
      {children}
    </div>
  ),
  GlassCardHeader: ({ children }: any) => <div>{children}</div>,
  GlassCardTitle: ({ children }: any) => <h3>{children}</h3>,
  GlassCardDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/app/components/ui/glow-button', () => ({
  GlowButton: ({ children, onClick, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid="glow-button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import P2PMarketsPage from '@/app/(app)/customer/p2p/page';

// ===========================================================================
// HELPERS
// ===========================================================================

/** Create a minimal P2POffer mock */
function makeOffer(tokenId: string, id = 'offer-1') {
  return {
    id,
    creator: '0xAAA',
    targetCounterparty: null,
    token: '0xTOKEN',
    tokenId,
    quantity: BigInt(10),
    price: BigInt(100),
    txFee: BigInt(2),
    isSellerInitiated: true,
    status: 0,
    buyer: '',
    seller: '0xAAA',
    expiresAt: BigInt(9999999999),
    createdAt: BigInt(100),
    metadata: {},
  };
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('P2P Markets Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOpenOffers.mockResolvedValue([]);
  });

  it('should render the market selection grid', async () => {
    render(<P2PMarketsPage />);
    await waitFor(() => {
      expect(screen.getByText(/P2P Trading/i)).toBeInTheDocument();
    });
  });

  it('should show asset class cards for each market', async () => {
    render(<P2PMarketsPage />);
    await waitFor(() => {
      expect(screen.getByText('GOAT')).toBeInTheDocument();
      expect(screen.getByText('SHEEP')).toBeInTheDocument();
    });
  });

  it('should display open offer count from live repository data', async () => {
    // 4 GOAT offers (tokenId 100 x3 + 200 x1), 1 SHEEP offer (tokenId 300 x1)
    mockGetOpenOffers.mockResolvedValue([
      makeOffer('100', 'a'),
      makeOffer('100', 'b'),
      makeOffer('100', 'c'),
      makeOffer('200', 'd'),
      makeOffer('300', 'e'),
    ]);
    render(<P2PMarketsPage />);
    await waitFor(() => {
      // GOAT: tokenId 100 (x3) + 200 (x1) = 4
      expect(screen.getByText('4')).toBeInTheDocument();
      // SHEEP: tokenId 300 (x1) = 1 — but assetTypeCount for SHEEP is also 2,
      // so we check for 4 which is unique to GOAT's offer count
    });
  });

  it('should display asset type count per market', async () => {
    render(<P2PMarketsPage />);
    await waitFor(() => {
      // GOAT has 3 asset types, SHEEP has 2
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('should have a Create Offer button', async () => {
    render(<P2PMarketsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Create Offer/i)).toBeInTheDocument();
    });
  });

  it('should link each market card to the filtered offers page', async () => {
    render(<P2PMarketsPage />);
    await waitFor(() => {
      const goatLink = screen.getByText('GOAT').closest('a');
      expect(goatLink).toHaveAttribute('href', '/customer/p2p/market/GOAT');
    });
  });
});
