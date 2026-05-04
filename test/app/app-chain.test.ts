import { describe, expect, it } from 'vitest';

import { NEXT_PUBLIC_DEFAULT_CHAIN_ID } from '@/chain-constants';
import {
  getAppChainEnvironmentLabel,
  isPublicNodeChainRoute,
  resolveChainMismatch,
  resolveExpectedAppChain,
} from '@/lib/app-chain';

describe('getAppChainEnvironmentLabel', () => {
  it('returns Mainnet for Arbitrum One', () => {
    expect(getAppChainEnvironmentLabel(42161, 'Arbitrum One')).toBe('Mainnet');
  });

  it('returns Testnet for Base Sepolia', () => {
    expect(getAppChainEnvironmentLabel(84532, 'Base Sepolia')).toBe('Testnet');
  });

  it('falls back to the chain name for other chains', () => {
    expect(getAppChainEnvironmentLabel(8453, 'Base')).toBe('Base');
  });
});

describe('isPublicNodeChainRoute', () => {
  it('matches the public node explorer route', () => {
    expect(
      isPublicNodeChainRoute('/node/explorer', new URLSearchParams()),
    ).toBe(true);
  });

  it('matches the public node dashboard route', () => {
    expect(
      isPublicNodeChainRoute(
        '/node/dashboard',
        new URLSearchParams('view=public&chainId=42161'),
      ),
    ).toBe(true);
  });

  it('ignores private dashboard routes', () => {
    expect(
      isPublicNodeChainRoute('/customer/dashboard', new URLSearchParams()),
    ).toBe(false);
  });
});

describe('resolveExpectedAppChain', () => {
  it('uses the default app chain on normal routes', () => {
    const result = resolveExpectedAppChain({
      pathname: '/customer/trading',
      searchParams: new URLSearchParams(),
    });

    expect(result.expectedChainId).toBe(NEXT_PUBLIC_DEFAULT_CHAIN_ID);
    expect(result.expectedChainName).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it('uses the selected public node chain on explorer routes', () => {
    const result = resolveExpectedAppChain({
      pathname: '/node/explorer',
      searchParams: new URLSearchParams('chainId=42161'),
    });

    expect(result.expectedChainId).toBe(42161);
    expect(result.expectedChainName).toBe('Arbitrum One');
    expect(result.error).toBeNull();
  });
});

describe('resolveChainMismatch', () => {
  it('does not report a mismatch without a connected wallet chain', () => {
    const result = resolveChainMismatch({
      pathname: '/customer/dashboard',
      searchParams: new URLSearchParams(),
      walletChainId: null,
    });

    expect(result.mismatch).toBe(false);
    expect(result.walletChainName).toBeNull();
  });

  it('reports a mismatch when wallet chain differs from the expected app chain', () => {
    const result = resolveChainMismatch({
      pathname: '/customer/dashboard',
      searchParams: new URLSearchParams(),
      walletChainId: NEXT_PUBLIC_DEFAULT_CHAIN_ID === 42161 ? 84532 : 42161,
    });

    expect(result.mismatch).toBe(true);
    expect(result.expectedChainId).toBe(NEXT_PUBLIC_DEFAULT_CHAIN_ID);
    expect(result.walletChainName).not.toBeNull();
  });

  it('does not report a mismatch when wallet chain matches the expected public chain', () => {
    const result = resolveChainMismatch({
      pathname: '/node/dashboard',
      searchParams: new URLSearchParams('view=public&chainId=42161'),
      walletChainId: 42161,
    });

    expect(result.expectedChainId).toBe(42161);
    expect(result.mismatch).toBe(false);
  });
});
