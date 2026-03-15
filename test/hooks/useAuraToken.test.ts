// @ts-nocheck - Test file with type issues
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// =============================================================================
// HOISTED MOCKS
// =============================================================================

const mocks = vi.hoisted(() => {
  // Contract instance — shared across the module
  const contractInstance = {
    balanceOf: vi.fn(),
    decimals: vi.fn(),
    symbol: vi.fn(),
    mintTokenToTreasury: vi.fn(),
  };

  // Signer returned by provider.getSigner()
  const signer = { _isSigner: true };

  // Provider returned by new BrowserProvider(...)
  const provider = {
    getSigner: vi.fn(),
  };

  // Constructor mocks
  const MockBrowserProvider = vi.fn();
  const MockContract = vi.fn();

  return {
    contractInstance,
    signer,
    provider,
    MockBrowserProvider,
    MockContract,
  };
});

// =============================================================================
// MODULE MOCKS
// =============================================================================

vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_AURA_TOKEN_ADDRESS: '0xAura000000000000000000000000000000000001',
}));

// Mock @/lib/utils so formatErc20Balance returns a predictable string.
// The hook was refactored (PR #93) to use formatErc20Balance instead of formatUnits directly.
// This mock prevents the string→bigint type mismatch inside the utility's formatUnits call.
vi.mock('@/lib/utils', () => ({
  formatErc20Balance: vi.fn(
    (balance: bigint | string, _decimals: number | bigint) => {
      const raw = typeof balance === 'bigint' ? balance : BigInt(balance);
      const whole = raw / 10n ** 18n;
      return whole.toString();
    },
  ),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock the entire ethers module. We only need BrowserProvider, Contract, and
// ethers.formatUnits (used for balance display).
vi.mock('ethers', () => {
  return {
    // Keep the real formatUnits since it's pure math and used for display
    ethers: {
      formatUnits: (value: bigint, decimals: number) => {
        // Simple implementation: divide by 10^decimals
        const divisor = BigInt(10) ** BigInt(decimals);
        const intPart = value / divisor;
        const remainder = value % divisor;
        if (remainder === 0n) return intPart.toString();
        const fracStr = remainder
          .toString()
          .padStart(decimals, '0')
          .replace(/0+$/, '');
        return `${intPart}.${fracStr}`;
      },
    },
    formatUnits: (value: bigint, decimals: number) => {
      const divisor = BigInt(10) ** BigInt(decimals);
      const intPart = value / divisor;
      const remainder = value % divisor;
      if (remainder === 0n) return intPart.toString();
      const fracStr = remainder
        .toString()
        .padStart(Number(decimals), '0')
        .replace(/0+$/, '');
      return `${intPart}.${fracStr}`;
    },
    BrowserProvider: mocks.MockBrowserProvider,
    Contract: mocks.MockContract,
    AbstractSigner: class {},
    JsonRpcProvider: vi.fn(),
  };
});

vi.mock('@/app/providers/e2e-auth.provider', () => ({
  useE2EAuth: () => ({
    address: null,
    isConnected: false,
    isReady: false,
    provider: null,
    signer: null,
  }),
  E2EAuthProvider: ({ children }: any) => children,
}));

// =============================================================================
// IMPORTS AFTER MOCKS
// =============================================================================

import { useAuraToken } from '@/hooks/useAuraToken';
import { useWallet } from '@/hooks/useWallet';

const mockUseWallet = vi.mocked(useWallet);

// =============================================================================
// CONSTANTS
// =============================================================================

const USER_ADDRESS = '0xUser0000000000000000000000000000000001';
const RAW_BALANCE = 1000n * 10n ** 18n; // 1000 AURA in wei
const TX_HASH =
  '0xdeadbeef00000000000000000000000000000000000000000000000000000001';

// =============================================================================
// HELPERS
// =============================================================================

function makeConnectedWallet() {
  return {
    getEthereumProvider: vi.fn().mockResolvedValue({ _isProvider: true }),
  };
}

function setupConnected(overrides = {}) {
  mockUseWallet.mockReturnValue({
    address: USER_ADDRESS,
    isConnected: true,
    connectedWallet: makeConnectedWallet(),
    ...overrides,
  } as any);
}

function setupDisconnected() {
  mockUseWallet.mockReturnValue({
    address: null,
    isConnected: false,
    connectedWallet: null,
  } as any);
}

function setupContractAndProvider() {
  // BrowserProvider constructor returns our mock provider
  mocks.MockBrowserProvider.mockImplementation(() => mocks.provider);
  // provider.getSigner returns our mock signer
  mocks.provider.getSigner.mockResolvedValue(mocks.signer);
  // Contract constructor returns our mock contract instance
  mocks.MockContract.mockImplementation(() => mocks.contractInstance);
  // Contract methods — default happy path
  mocks.contractInstance.balanceOf.mockResolvedValue(RAW_BALANCE);
  mocks.contractInstance.decimals.mockResolvedValue(18n);
  mocks.contractInstance.symbol.mockResolvedValue('AURA');
  mocks.contractInstance.mintTokenToTreasury.mockResolvedValue({
    hash: TX_HASH,
    wait: vi.fn().mockResolvedValue({ status: 1 }),
  });
}

// =============================================================================
// TESTS
// =============================================================================

describe('useAuraToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupContractAndProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Disconnected wallet
  // ---------------------------------------------------------------------------

  describe('disconnected wallet', () => {
    it('returns zero balance and no error when wallet is not connected', async () => {
      setupDisconnected();

      const { result } = renderHook(() => useAuraToken());

      await waitFor(() => {
        expect(result.current.isLoadingBalance).toBe(false);
      });

      expect(result.current.balance).toBe('0');
      expect(result.current.balanceRaw).toBe(0n);
      expect(result.current.error).toBeNull();
      expect(result.current.isMinting).toBe(false);
    });

    it('returns sensible defaults for symbol and decimals', () => {
      setupDisconnected();

      const { result } = renderHook(() => useAuraToken());

      expect(result.current.symbol).toBe('AURA');
      expect(result.current.decimals).toBe(18);
      expect(result.current.lastTxHash).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // refreshBalance — success
  // ---------------------------------------------------------------------------

  describe('refreshBalance — success', () => {
    it('fetches and formats balance when wallet is connected', async () => {
      setupConnected();

      const { result } = renderHook(() => useAuraToken());

      await waitFor(() => {
        expect(result.current.isLoadingBalance).toBe(false);
      });

      expect(result.current.balanceRaw).toBe(RAW_BALANCE);
      // 1000 AURA — toLocaleString('en-US') with 0 min decimals
      expect(result.current.balance).toBe('1,000');
      expect(result.current.symbol).toBe('AURA');
      expect(result.current.decimals).toBe(18);
      expect(result.current.error).toBeNull();
    });

    it('can be called manually via refreshBalance', async () => {
      setupConnected();

      const { result } = renderHook(() => useAuraToken());

      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));

      const callsBefore = mocks.contractInstance.balanceOf.mock.calls.length;
      expect(callsBefore).toBeGreaterThan(0);

      await act(async () => {
        await result.current.refreshBalance();
      });

      expect(
        mocks.contractInstance.balanceOf.mock.calls.length,
      ).toBeGreaterThan(callsBefore);
    });
  });

  // ---------------------------------------------------------------------------
  // refreshBalance — error
  // ---------------------------------------------------------------------------

  describe('refreshBalance — error', () => {
    it('sets error message when balanceOf call fails', async () => {
      setupConnected();
      mocks.contractInstance.balanceOf.mockRejectedValue(
        new Error('call reverted'),
      );

      const { result } = renderHook(() => useAuraToken());

      await waitFor(() => {
        expect(result.current.isLoadingBalance).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch AURA balance');
      expect(result.current.balance).toBe('0');
      expect(result.current.balanceRaw).toBe(0n);
    });

    it('sets error when ethereum provider is unavailable', async () => {
      mockUseWallet.mockReturnValue({
        address: USER_ADDRESS,
        isConnected: true,
        connectedWallet: {
          getEthereumProvider: vi
            .fn()
            .mockRejectedValue(new Error('no provider')),
        },
      } as any);

      const { result } = renderHook(() => useAuraToken());

      await waitFor(() => {
        expect(result.current.isLoadingBalance).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch AURA balance');
    });

    it('sets error when BrowserProvider constructor throws', async () => {
      setupConnected();
      // Make BrowserProvider throw during construction
      mocks.MockBrowserProvider.mockImplementation(() => {
        throw new Error('provider init failed');
      });

      const { result } = renderHook(() => useAuraToken());

      await waitFor(() => {
        expect(result.current.isLoadingBalance).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch AURA balance');
    });
  });

  // ---------------------------------------------------------------------------
  // mintTokens
  // ---------------------------------------------------------------------------

  describe('mintTokens', () => {
    it('returns false and sets error when wallet not connected', async () => {
      setupDisconnected();

      const { result } = renderHook(() => useAuraToken());

      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));

      let success: boolean;
      await act(async () => {
        success = await result.current.mintTokens(100);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Please connect your wallet first');
    });

    it('returns false and sets error when amount is 0', async () => {
      setupConnected();

      const { result } = renderHook(() => useAuraToken());
      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));

      let success: boolean;
      await act(async () => {
        success = await result.current.mintTokens(0);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Amount must be greater than 0');
    });

    it('returns false and sets error when amount exceeds max (10 000)', async () => {
      setupConnected();

      const { result } = renderHook(() => useAuraToken());
      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));

      let success: boolean;
      await act(async () => {
        success = await result.current.mintTokens(10001);
      });

      expect(success).toBe(false);
      expect(result.current.error).toContain('10,000');
    });

    it('mints successfully and returns true', async () => {
      setupConnected();

      const { result } = renderHook(() => useAuraToken());
      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));

      let success: boolean;
      await act(async () => {
        success = await result.current.mintTokens(500);
      });

      expect(success).toBe(true);
      expect(result.current.lastTxHash).toBe(TX_HASH);
      expect(result.current.isMinting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mocks.contractInstance.mintTokenToTreasury).toHaveBeenCalledWith(
        500,
      );
    });

    it('handles user-rejected transaction (ACTION_REJECTED)', async () => {
      setupConnected();

      const rejection = Object.assign(new Error('user rejected'), {
        code: 'ACTION_REJECTED',
      });
      mocks.contractInstance.mintTokenToTreasury.mockRejectedValue(rejection);

      const { result } = renderHook(() => useAuraToken());
      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));

      let success: boolean;
      await act(async () => {
        success = await result.current.mintTokens(100);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Transaction was rejected by user');
    });

    it('handles insufficient ETH for gas', async () => {
      setupConnected();

      const gasError = new Error('insufficient funds for gas');
      mocks.contractInstance.mintTokenToTreasury.mockRejectedValue(gasError);

      const { result } = renderHook(() => useAuraToken());
      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));

      let success: boolean;
      await act(async () => {
        success = await result.current.mintTokens(100);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Insufficient ETH for gas fees');
    });

    it('handles generic mint error', async () => {
      setupConnected();

      mocks.contractInstance.mintTokenToTreasury.mockRejectedValue(
        new Error('contract error'),
      );

      const { result } = renderHook(() => useAuraToken());
      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));

      let success: boolean;
      await act(async () => {
        success = await result.current.mintTokens(100);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('contract error');
    });

    it('sets isMinting to true during the transaction', async () => {
      setupConnected();

      let resolveTx: (v: unknown) => void;
      const pendingTx = new Promise((r) => {
        resolveTx = r;
      });
      mocks.contractInstance.mintTokenToTreasury.mockReturnValue(pendingTx);

      const { result } = renderHook(() => useAuraToken());
      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));

      let mintPromise: Promise<boolean>;
      act(() => {
        mintPromise = result.current.mintTokens(100);
      });

      await waitFor(() => {
        expect(result.current.isMinting).toBe(true);
      });

      act(() => {
        resolveTx({ hash: TX_HASH, wait: vi.fn().mockResolvedValue({}) });
      });

      await act(async () => {
        await mintPromise;
      });

      expect(result.current.isMinting).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Reactivity
  // ---------------------------------------------------------------------------

  describe('reactivity', () => {
    it('resets balance to 0 when wallet disconnects', async () => {
      setupConnected();

      const { result, rerender } = renderHook(() => useAuraToken());

      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));
      expect(result.current.balanceRaw).toBe(RAW_BALANCE);

      // Simulate disconnect
      setupDisconnected();
      rerender();

      await waitFor(() => {
        expect(result.current.balance).toBe('0');
        expect(result.current.balanceRaw).toBe(0n);
      });
    });

    it('refreshes balance after address changes', async () => {
      setupConnected();

      const { result, rerender } = renderHook(() => useAuraToken());

      await waitFor(() => expect(result.current.isLoadingBalance).toBe(false));

      const firstCount = mocks.contractInstance.balanceOf.mock.calls.length;

      // Change address
      mockUseWallet.mockReturnValue({
        address: '0xNewAddress0000000000000000000000000000002',
        isConnected: true,
        connectedWallet: makeConnectedWallet(),
      } as any);
      rerender();

      await waitFor(() => {
        expect(
          mocks.contractInstance.balanceOf.mock.calls.length,
        ).toBeGreaterThan(firstCount);
      });
    });
  });
});
