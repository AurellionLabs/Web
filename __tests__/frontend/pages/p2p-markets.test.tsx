/**
 * P2P Markets Page Tests
 *
 * Tests the market selection grid that users see before viewing P2P offers.
 * Like the CLOB trading page, users pick a market (asset class) first,
 * then see offers filtered to that market.
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

// P2P repository mock
const mockGetOpenOffers = vi.fn();
vi.mock('@/app/providers/diamond.provider', () => ({
  useDiamond: () => ({
    p2pRepository: {
      getOpenOffers: mockGetOpenOffers,
    },
    initialized: true,
  }),
}));

// Platform mock with asset classes and P2P volume
const mockAssetClasses = [
  {
    name: 'GOAT',
    assetTypeCount: 3,
    assetCount: 50,
    totalVolume: '0',
    p2pVolume: '65000000000000000000', // 65 USD
    p2pTradeCount: 12,
    p2pOpenOfferCount: 5,
    isActive: true,
  },
  {
    name: 'SHEEP',
    assetTypeCount: 2,
    assetCount: 30,
    totalVolume: '0',
    p2pVolume: '0',
    p2pTradeCount: 0,
    p2pOpenOfferCount: 0,
    isActive: true,
  },
];

vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: () => ({
    assetClasses: mockAssetClasses,
    supportedAssetClasses: ['GOAT', 'SHEEP'],
    supportedAssets: [],
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

import P2PMarketsPage from '@/app/customer/p2p/page';

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

  it('should display P2P volume for each market', async () => {
    render(<P2PMarketsPage />);
    await waitFor(() => {
      // GOAT has 65 USD volume (65e18 wei / 1e18 = 65)
      expect(screen.getByText(/65/)).toBeInTheDocument();
    });
  });

  it('should display open offer count per market', async () => {
    render(<P2PMarketsPage />);
    await waitFor(() => {
      // GOAT has 5 open offers
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  it('should display trade count per market', async () => {
    render(<P2PMarketsPage />);
    await waitFor(() => {
      // GOAT has 12 trades
      expect(screen.getByText('12')).toBeInTheDocument();
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
      // Each market card should be a link to /customer/p2p/market/[className]
      const goatLink = screen.getByText('GOAT').closest('a');
      expect(goatLink).toHaveAttribute('href', '/customer/p2p/market/GOAT');
    });
  });
});
