import { describe, expect, it } from 'vitest';

import {
  isPublicNodeDashboardView,
  resolvePublicDashboardEnvironmentLabel,
} from '@/app/components/layout/public-dashboard-network-badge';

describe('isPublicNodeDashboardView', () => {
  it('matches node dashboard public view routes', () => {
    expect(
      isPublicNodeDashboardView(
        '/node/dashboard',
        new URLSearchParams('view=public&chainId=42161'),
      ),
    ).toBe(true);
  });

  it('ignores non-public node dashboard routes', () => {
    expect(
      isPublicNodeDashboardView(
        '/node/dashboard',
        new URLSearchParams('chainId=42161'),
      ),
    ).toBe(false);
  });
});

describe('resolvePublicDashboardEnvironmentLabel', () => {
  it('shows Mainnet for disconnected public dashboard views on Arbitrum', () => {
    expect(
      resolvePublicDashboardEnvironmentLabel({
        pathname: '/node/dashboard',
        searchParams: new URLSearchParams('view=public&chainId=42161'),
        walletChainId: null,
      }),
    ).toBe('Mainnet');
  });

  it('shows Testnet for disconnected public dashboard views on Base Sepolia', () => {
    expect(
      resolvePublicDashboardEnvironmentLabel({
        pathname: '/node/dashboard',
        searchParams: new URLSearchParams('view=public&chainId=84532'),
        walletChainId: null,
      }),
    ).toBe('Testnet');
  });

  it('does not override the badge when a wallet chain is connected', () => {
    expect(
      resolvePublicDashboardEnvironmentLabel({
        pathname: '/node/dashboard',
        searchParams: new URLSearchParams('view=public&chainId=42161'),
        walletChainId: 84532,
      }),
    ).toBeNull();
  });

  it('does not override the badge outside public dashboard view', () => {
    expect(
      resolvePublicDashboardEnvironmentLabel({
        pathname: '/node/explorer',
        searchParams: new URLSearchParams('chainId=42161'),
        walletChainId: null,
      }),
    ).toBeNull();
  });
});
