/**
 * Integration Test Utilities
 *
 * Provides mock providers and utilities for testing React components
 * with realistic data shapes from the repository layer.
 *
 * These tests catch data shape bugs (like tokenId vs tokenID) by:
 * 1. Rendering actual components
 * 2. Providing mock data that matches repository output
 * 3. Verifying the UI renders correctly
 */

import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { Asset } from '@/domain/shared';

// =============================================================================
// MOCK CONTEXT VALUES
// =============================================================================

export interface MockPlatformContextValue {
  supportedAssets: Asset[];
  supportedAssetClasses: string[];
  assetClasses: Array<{ name: string; description: string }>;
  loadState:
    | { status: 'success' }
    | { status: 'loading' }
    | { status: 'error'; error: string };
  isLoading: boolean;
  error: string | null;
  refreshPlatformData: () => Promise<void>;
  getClassAssets: (assetClass: string) => Promise<Asset[]>;
  getClassTokenizableAssets: (assetClass: string) => Promise<Asset[]>;
  getAssetByTokenId: (tokenId: string) => Promise<Asset | null>;
  invalidateCache: () => void;
}

export interface MockMainContextValue {
  currentUserRole: 'customer' | 'node' | 'driver' | 'guest';
  setCurrentUserRole: (role: 'customer' | 'node' | 'driver' | 'guest') => void;
  connected: boolean;
  setIsWalletConnected: (connected: boolean) => void;
}

export interface MockDiamondContextValue {
  isConnected: boolean;
  diamondInitialized: boolean;
  address: string | null;
  diamondAddress: string;
  nodeHash: string | null;
  placeBuyOrder: () => Promise<void>;
  placeSellOrder: () => Promise<void>;
  placeOrder: () => Promise<void>;
  cancelOrder: () => Promise<void>;
  getOrder: () => Promise<any>;
  getBestPrices: () => Promise<any>;
}

export interface MockWalletContextValue {
  address: string | null;
  connectedWallet: any | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

// =============================================================================
// DEFAULT MOCK VALUES
// =============================================================================

export const createDefaultPlatformContext = (
  overrides: Partial<MockPlatformContextValue> = {},
): MockPlatformContextValue => ({
  supportedAssets: [],
  supportedAssetClasses: ['GOAT', 'Precious Metals'],
  assetClasses: [
    { name: 'GOAT', description: 'Goat assets' },
    { name: 'Precious Metals', description: 'Gold, Silver, etc.' },
  ],
  loadState: { status: 'success' },
  isLoading: false,
  error: null,
  refreshPlatformData: vi.fn().mockResolvedValue(undefined),
  getClassAssets: vi.fn().mockResolvedValue([]),
  getClassTokenizableAssets: vi.fn().mockResolvedValue([]),
  getAssetByTokenId: vi.fn().mockResolvedValue(null),
  invalidateCache: vi.fn(),
  ...overrides,
});

export const createDefaultMainContext = (
  overrides: Partial<MockMainContextValue> = {},
): MockMainContextValue => ({
  currentUserRole: 'customer',
  setCurrentUserRole: vi.fn(),
  connected: true,
  setIsWalletConnected: vi.fn(),
  ...overrides,
});

export const createDefaultDiamondContext = (
  overrides: Partial<MockDiamondContextValue> = {},
): MockDiamondContextValue => ({
  isConnected: true,
  diamondInitialized: true,
  address: '0x1234567890123456789012345678901234567890',
  diamondAddress: '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f',
  nodeHash:
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  placeBuyOrder: vi.fn().mockResolvedValue(undefined),
  placeSellOrder: vi.fn().mockResolvedValue(undefined),
  placeOrder: vi.fn().mockResolvedValue(undefined),
  cancelOrder: vi.fn().mockResolvedValue(undefined),
  getOrder: vi.fn().mockResolvedValue(null),
  getBestPrices: vi.fn().mockResolvedValue({ bestBid: 0n, bestAsk: 0n }),
  ...overrides,
});

export const createDefaultWalletContext = (
  overrides: Partial<MockWalletContextValue> = {},
): MockWalletContextValue => ({
  address: '0x1234567890123456789012345678901234567890',
  connectedWallet: { address: '0x1234567890123456789012345678901234567890' },
  isConnecting: false,
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  ...overrides,
});

// =============================================================================
// MOCK CONTEXTS
// =============================================================================

// Create mock contexts that mirror the real ones
const MockPlatformContext = React.createContext<
  MockPlatformContextValue | undefined
>(undefined);
const MockMainContext = React.createContext<MockMainContextValue | undefined>(
  undefined,
);
const MockDiamondContext = React.createContext<
  MockDiamondContextValue | undefined
>(undefined);
const MockWalletContext = React.createContext<
  MockWalletContextValue | undefined
>(undefined);

// Export mock hooks that components can use
export const useMockPlatform = () => {
  const context = React.useContext(MockPlatformContext);
  if (!context)
    throw new Error('useMockPlatform must be used within MockPlatformProvider');
  return context;
};

export const useMockMain = () => {
  const context = React.useContext(MockMainContext);
  if (!context)
    throw new Error('useMockMain must be used within MockMainProvider');
  return context;
};

export const useMockDiamond = () => {
  const context = React.useContext(MockDiamondContext);
  if (!context)
    throw new Error('useMockDiamond must be used within MockDiamondProvider');
  return context;
};

export const useMockWallet = () => {
  const context = React.useContext(MockWalletContext);
  if (!context)
    throw new Error('useMockWallet must be used within MockWalletProvider');
  return context;
};

// =============================================================================
// TEST WRAPPER OPTIONS
// =============================================================================

export interface TestWrapperOptions {
  // Data to provide
  classAssets?: Asset[];
  supportedAssetClasses?: string[];

  // Context overrides
  platformContext?: Partial<MockPlatformContextValue>;
  mainContext?: Partial<MockMainContextValue>;
  diamondContext?: Partial<MockDiamondContextValue>;
  walletContext?: Partial<MockWalletContextValue>;

  // Route params (for useParams mock)
  params?: Record<string, string>;
}

// =============================================================================
// TEST WRAPPER CREATOR
// =============================================================================

/**
 * Creates a test wrapper with all required providers
 *
 * @example
 * ```tsx
 * const wrapper = createTestWrapper({
 *   classAssets: [
 *     { assetClass: 'GOAT', tokenId: '12345', name: 'AUGOAT', attributes: [] }
 *   ],
 * });
 *
 * render(<TradingPage />, { wrapper });
 * ```
 */
export function createTestWrapper(options: TestWrapperOptions = {}) {
  const {
    classAssets = [],
    supportedAssetClasses = ['GOAT'],
    platformContext = {},
    mainContext = {},
    diamondContext = {},
    walletContext = {},
  } = options;

  // Create platform context with class assets
  const platformValue = createDefaultPlatformContext({
    supportedAssetClasses,
    getClassAssets: vi.fn().mockResolvedValue(classAssets),
    ...platformContext,
  });

  const mainValue = createDefaultMainContext(mainContext);
  const diamondValue = createDefaultDiamondContext(diamondContext);
  const walletValue = createDefaultWalletContext(walletContext);

  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <MockMainContext.Provider value={mainValue}>
        <MockPlatformContext.Provider value={platformValue}>
          <MockDiamondContext.Provider value={diamondValue}>
            <MockWalletContext.Provider value={walletValue}>
              {children}
            </MockWalletContext.Provider>
          </MockDiamondContext.Provider>
        </MockPlatformContext.Provider>
      </MockMainContext.Provider>
    );
  };
}

// =============================================================================
// CUSTOM RENDER
// =============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapperOptions?: TestWrapperOptions;
}

/**
 * Custom render that wraps components with all required providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {},
) {
  const { wrapperOptions, ...renderOptions } = options;
  const wrapper = createTestWrapper(wrapperOptions);

  return render(ui, { wrapper, ...renderOptions });
}

// =============================================================================
// MODULE MOCKING HELPERS
// =============================================================================

/**
 * Setup mocks for Next.js navigation hooks
 */
export function setupNavigationMocks(params: Record<string, string> = {}) {
  vi.mock('next/navigation', () => ({
    useParams: () => params,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => '/customer/trading/class/GOAT',
    useSearchParams: () => new URLSearchParams(),
  }));
}

/**
 * Setup mocks for provider hooks
 * Call this in beforeEach to mock the actual provider hooks
 */
export function setupProviderMocks(options: TestWrapperOptions = {}) {
  const {
    classAssets = [],
    supportedAssetClasses = ['GOAT'],
    platformContext = {},
    mainContext = {},
    diamondContext = {},
    walletContext = {},
  } = options;

  // Mock usePlatform
  vi.mock('@/app/providers/platform.provider', () => ({
    usePlatform: () =>
      createDefaultPlatformContext({
        supportedAssetClasses,
        getClassAssets: vi.fn().mockResolvedValue(classAssets),
        ...platformContext,
      }),
    PlatformProvider: ({ children }: { children: ReactNode }) => children,
  }));

  // Mock useMainProvider
  vi.mock('@/app/providers/main.provider', () => ({
    useMainProvider: () => createDefaultMainContext(mainContext),
    MainProvider: ({ children }: { children: ReactNode }) => children,
  }));

  // Mock useDiamond
  vi.mock('@/app/providers/diamond.provider', () => ({
    useDiamond: () => createDefaultDiamondContext(diamondContext),
    DiamondProvider: ({ children }: { children: ReactNode }) => children,
  }));

  // Mock useWallet
  vi.mock('@/hooks/useWallet', () => ({
    useWallet: () => createDefaultWalletContext(walletContext),
  }));
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export * from '@testing-library/react';
export { vi } from 'vitest';
