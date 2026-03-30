import { describe, expect, it } from 'vitest';

import { resolvePublicNodeChain } from '@/lib/public-node-chain';

describe('resolvePublicNodeChain', () => {
  it('falls back to the default public chain when chainId is absent', () => {
    const result = resolvePublicNodeChain(new URLSearchParams());

    expect(result).toEqual({
      chainId: 84532,
      error: null,
      wasDefaulted: true,
    });
  });

  it('uses Arbitrum One when chainId=42161 is provided', () => {
    const result = resolvePublicNodeChain(
      new URLSearchParams('view=public&chainId=42161'),
    );

    expect(result).toEqual({
      chainId: 42161,
      error: null,
      wasDefaulted: false,
    });
  });

  it('uses Base Sepolia when chainId=84532 is provided', () => {
    const result = resolvePublicNodeChain(
      new URLSearchParams('view=public&chainId=84532'),
    );

    expect(result).toEqual({
      chainId: 84532,
      error: null,
      wasDefaulted: false,
    });
  });

  it('returns an error for an unsupported chainId', () => {
    const result = resolvePublicNodeChain(
      new URLSearchParams('view=public&chainId=8453'),
    );

    expect(result).toEqual({
      chainId: null,
      error: 'Unsupported public chain: 8453.',
      wasDefaulted: false,
    });
  });
});
