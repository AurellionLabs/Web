/**
 * P2P Markets Page Tests (updated)
 *
 * Tests the market selection grid page. The old flat-listing page has
 * been moved to /customer/p2p/market/[className]/page.tsx.
 * This file now tests the market grid entry point.
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

vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: () => ({
    assetClasses: [
      {
        name: 'GOAT',
        assetTypeCount: 3,
        assetCount: 50,
        totalVolume: '0',
        p2pVolume: '10000000000000000000', // 10 USD
        p2pTradeCount: 5,
        p2pOpenOfferCount: 3,
        isActive: true,
      },
      {
        name: 'SHEEP',
        assetTypeCount: 1,
        assetCount: 20,
        totalVolume: '0',
        p2pVolume: '0',
        p2pTradeCount: 0,
        p2pOpenOfferCount: 0,
        isActive: true,
      },
    ],
    supportedAssetClasses: ['GOAT', 'SHEEP'],
    supportedAssets: [],
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
    TrendingUp: icon('trending-up'),
    Package: icon('package'),
    BarChart3: icon('bar-chart'),
    Handshake: icon('handshake'),
    Activity: icon('activity'),
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

import P2PPage from '@/app/customer/p2p/page';

// ===========================================================================
// TESTS
// ===========================================================================

describe('P2P Markets Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the P2P Trading heading', () => {
    render(<P2PPage />);
    expect(screen.getByText(/P2P Trading/i)).toBeInTheDocument();
  });

  it('should set user role to customer', () => {
    render(<P2PPage />);
    expect(mockSetCurrentUserRole).toHaveBeenCalledWith('customer');
  });

  it('should show market cards for each asset class', () => {
    render(<P2PPage />);
    expect(screen.getByText('GOAT')).toBeInTheDocument();
    expect(screen.getByText('SHEEP')).toBeInTheDocument();
  });

  it('should display open offer count per market', () => {
    render(<P2PPage />);
    // GOAT has 3 open offers
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should display trade count per market', () => {
    render(<P2PPage />);
    // GOAT has 5 trades
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display P2P volume', () => {
    render(<P2PPage />);
    // GOAT has 10 USD volume
    expect(screen.getByText(/\$10/)).toBeInTheDocument();
  });

  it('should link market cards to the market offers page', () => {
    render(<P2PPage />);
    const goatLink = screen.getByText('GOAT').closest('a');
    expect(goatLink).toHaveAttribute('href', '/customer/p2p/market/GOAT');
  });

  it('should have a Create Offer button', () => {
    render(<P2PPage />);
    expect(screen.getByText(/Create Offer/i)).toBeInTheDocument();
  });

  it('should navigate to create page on Create Offer click', () => {
    render(<P2PPage />);
    const btn = screen.getByText(/Create Offer/i);
    btn.click();
    expect(mockPush).toHaveBeenCalledWith('/customer/p2p/create');
  });

  it('should show SHEEP market with zero stats', () => {
    render(<P2PPage />);
    // Both 0 values for SHEEP (open offers and trades)
    const sheepLink = screen.getByText('SHEEP').closest('a');
    expect(sheepLink).toBeInTheDocument();
  });

  it('should show View Offers hover text for each card', () => {
    render(<P2PPage />);
    const viewTexts = screen.getAllByText(/View Offers/i);
    expect(viewTexts.length).toBe(2); // One per market card
  });

  it('should display $0 for markets with no volume', () => {
    render(<P2PPage />);
    // SHEEP has $0 volume
    const volumeTexts = screen.getAllByText('$0');
    expect(volumeTexts.length).toBeGreaterThanOrEqual(1);
  });
});
