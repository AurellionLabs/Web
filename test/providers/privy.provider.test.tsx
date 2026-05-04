// @ts-nocheck
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockUseWallet,
  mockSetProvider,
  mockSetSigner,
  mockSetWalletAddress,
  mockBrowserProvider,
  mockUsePrivy,
  mockUseWallets,
} = vi.hoisted(() => ({
  mockUseWallet: vi.fn(),
  mockSetProvider: vi.fn(),
  mockSetSigner: vi.fn(),
  mockSetWalletAddress: vi.fn(),
  mockBrowserProvider: vi.fn(),
  mockUsePrivy: vi.fn(),
  mockUseWallets: vi.fn(),
}));

vi.mock('@/hooks/useWallet', () => ({
  useWallet: (...args: unknown[]) => mockUseWallet(...args),
}));

vi.mock('@/infrastructure/wallet/wallet-runtime', () => ({
  setProvider: mockSetProvider,
  setSigner: mockSetSigner,
  setWalletAddress: mockSetWalletAddress,
}));

vi.mock('ethers', () => ({
  BrowserProvider: mockBrowserProvider,
}));

vi.mock('@/app/providers/e2e-auth.provider', () => ({
  E2EAuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@privy-io/react-auth', () => ({
  addRpcUrlOverrideToChain: (chain: unknown) => chain,
  PrivyProvider: ({ children }: { children: React.ReactNode }) => children,
  usePrivy: (...args: unknown[]) => mockUsePrivy(...args),
  useWallets: (...args: unknown[]) => mockUseWallets(...args),
  useConnectWallet: vi.fn(),
  useLinkAccount: vi.fn(),
  useLogin: vi.fn(),
  useLogout: vi.fn(),
}));

vi.mock('viem/chains', () => ({
  arbitrum: { id: 42161 },
  sepolia: { id: 11155111 },
  base: { id: 8453 },
  baseSepolia: { id: 84532 },
  mainnet: { id: 1 },
}));

import { PrivyProviderWrapper } from '@/app/providers/privy.provider';

describe('PrivyProviderWrapper', () => {
  let walletState: {
    isConnected: boolean;
    connectedWallet: { getEthereumProvider: ReturnType<typeof vi.fn> } | null;
    address: string | null;
  };
  let rawProvider: {
    on: ReturnType<typeof vi.fn>;
    removeListener: ReturnType<typeof vi.fn>;
  };
  let signerAddress: string;
  let accountChangeListener: ((accounts: string[]) => void) | null;

  beforeEach(() => {
    vi.clearAllMocks();

    signerAddress = '0x1111111111111111111111111111111111111111';
    accountChangeListener = null;
    rawProvider = {
      on: vi.fn((event: string, listener: (accounts: string[]) => void) => {
        if (event === 'accountsChanged') {
          accountChangeListener = listener;
        }
      }),
      removeListener: vi.fn(),
    };
    walletState = {
      isConnected: true,
      connectedWallet: {
        getEthereumProvider: vi.fn().mockResolvedValue(rawProvider),
      },
      address: signerAddress,
    };

    mockUseWallet.mockImplementation(() => ({
      ...walletState,
    }));

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      user: null,
      logout: vi.fn().mockResolvedValue(undefined),
    });

    mockUseWallets.mockReturnValue({
      ready: true,
      wallets: [{}],
    });

    mockBrowserProvider.mockImplementation(() => ({
      getSigner: vi.fn().mockImplementation(async () => ({
        getAddress: vi.fn().mockResolvedValue(signerAddress),
      })),
    }));
  });

  it('should seed wallet runtime state from the active Privy wallet account', async () => {
    render(
      <PrivyProviderWrapper>
        <div>child</div>
      </PrivyProviderWrapper>,
    );

    await waitFor(() => {
      expect(mockSetProvider).toHaveBeenCalledTimes(1);
      expect(mockSetSigner).toHaveBeenCalledTimes(1);
      expect(mockSetWalletAddress).toHaveBeenCalledWith(
        '0x1111111111111111111111111111111111111111',
      );
    });
  });

  it('should refresh the signer when the injected account changes under the same wallet', async () => {
    render(
      <PrivyProviderWrapper>
        <div>child</div>
      </PrivyProviderWrapper>,
    );

    await waitFor(() => {
      expect(mockSetWalletAddress).toHaveBeenLastCalledWith(
        '0x1111111111111111111111111111111111111111',
      );
    });

    signerAddress = '0x2222222222222222222222222222222222222222';
    accountChangeListener?.(['0x2222222222222222222222222222222222222222']);

    await waitFor(() => {
      expect(mockSetSigner).toHaveBeenCalledTimes(2);
      expect(mockSetWalletAddress).toHaveBeenLastCalledWith(
        '0x2222222222222222222222222222222222222222',
      );
    });
  });

  it('should clear wallet runtime state when no active wallet account remains', async () => {
    const view = render(
      <PrivyProviderWrapper>
        <div>child</div>
      </PrivyProviderWrapper>,
    );

    await waitFor(() => {
      expect(mockSetWalletAddress).toHaveBeenLastCalledWith(
        '0x1111111111111111111111111111111111111111',
      );
    });

    walletState = {
      isConnected: false,
      connectedWallet: null,
      address: null,
    };

    view.rerender(
      <PrivyProviderWrapper>
        <div>child</div>
      </PrivyProviderWrapper>,
    );

    await waitFor(() => {
      expect(mockSetProvider).toHaveBeenLastCalledWith(null);
      expect(mockSetSigner).toHaveBeenLastCalledWith(null);
      expect(mockSetWalletAddress).toHaveBeenLastCalledWith('');
    });
  });
});
