/**
 * P2P Market Offers Page Tests
 *
 * Tests the filtered offers page for a specific market (asset class).
 * Users navigate here from the P2P market selection grid.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { P2POfferStatus } from '@/domain/p2p';

// ===========================================================================
// MODULE MOCKS
// ===========================================================================

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: mockBack,
  }),
  useParams: () => ({ className: 'GOAT' }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockSetCurrentUserRole = vi.fn();
vi.mock('@/app/providers/main.provider', () => ({
  useMainProvider: () => ({
    setCurrentUserRole: mockSetCurrentUserRole,
    connected: true,
  }),
}));

const mockGetOpenOffers = vi.fn();
const mockGetUserOffers = vi.fn();
const mockAcceptOffer = vi.fn();
const mockCancelOffer = vi.fn();

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

const mockGetAssetByTokenId = vi.fn();
vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: () => ({
    getAssetByTokenId: mockGetAssetByTokenId,
    supportedAssets: [
      {
        name: 'AUGOAT',
        assetClass: 'GOAT',
        tokenId: '100',
        attributes: [],
      },
    ],
    supportedAssetClasses: ['GOAT', 'SHEEP'],
  }),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF',
    isConnected: true,
  }),
}));

vi.mock('@/chain-constants', () => ({
  NEXT_PUBLIC_AURA_ASSET_ADDRESS: '0xb3090aBF81918FF50e921b166126aD6AB9a03944',
}));

// Mock lucide-react
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
    AlertCircle: icon('alert'),
    Clock: icon('clock'),
    User: icon('user'),
    ExternalLink: icon('external-link'),
    Handshake: icon('handshake'),
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

vi.mock('@/app/components/ui/status-badge', () => ({
  StatusBadge: ({ status }: any) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import P2PMarketOffersPage from '@/app/(app)/customer/p2p/market/[className]/page';

// ===========================================================================
// TEST DATA
// ===========================================================================

const GOAT_OFFERS = [
  {
    id: '0x01',
    creator: '0x1111111111111111111111111111111111111111',
    targetCounterparty: null,
    token: '0xb3090aBF81918FF50e921b166126aD6AB9a03944',
    tokenId: '100',
    quantity: 10n,
    price: 5000000000000000000n, // 5 USD
    txFee: 100000000000000000n,
    isSellerInitiated: true,
    status: P2POfferStatus.CREATED,
    buyer: '0x0000000000000000000000000000000000000000',
    seller: '0x1111111111111111111111111111111111111111',
    createdAt: 0,
    expiresAt: 0,
    nodes: [],
  },
];

const SHEEP_OFFERS = [
  {
    id: '0x02',
    creator: '0x2222222222222222222222222222222222222222',
    targetCounterparty: null,
    token: '0xb3090aBF81918FF50e921b166126aD6AB9a03944',
    tokenId: '200', // Different token ID (SHEEP class)
    quantity: 5n,
    price: 3000000000000000000n,
    txFee: 60000000000000000n,
    isSellerInitiated: false,
    status: P2POfferStatus.CREATED,
    buyer: '0x2222222222222222222222222222222222222222',
    seller: '0x0000000000000000000000000000000000000000',
    createdAt: 0,
    expiresAt: 0,
    nodes: [],
  },
];

// ===========================================================================
// TESTS
// ===========================================================================

describe('P2P Market Offers Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Return offers for the selected market
    mockGetOpenOffers.mockResolvedValue([...GOAT_OFFERS, ...SHEEP_OFFERS]);
    mockGetUserOffers.mockResolvedValue([]);
    mockGetAssetByTokenId.mockResolvedValue(null);
  });

  it('should show the market name in the page header', async () => {
    render(<P2PMarketOffersPage />);
    await waitFor(() => {
      expect(screen.getByText(/GOAT P2P Market/)).toBeInTheDocument();
    });
  });

  it('should show a back button to return to market selection', async () => {
    render(<P2PMarketOffersPage />);
    await waitFor(() => {
      expect(screen.getByText(/Back/i)).toBeInTheDocument();
    });
  });

  it('should only show offers for the selected market class', async () => {
    render(<P2PMarketOffersPage />);
    // The page filters offers by the className from the URL params
    // With supported assets mapping tokenId 100 -> GOAT, and tokenId 200 -> SHEEP
    // Only GOAT offers (tokenId 100) should be displayed
    await waitFor(() => {
      // Should show the GOAT offer
      expect(screen.getByText(/SELL/i)).toBeInTheDocument();
    });
  });

  it('should have a Create Offer button linking to the create page', async () => {
    render(<P2PMarketOffersPage />);
    await waitFor(() => {
      expect(screen.getByText(/Create Offer/i)).toBeInTheDocument();
    });
  });

  it('should show buy/sell filter tabs', async () => {
    render(<P2PMarketOffersPage />);
    await waitFor(() => {
      expect(screen.getByText(/All Offers/i)).toBeInTheDocument();
    });
  });

  it('should hide offers whose expiresAt is already in the past', async () => {
    const expiredOpenOffer = {
      ...GOAT_OFFERS[0],
      id: '0xExpiredByTime',
      status: P2POfferStatus.CREATED, // still marked open
      expiresAt: Math.floor(Date.now() / 1000) - 3600,
    };

    mockGetOpenOffers.mockResolvedValue([expiredOpenOffer]);
    mockGetUserOffers.mockResolvedValue([expiredOpenOffer]);

    render(<P2PMarketOffersPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/No Open Offers/i).length).toBeGreaterThan(0);
    });
  });
});
