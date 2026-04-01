'use client';
//
import { ReactNode, useEffect, useMemo } from 'react';
import {
  addRpcUrlOverrideToChain,
  PrivyProvider,
  usePrivy,
  useWallets,
  useConnectWallet,
  useLinkAccount,
  useLogin,
  useLogout,
} from '@privy-io/react-auth';
import { arbitrum, sepolia, base, baseSepolia, mainnet } from 'viem/chains';
import { E2EAuthProvider } from '@/app/providers/e2e-auth.provider';
import {
  setProvider,
  setSigner,
  setWalletAddress,
} from '@/dapp-connectors/base-controller';
import { BrowserProvider } from 'ethers';

const IS_E2E_TEST_MODE = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';
const TEST_CHAIN_ID_HEX = '0x14a34';
const TEST_CHAIN_ID_DEC = '84532';

async function testWalletRpc(method: string, params: unknown[] = []) {
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/test-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method, params }),
      });

      if (!response.ok) {
        throw new Error(
          `Test wallet route unavailable (${response.status} ${response.statusText})`,
        );
      }

      const payload = await response.json();
      if (payload?.error) {
        const error = new Error(
          payload.error.message || 'Test wallet RPC error',
        );
        (error as Error & { code?: number }).code = payload.error.code;
        throw error;
      }

      return payload?.result;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      const delayMs = 500 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function installE2ETestWalletShim() {
  if (!IS_E2E_TEST_MODE || typeof window === 'undefined') {
    return;
  }
  const browserWindow = window as Window & { ethereum?: unknown };
  if (browserWindow.ethereum) return;

  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  let connected = false;
  let selectedAddress: string | null = null;

  const emit = (event: string, ...args: unknown[]) => {
    const handlers = listeners.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => {
      try {
        handler(...args);
      } catch (error) {
        console.error('[E2EWalletShim] Event handler error:', error);
      }
    });
  };

  const ethereum = {
    isMetaMask: true,
    selectedAddress: null as string | null,
    chainId: TEST_CHAIN_ID_HEX,
    networkVersion: TEST_CHAIN_ID_DEC,
    isConnected: () => connected,
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)?.push(handler);
    },
    removeListener: (event: string, handler: (...args: unknown[]) => void) => {
      const handlers = listeners.get(event);
      if (!handlers) return;
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    },
    removeAllListeners: (event?: string) => {
      if (event) {
        listeners.delete(event);
        return;
      }
      listeners.clear();
    },
    request: async ({
      method,
      params = [],
    }: {
      method: string;
      params?: unknown[];
    }) => {
      if (method === 'eth_chainId') return TEST_CHAIN_ID_HEX;
      if (method === 'net_version') return TEST_CHAIN_ID_DEC;
      if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
        const accounts = (await testWalletRpc(method, params)) as string[];
        const address = accounts?.[0] || null;
        selectedAddress = address;
        ethereum.selectedAddress = address;
        connected = !!address;
        if (connected) {
          emit('connect', { chainId: TEST_CHAIN_ID_HEX });
          emit('accountsChanged', accounts);
        } else {
          emit('accountsChanged', []);
        }
        return accounts;
      }

      return testWalletRpc(method, params);
    },
  };

  Object.defineProperty(browserWindow, 'ethereum', {
    value: ethereum,
    writable: false,
    configurable: false,
  });
}

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

const SHOULD_LOG_PRIVY_DEBUG = process.env.NODE_ENV !== 'production';

function logPrivyDebug(message: string, details?: Record<string, unknown>) {
  if (!SHOULD_LOG_PRIVY_DEBUG) return;
  console.info(`[PrivyDebug] ${message}`, details ?? {});
}

function logPrivyEvent(event: string, details?: Record<string, unknown>) {
  console.info(`[PrivyEvent] ${event}`, details ?? {});
}

function logPrivyError(
  event: string,
  error: string,
  details?: Record<string, unknown>,
) {
  console.error(`[PrivyEvent] ${event} failed`, {
    error,
    ...(details ?? {}),
  });
}

function PrivyEventObserver() {
  const privy = usePrivy();
  const { wallets } = useWallets();
  const currentUserId = privy.user?.id ?? null;

  const loginCallbacks = useMemo(
    () => ({
      onComplete: ({
        isNewUser,
        wasAlreadyAuthenticated,
        loginMethod,
        loginAccount,
      }: {
        isNewUser: boolean;
        wasAlreadyAuthenticated: boolean;
        loginMethod: string | null;
        loginAccount: { type?: string } | null;
      }) => {
        logPrivyEvent('login', {
          isNewUser,
          wasAlreadyAuthenticated,
          loginMethod,
          loginAccountType: loginAccount?.type ?? null,
          userId: currentUserId,
        });
      },
      onError: (error: string) => {
        logPrivyError('login', error, {
          userId: currentUserId,
        });
      },
    }),
    [currentUserId],
  );

  const connectWalletCallbacks = useMemo(
    () => ({
      onSuccess: ({
        wallet,
      }: {
        wallet: { address?: string; walletClientType?: string };
      }) => {
        logPrivyEvent('connectWallet', {
          address: wallet.address ?? null,
          walletClientType: wallet.walletClientType ?? null,
          userId: currentUserId,
        });
      },
      onError: (error: string) => {
        logPrivyError('connectWallet', error, {
          userId: currentUserId,
        });
      },
    }),
    [currentUserId],
  );

  const linkAccountCallbacks = useMemo(
    () => ({
      onSuccess: ({
        linkMethod,
        linkedAccount,
      }: {
        linkMethod: string;
        linkedAccount: { type?: string };
      }) => {
        logPrivyEvent('linkAccount', {
          linkMethod,
          linkedAccountType: linkedAccount?.type ?? null,
          userId: currentUserId,
        });
      },
      onError: (error: string, details?: { linkMethod?: string }) => {
        logPrivyError('linkAccount', error, {
          linkMethod: details?.linkMethod ?? null,
          userId: currentUserId,
        });
      },
    }),
    [currentUserId],
  );

  const logoutCallbacks = useMemo(
    () => ({
      onSuccess: () => {
        logPrivyEvent('logout', {
          userId: currentUserId,
        });
      },
    }),
    [currentUserId],
  );

  useEffect(() => {
    logPrivyDebug('auth snapshot', {
      ready: privy.ready,
      authenticated: privy.authenticated,
      userId: currentUserId,
      walletCount: wallets?.length ?? 0,
    });
  }, [currentUserId, privy.authenticated, privy.ready, wallets]);

  useLogin(loginCallbacks);
  useConnectWallet(connectWalletCallbacks);
  useLinkAccount(linkAccountCallbacks);
  useLogout(logoutCallbacks);

  return null;
}

function PrivyWalletSetupEffect() {
  const { wallets } = useWallets();

  useEffect(() => {
    if (IS_E2E_TEST_MODE) return;

    const setupProvider = async () => {
      if (wallets && wallets.length > 0 && wallets[0]) {
        try {
          const privyEthereumProvider = await wallets[0].getEthereumProvider();
          if (!privyEthereumProvider) {
            console.warn('Privy Ethereum provider is not available.');
            setProvider(null);
            setSigner(null);
            setWalletAddress('');
            return;
          }

          const ethersProvider = new BrowserProvider(privyEthereumProvider);
          setProvider(ethersProvider);

          const newSigner = await ethersProvider.getSigner();
          setSigner(newSigner);

          const newAddress = await newSigner.getAddress();
          setWalletAddress(newAddress);
        } catch (error) {
          console.error('Error setting up Privy provider:', error);
          setProvider(null);
          setSigner(null);
          setWalletAddress('');
        }
      } else {
        setProvider(null);
        setSigner(null);
        setWalletAddress('');
      }
    };

    void setupProvider();
  }, [wallets]);

  return null;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  installE2ETestWalletShim();
  const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || undefined;

  const arbitrumOverride = addRpcUrlOverrideToChain(
    arbitrum,
    process.env.NEXT_PUBLIC_RPC_URL_42161 || 'https://arb1.arbitrum.io/rpc',
  );
  const baseSepoliaOverride = addRpcUrlOverrideToChain(
    baseSepolia,
    process.env.NEXT_PUBLIC_RPC_URL_84532 || 'https://sepolia.base.org',
  );

  // In E2E mode, skip PrivyProvider entirely — no app ID needed, no MetaMask contact.
  // usePrivy() / useWallets() calls elsewhere will read the default no-op context.
  if (IS_E2E_TEST_MODE) {
    return <E2EAuthProvider>{children}</E2EAuthProvider>;
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    !privyClientId &&
    typeof window !== 'undefined'
  ) {
    console.warn(
      '[PrivyProviderWrapper] NEXT_PUBLIC_PRIVY_CLIENT_ID is not set. Privy app-client-specific origin and CAPTCHA behavior may not match dashboard configuration.',
    );
  }

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      clientId={privyClientId}
      config={{
        loginMethods: ['wallet', 'email', 'google', 'twitter'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          walletChainType: 'ethereum-only',
        },
        defaultChain: arbitrum,
        supportedChains: [
          arbitrumOverride,
          sepolia,
          base,
          baseSepoliaOverride,
          mainnet,
        ],
        fundingMethodConfig: {
          moonpay: {},
        },
      }}
    >
      <PrivyWalletSetupEffect />
      <PrivyEventObserver />
      {children}
    </PrivyProvider>
  );
}
