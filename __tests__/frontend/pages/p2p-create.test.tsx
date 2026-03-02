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
const mockGetClassAssets = vi.fn();
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
    getClassAssets: mockGetClassAssets,
  }),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF',
    isConnected: true,
  }),
}));

const mockSellableAssets = [
  {
    id: '123',
    tokenId: '123',
    name: 'AUGOAT',
    class: 'GOAT',
    balance: '500',
    attributes: [
      { name: 'weight', value: 'M' },
      { name: 'sex', value: 'F' },
    ],
    nodeHash: '0xnode1',
  },
];
vi.mock('@/hooks/useUserAssets', () => ({
  useUserAssets: (filterClass?: string) => ({
    sellableAssets: filterClass
      ? mockSellableAssets.filter(
          (a) => a.class.toLowerCase() === filterClass.toLowerCase(),
        )
      : mockSellableAssets,
    isLoading: false,
    hasAssets: mockSellableAssets.length > 0,
    error: null,
    refresh: vi.fn(),
    assetCount: mockSellableAssets.length,
  }),
  default: (filterClass?: string) => ({
    sellableAssets: filterClass
      ? mockSellableAssets.filter(
          (a) => a.class.toLowerCase() === filterClass.toLowerCase(),
        )
      : mockSellableAssets,
    isLoading: false,
    hasAssets: mockSellableAssets.length > 0,
    error: null,
    refresh: vi.fn(),
    assetCount: mockSellableAssets.length,
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
    Package: icon('package'),
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

import CreateP2POfferPage from '@/app/(app)/customer/p2p/create/page';

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

/** Navigate from type step to asset step (BUY flow - uses dropdowns) */
async function goToAssetStepBuy() {
  fireEvent.click(screen.getByText(/I want to Buy/i));
  fireEvent.click(screen.getByText(/Next/i));
  await waitFor(() => {
    expect(screen.getByText(/Select Asset/)).toBeInTheDocument();
  });
}

/** Navigate from type step to asset step (SELL flow - shows owned assets) */
async function goToAssetStepSell() {
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

/** Navigate from type -> asset -> details for SELL flow */
async function goToDetailsStepSell() {
  await goToAssetStepSell();
  selectAssetClass('GOAT');

  await waitFor(() => {
    expect(screen.getByText('AUGOAT')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText('AUGOAT'));
  fireEvent.click(screen.getByText(/Next/i));

  await waitFor(() => {
    expect(screen.getByText(/Set Terms/i)).toBeInTheDocument();
  });
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('Create P2P Offer Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassAssets.mockResolvedValue([]);
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

  describe('step 2: buy flow - asset selection with attributes', () => {
    it('should show all supported asset classes in buy flow', async () => {
      render(<CreateP2POfferPage />);
      await goToAssetStepBuy();

      const options = document.querySelectorAll('select option');
      const optionTexts = Array.from(options).map((o) => o.textContent);
      expect(optionTexts).toContain('GOAT');
      expect(optionTexts).toContain('SHEEP');
    });

    it('should load assets when class is selected in buy flow', async () => {
      mockGetClassAssets.mockResolvedValue(GOAT_ASSETS);

      render(<CreateP2POfferPage />);
      await goToAssetStepBuy();

      selectAssetClass('GOAT');

      await waitFor(() => {
        expect(mockGetClassAssets).toHaveBeenCalledWith('GOAT');
      });
    });

    it('should display attribute dropdowns when asset with attributes is selected', async () => {
      mockGetClassAssets.mockResolvedValue(GOAT_ASSETS);

      render(<CreateP2POfferPage />);
      await goToAssetStepBuy();

      selectAssetClass('GOAT');

      await waitFor(() => {
        expect(mockGetClassAssets).toHaveBeenCalledWith('GOAT');
      });

      await waitFor(() => {
        expect(screen.getByText(/Filter by Attributes/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Weight/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Sex/i).length).toBeGreaterThan(0);
      });
    });

    it('should show attribute values as options', async () => {
      mockGetClassAssets.mockResolvedValue(GOAT_ASSETS);

      render(<CreateP2POfferPage />);
      await goToAssetStepBuy();

      selectAssetClass('GOAT');

      await waitFor(() => {
        const selects = document.querySelectorAll('select');
        expect(selects.length).toBeGreaterThanOrEqual(2);
      });

      selectAsset('12345');

      await waitFor(() => {
        const allOptions = document.querySelectorAll('select option');
        const texts = Array.from(allOptions).map((o) => o.textContent);
        expect(texts).toContain('S');
        expect(texts).toContain('M');
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
      mockGetClassAssets.mockResolvedValue(assets);

      render(<CreateP2POfferPage />);
      await goToAssetStepBuy();

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

  describe('step 2: sell flow - owned asset selection', () => {
    it('should only show asset classes the user owns', async () => {
      render(<CreateP2POfferPage />);
      await goToAssetStepSell();

      // Only GOAT should appear (from mockSellableAssets)
      const options = document.querySelectorAll('select option');
      const optionTexts = Array.from(options).map((o) => o.textContent);
      expect(optionTexts).toContain('GOAT');
      // SHEEP is a supported class but user doesn't own any
      expect(optionTexts).not.toContain('SHEEP');
    });

    it('should show owned asset cards with balance when class is selected', async () => {
      render(<CreateP2POfferPage />);
      await goToAssetStepSell();

      selectAssetClass('GOAT');

      await waitFor(() => {
        // Should show the owned asset card with name and balance
        expect(screen.getByText('AUGOAT')).toBeInTheDocument();
        expect(screen.getByText('500')).toBeInTheDocument();
        expect(screen.getByText(/available/i)).toBeInTheDocument();
      });
    });

    it('should show asset attributes inline on the card', async () => {
      render(<CreateP2POfferPage />);
      await goToAssetStepSell();

      selectAssetClass('GOAT');

      await waitFor(() => {
        expect(screen.getByText(/Weight: M/)).toBeInTheDocument();
        expect(screen.getByText(/Sex: F/)).toBeInTheDocument();
      });
    });

    it('should select asset when card is clicked and enable Next', async () => {
      render(<CreateP2POfferPage />);
      await goToAssetStepSell();

      selectAssetClass('GOAT');

      await waitFor(() => {
        expect(screen.getByText('AUGOAT')).toBeInTheDocument();
      });

      // Click the asset card
      fireEvent.click(screen.getByText('AUGOAT'));

      // Next button should become enabled (asset selected)
      const nextButtons = screen.getAllByText(/Next/i);
      const nextButton = nextButtons.find(
        (b) => !(b as HTMLButtonElement).disabled,
      );
      expect(nextButton).toBeDefined();
    });

    it('should show prompt to select class first when no class selected', async () => {
      render(<CreateP2POfferPage />);
      await goToAssetStepSell();

      expect(
        screen.getByText(/Select an asset class first/i),
      ).toBeInTheDocument();
    });

    it('should show USD as the quote label on details step', async () => {
      render(<CreateP2POfferPage />);
      await goToDetailsStepSell();
      expect(screen.getByText(/Price \(USD\)/i)).toBeInTheDocument();
    });

    it('should keep Next disabled when quantity is negative', async () => {
      render(<CreateP2POfferPage />);
      await goToDetailsStepSell();

      const quantityInput = screen.getByPlaceholderText(
        /Enter quantity/i,
      ) as HTMLInputElement;
      const priceInput = screen.getByPlaceholderText(
        /Enter total price/i,
      ) as HTMLInputElement;
      const nextButton = screen.getByRole('button', { name: /Next/i });

      fireEvent.change(quantityInput, { target: { value: '-1' } });
      fireEvent.change(priceInput, { target: { value: '100' } });

      expect(quantityInput.value).toBe('');
      expect(nextButton).toBeDisabled();
    });

    it('should keep Next disabled when price is negative', async () => {
      render(<CreateP2POfferPage />);
      await goToDetailsStepSell();

      const quantityInput = screen.getByPlaceholderText(
        /Enter quantity/i,
      ) as HTMLInputElement;
      const priceInput = screen.getByPlaceholderText(
        /Enter total price/i,
      ) as HTMLInputElement;
      const nextButton = screen.getByRole('button', { name: /Next/i });

      fireEvent.change(quantityInput, { target: { value: '1' } });
      fireEvent.change(priceInput, { target: { value: '-10' } });

      expect(priceInput.value).toBe('');
      expect(nextButton).toBeDisabled();
    });

    it('should disable Next when sell quantity exceeds available balance', async () => {
      render(<CreateP2POfferPage />);
      await goToDetailsStepSell();

      const quantityInput = screen.getByPlaceholderText(
        /Enter quantity/i,
      ) as HTMLInputElement;
      const priceInput = screen.getByPlaceholderText(
        /Enter total price/i,
      ) as HTMLInputElement;
      const nextButton = screen.getByRole('button', { name: /Next/i });

      fireEvent.change(quantityInput, { target: { value: '999' } }); // balance is 500
      fireEvent.change(priceInput, { target: { value: '100' } });

      expect(nextButton).toBeDisabled();
      expect(
        screen.getByText(/Exceeds available balance/i),
      ).toBeInTheDocument();
    });
  });
});
