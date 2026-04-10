import { describe, expect, it } from 'vitest';

import {
  getNodeExplorerHref,
  getNodeTransactionHref,
} from '@/app/(app)/node/dashboard/explorer-link';

describe('getNodeExplorerHref', () => {
  it('uses the public chain explorer in public mode', () => {
    expect(
      getNodeExplorerHref({
        ownerAddress: '0x1234567890123456789012345678901234567890',
        walletChainId: 84532,
        publicChainId: 42161,
        viewMode: 'public',
      }),
    ).toBe(
      'https://arbiscan.io/address/0x1234567890123456789012345678901234567890',
    );
  });

  it('uses the connected wallet chain outside public mode', () => {
    expect(
      getNodeExplorerHref({
        ownerAddress: '0x1234567890123456789012345678901234567890',
        walletChainId: 84532,
        publicChainId: 42161,
        viewMode: null,
      }),
    ).toBe(
      'https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890',
    );
  });

  it('returns null when the owner address is missing', () => {
    expect(
      getNodeExplorerHref({
        ownerAddress: null,
        walletChainId: 84532,
        publicChainId: 42161,
        viewMode: null,
      }),
    ).toBeNull();
  });

  it('returns null when the resolved chain is unsupported', () => {
    expect(
      getNodeExplorerHref({
        ownerAddress: '0x1234567890123456789012345678901234567890',
        walletChainId: 999999,
        publicChainId: null,
        viewMode: null,
      }),
    ).toBeNull();
  });
});

describe('getNodeTransactionHref', () => {
  it('uses the public chain explorer in public mode', () => {
    expect(
      getNodeTransactionHref({
        transactionHash: '0xabc123',
        walletChainId: 84532,
        publicChainId: 42161,
        viewMode: 'public',
      }),
    ).toBe('https://arbiscan.io/tx/0xabc123');
  });

  it('uses the connected wallet chain outside public mode', () => {
    expect(
      getNodeTransactionHref({
        transactionHash: '0xabc123',
        walletChainId: 84532,
        publicChainId: 42161,
        viewMode: null,
      }),
    ).toBe('https://sepolia.basescan.org/tx/0xabc123');
  });

  it('returns null when the transaction hash is missing', () => {
    expect(
      getNodeTransactionHref({
        transactionHash: null,
        walletChainId: 84532,
        publicChainId: 42161,
        viewMode: null,
      }),
    ).toBeNull();
  });

  it('returns null when the resolved chain is unsupported', () => {
    expect(
      getNodeTransactionHref({
        transactionHash: '0xabc123',
        walletChainId: 999999,
        publicChainId: null,
        viewMode: null,
      }),
    ).toBeNull();
  });
});
