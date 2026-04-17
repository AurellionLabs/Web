'use client';
/**
 * E2EAuthProvider
 *
 * Replaces Privy entirely in E2E / local browser-test mode.
 * All wallet calls are proxied to /api/test-wallet, which uses
 * TEST_WALLET_PRIVATE_KEY to sign on the server — no extensions, no popups.
 *
 * Provides:
 *  - E2EAuthContext  (address, isConnected, eip1193, provider, signer)
 *  - useE2EAuth()    hook
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { ethers } from 'ethers';

// ---------------------------------------------------------------------------
// Server-side RPC helper — calls /api/test-wallet (never touches window.ethereum)
// ---------------------------------------------------------------------------
async function testWalletRpc(
  method: string,
  params: unknown[] = [],
): Promise<unknown> {
  const res = await fetch('/api/test-wallet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  });
  const json = await res.json();
  if (!res.ok || json?.error) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    const err = new Error(msg) as Error & { code?: number };
    err.code = json?.error?.code ?? -32000;
    throw err;
  }
  return json?.result;
}

// ---------------------------------------------------------------------------
// Custom AbstractSigner — signs via /api/test-wallet, reads from JsonRpcProvider
// No BrowserProvider = MetaMask can never intercept.
// ---------------------------------------------------------------------------
class E2EServerSigner extends ethers.AbstractSigner<ethers.JsonRpcProvider> {
  private _address: string;

  constructor(address: string, provider: ethers.JsonRpcProvider) {
    super(provider);
    this._address = address;
  }

  async getAddress(): Promise<string> {
    return this._address;
  }

  async signTransaction(tx: ethers.TransactionRequest): Promise<string> {
    return testWalletRpc('eth_signTransaction', [tx]) as Promise<string>;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const msg = typeof message === 'string' ? message : ethers.hexlify(message);
    return testWalletRpc('personal_sign', [
      msg,
      this._address,
    ]) as Promise<string>;
  }

  async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, unknown>,
  ): Promise<string> {
    const typedData = JSON.stringify({ domain, types, message: value });
    return testWalletRpc('eth_signTypedData_v4', [
      this._address,
      typedData,
    ]) as Promise<string>;
  }

  async sendTransaction(
    tx: ethers.TransactionRequest,
  ): Promise<ethers.TransactionResponse> {
    const hash = (await testWalletRpc('eth_sendTransaction', [tx])) as string;
    return this.provider!.getTransaction(
      hash,
    ) as Promise<ethers.TransactionResponse>;
  }

  connect(provider: ethers.JsonRpcProvider): E2EServerSigner {
    return new E2EServerSigner(this._address, provider);
  }
}

// Keep a named export for app providers to use.
export { E2EServerSigner };

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------
interface E2EAuthState {
  address: string | null;
  isConnected: boolean;
  isReady: boolean;
  provider: ethers.JsonRpcProvider | null;
  signer: E2EServerSigner | null;
}

const defaultState: E2EAuthState = {
  address: null,
  isConnected: false,
  isReady: false,
  provider: null,
  signer: null,
};

export const E2EAuthContext = createContext<E2EAuthState>(defaultState);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function E2EAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<E2EAuthState>(defaultState);

  const init = useCallback(async () => {
    try {
      // Bypass BrowserProvider entirely — MetaMask can't touch JsonRpcProvider
      const rpcUrl =
        process.env.NEXT_PUBLIC_RPC_URL_84532 || 'https://sepolia.base.org';
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Fetch the wallet address from the server (holds the private key)
      const accounts = (await testWalletRpc('eth_requestAccounts')) as string[];
      const address = accounts?.[0];
      if (!address) throw new Error('No account returned from test wallet');

      const signer = new E2EServerSigner(address, provider);

      setState({ address, isConnected: true, isReady: true, provider, signer });
    } catch (err) {
      console.error('[E2EAuthProvider] init error:', err);
      setState((prev) => ({ ...prev, isReady: true }));
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <E2EAuthContext.Provider value={state}>{children}</E2EAuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useE2EAuth(): E2EAuthState {
  return useContext(E2EAuthContext);
}
