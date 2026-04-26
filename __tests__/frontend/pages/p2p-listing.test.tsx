/**
 * P2P Markets Page Tests (updated)
 *
 * Tests the market selection grid page. The page fetches open offers
 * from the Diamond P2P repository and computes per-class counts locally.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ===========================================================================
// MODULE MOCKS
// ===========================================================================

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
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

vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: () => ({
    assetClasses: [
      {
        name: 'GOAT',
        assetTypeCount: 3,
        assetCount: 50,
        totalVolume: '0',
        isActive: true,
      },
      {
        name: 'SHEEP',
        assetTypeCount: 1,
        assetCount: 20,
        totalVolume: '0',
        isActive: true,
      },
    ],
    supportedAssetClasses: ['GOAT', 'SHEEP'],
    supportedAssets: [
      { tokenId: '1', assetClass: 'GOAT', name: 'Boer' },
      { tokenId: '2', assetClass: 'GOAT', name: 'Kalahari' },
      { tokenId: '3', assetClass: 'SHEEP', name: 'Merino' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF',
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) => (
    <span data-testid={`icon-${name}`} {...props} />
  );
  return {
    Plus: icon('plus'),
    Package: icon('package'),
    BarChart3: icon('bar-chart'),
    Handshake: icon('handshake'),
    X: icon('x'),
  };
});

vi.mock('@/app/components/ui/glow-button', () => ({
  GlowButton: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import P2PPage from '@/app/(app)/customer/p2p/page';

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

  it('should render the P2P Trading heading', async () => {
    render(<P2PPage />);
    expect(screen.getByText(/P2P Trading/i)).toBeInTheDocument();
  });

  it('should set user role to customer', async () => {
    render(<P2PPage />);
    expect(mockSetCurrentUserRole).toHaveBeenCalledWith('customer');
  });

  it('should show market cards for each asset class', async () => {
    render(<P2PPage />);
    await waitFor(() => {
      expect(screen.getByText('GOAT')).toBeInTheDocument();
      expect(screen.getByText('SHEEP')).toBeInTheDocument();
    });
  });

  it('should display real open offer count from repository', async () => {
    // 2 GOAT offers (tokenId 1 and 2), 1 SHEEP offer (tokenId 3)
    mockGetOpenOffers.mockResolvedValue([
      makeOffer('1', 'a'),
      makeOffer('2', 'b'),
      makeOffer('3', 'c'),
    ]);
    render(<P2PPage />);
    // GOAT should show 2 open offers, SHEEP should show 1
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('should show 0 open offers when repository returns empty', async () => {
    mockGetOpenOffers.mockResolvedValue([]);
    render(<P2PPage />);
    await waitFor(() => {
      // Both classes should show 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should display asset type count per market', async () => {
    render(<P2PPage />);
    await waitFor(() => {
      // GOAT has 3 asset types
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('should link market cards to the market offers page', async () => {
    render(<P2PPage />);
    const goatLink = screen.getByText('GOAT').closest('a');
    expect(goatLink).toHaveAttribute('href', '/customer/p2p/market/GOAT');
  });

  it('should have a Create Offer button', async () => {
    render(<P2PPage />);
    expect(screen.getByText(/Create Offer/i)).toBeInTheDocument();
  });

  it('should navigate to create page on Create Offer click', async () => {
    render(<P2PPage />);
    const btn = screen.getByText(/Create Offer/i);
    btn.click();
    expect(mockPush).toHaveBeenCalledWith('/customer/p2p/create');
  });

  it('should show View Offers hover text for each card', async () => {
    render(<P2PPage />);
    const viewTexts = screen.getAllByText(/View Offers/i);
    expect(viewTexts.length).toBe(2);
  });

  it('should show loading dots while offers are being fetched', async () => {
    // Never resolve
    mockGetOpenOffers.mockReturnValue(new Promise(() => {}));
    render(<P2PPage />);
    // Should show '...' for open offers
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });
});
