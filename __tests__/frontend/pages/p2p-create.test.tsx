/**
 * P2P Create Offer Page Tests
 *
 * Tests the multi-step offer creation wizard, focusing on:
 * - Attribute selection (the main bug: weight/sex not selectable)
 * - canProceed validation requiring attribute selection
 * - Form data resets when asset class changes
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Asset } from '@/domain/shared';

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
const mockGetClassTokenizableAssets = vi.fn();
const mockCreateOffer = vi.fn();

vi.mock('@/app/providers/main.provider', () => ({
  useMainProvider: () => ({
    setCurrentUserRole: mockSetCurrentUserRole,
    connected: true,
  }),
}));

vi.mock('@/app/providers/diamond.provider', () => ({
  useDiamond: () => ({
    p2pService: {
      createOffer: mockCreateOffer,
    },
    initialized: true,
  }),
}));

vi.mock('@/app/providers/platform.provider', () => ({
  usePlatform: () => ({
    supportedAssetClasses: ['GOAT', 'SHEEP'],
    getClassTokenizableAssets: mockGetClassTokenizableAssets,
  }),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF',
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
    ShoppingCart: icon('cart'),
    Tag: icon('tag'),
    Check: icon('check'),
    RefreshCw: icon('refresh'),
    AlertCircle: icon('alert'),
    Clock: icon('clock'),
    User: icon('user'),
    Truck: icon('truck'),
    Globe: icon('globe'),
    Wallet: icon('wallet'),
  };
});

// Mock UI
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

vi.mock('@/app/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import CreateP2POfferPage from '@/app/customer/p2p/create/page';

// ===========================================================================
// TEST DATA
// ===========================================================================

const GOAT_ASSETS: Asset[] = [
  {
    assetClass: 'GOAT',
    tokenId: '12345',
    name: 'AUGOAT Standard',
    attributes: [
      { name: 'weight', values: ['S', 'M', 'L'], description: 'Weight class' },
      { name: 'sex', values: ['M', 'F'], description: 'Sex' },
    ],
  },
  {
    assetClass: 'GOAT',
    tokenId: '67890',
    name: 'AUGOAT Premium',
    attributes: [
      { name: 'weight', values: ['XL', 'XXL'], description: 'Weight class' },
    ],
  },
];

const NO_ATTR_ASSET: Asset[] = [
  {
    assetClass: 'SHEEP',
    tokenId: '99999',
    name: 'AUSHEEP',
    attributes: [],
  },
];

// ===========================================================================
// HELPERS
// ===========================================================================

/** Navigate from type step to asset step */
async function goToAssetStep() {
  fireEvent.click(screen.getByText(/I want to Sell/i));
  fireEvent.click(screen.getByText(/Next/i));
  await waitFor(() => {
    expect(screen.getByText(/Select Asset/)).toBeInTheDocument();
  });
}

/** Select asset class via the <select> dropdown */
function selectAssetClass(className: string) {
  const selects = document.querySelectorAll('select');
  // First select is the asset class dropdown
  const classSelect = selects[0];
  fireEvent.change(classSelect, { target: { value: className } });
}

/** Select a specific asset via the <select> dropdown (second select on the page) */
function selectAsset(tokenId: string) {
  const selects = document.querySelectorAll('select');
  // Second select is the asset dropdown
  const assetSelect = selects[1];
  fireEvent.change(assetSelect, { target: { value: tokenId } });
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('Create P2P Offer Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassTokenizableAssets.mockResolvedValue([]);
  });

  describe('step 1: offer type', () => {
    it('should start at offer type step', () => {
      render(<CreateP2POfferPage />);
      expect(
        screen.getByText(/what would you like to do/i),
      ).toBeInTheDocument();
    });

    it('should show buy and sell options', () => {
      render(<CreateP2POfferPage />);
      expect(screen.getByText(/I want to Buy/i)).toBeInTheDocument();
      expect(screen.getByText(/I want to Sell/i)).toBeInTheDocument();
    });

    it('should advance to asset step after selecting type and clicking Next', async () => {
      render(<CreateP2POfferPage />);
      fireEvent.click(screen.getByText(/I want to Sell/i));
      fireEvent.click(screen.getByText(/Next/i));

      await waitFor(() => {
        expect(screen.getByText(/Select Asset/)).toBeInTheDocument();
      });
    });
  });

  describe('step 2: asset selection and attributes', () => {
    it('should show asset class dropdown with supported classes', async () => {
      render(<CreateP2POfferPage />);
      await goToAssetStep();

      // GOAT and SHEEP should be options in the select
      const options = document.querySelectorAll('select option');
      const optionTexts = Array.from(options).map((o) => o.textContent);
      expect(optionTexts).toContain('GOAT');
      expect(optionTexts).toContain('SHEEP');
    });

    it('should load assets when class is selected', async () => {
      mockGetClassTokenizableAssets.mockResolvedValue(GOAT_ASSETS);

      render(<CreateP2POfferPage />);
      await goToAssetStep();

      selectAssetClass('GOAT');

      await waitFor(() => {
        expect(mockGetClassTokenizableAssets).toHaveBeenCalledWith('GOAT');
      });
    });

    it('should display attribute dropdowns when asset with attributes is selected', async () => {
      mockGetClassTokenizableAssets.mockResolvedValue(GOAT_ASSETS);

      render(<CreateP2POfferPage />);
      await goToAssetStep();

      selectAssetClass('GOAT');

      // Wait for assets to load - the AUGOAT Standard option should appear
      await waitFor(() => {
        const allOptions = document.querySelectorAll('select option');
        const texts = Array.from(allOptions).map((o) => o.textContent);
        expect(texts).toContain('AUGOAT Standard');
      });

      // Select specific asset
      selectAsset('12345');

      // First verify selectedAsset is set (Token ID text appears)
      await waitFor(() => {
        expect(screen.getByText(/Token ID: 12345/)).toBeInTheDocument();
      });

      // Then verify attribute section
      await waitFor(() => {
        expect(screen.getByText(/Specify Details/i)).toBeInTheDocument();
      });
    });

    it('should show attribute values as options', async () => {
      mockGetClassTokenizableAssets.mockResolvedValue(GOAT_ASSETS);

      render(<CreateP2POfferPage />);
      await goToAssetStep();

      selectAssetClass('GOAT');

      await waitFor(() => {
        const selects = document.querySelectorAll('select');
        expect(selects.length).toBeGreaterThanOrEqual(2);
      });

      selectAsset('12345');

      await waitFor(() => {
        // Weight values S, M, L should appear as options
        const allOptions = document.querySelectorAll('select option');
        const texts = Array.from(allOptions).map((o) => o.textContent);
        expect(texts).toContain('S');
        expect(texts).toContain('M');
        expect(texts).toContain('L');
        // Sex values
        expect(texts).toContain('F');
      });
    });

    it('should NOT show attribute section for assets without attributes', async () => {
      mockGetClassTokenizableAssets.mockResolvedValue(NO_ATTR_ASSET);

      render(<CreateP2POfferPage />);
      await goToAssetStep();

      selectAssetClass('SHEEP');

      await waitFor(() => {
        const selects = document.querySelectorAll('select');
        expect(selects.length).toBeGreaterThanOrEqual(2);
      });

      selectAsset('99999');

      // "Specify Details" should NOT appear
      await waitFor(() => {
        expect(screen.queryByText(/Specify Details/i)).not.toBeInTheDocument();
      });
    });

    it('should reset attributes when asset class changes', async () => {
      mockGetClassTokenizableAssets
        .mockResolvedValueOnce(GOAT_ASSETS)
        .mockResolvedValueOnce(NO_ATTR_ASSET);

      render(<CreateP2POfferPage />);
      await goToAssetStep();

      // Select GOAT and an asset with attributes
      selectAssetClass('GOAT');
      await waitFor(() => {
        const selects = document.querySelectorAll('select');
        expect(selects.length).toBeGreaterThanOrEqual(2);
      });
      selectAsset('12345');

      await waitFor(() => {
        expect(screen.getByText(/Specify Details/i)).toBeInTheDocument();
      });

      // Now switch to SHEEP
      selectAssetClass('SHEEP');

      await waitFor(() => {
        // Attributes should be gone
        expect(screen.queryByText(/Specify Details/i)).not.toBeInTheDocument();
      });
    });

    it('should format snake_case attribute names to Title Case', async () => {
      const assets: Asset[] = [
        {
          assetClass: 'GOAT',
          tokenId: '123',
          name: 'Test Goat',
          attributes: [
            { name: 'weight_class', values: ['Light'], description: '' },
            { name: 'birth_region', values: ['North'], description: '' },
          ],
        },
      ];
      mockGetClassTokenizableAssets.mockResolvedValue(assets);

      render(<CreateP2POfferPage />);
      await goToAssetStep();

      selectAssetClass('GOAT');
      await waitFor(() => {
        const selects = document.querySelectorAll('select');
        expect(selects.length).toBeGreaterThanOrEqual(2);
      });
      selectAsset('123');

      await waitFor(() => {
        expect(screen.getByText('Weight Class')).toBeInTheDocument();
        expect(screen.getByText('Birth Region')).toBeInTheDocument();
      });
    });
  });
});
