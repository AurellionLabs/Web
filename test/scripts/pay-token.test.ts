import { describe, expect, it } from 'vitest';

import {
  ARBITRUM_ONE_CHAIN_ID,
  ARBITRUM_ONE_USDC,
  getProductionPayToken,
  isProductionPayTokenChain,
  resolveExpectedPayToken,
} from '@/scripts/lib/pay-token';

describe('pay-token resolver', () => {
  it('returns Arbitrum One USDC for production chain', () => {
    expect(
      resolveExpectedPayToken({
        chainId: ARBITRUM_ONE_CHAIN_ID,
        fallbackTokenAddress: '0x000000000000000000000000000000000000dEaD',
      }),
    ).toBe(ARBITRUM_ONE_USDC);
  });

  it('returns fallback token for non-production chain', () => {
    expect(
      resolveExpectedPayToken({
        chainId: 84532,
        fallbackTokenAddress: '0x000000000000000000000000000000000000dEaD',
      }),
    ).toBe('0x000000000000000000000000000000000000dEaD');
  });

  it('uses explicit token override when provided', () => {
    expect(
      resolveExpectedPayToken({
        chainId: ARBITRUM_ONE_CHAIN_ID,
        fallbackTokenAddress: '0x000000000000000000000000000000000000dEaD',
        explicitTokenAddress: '0x000000000000000000000000000000000000beef',
      }),
    ).toBe('0x000000000000000000000000000000000000bEEF');
  });

  it('throws when no token can be resolved', () => {
    expect(() =>
      resolveExpectedPayToken({
        chainId: 84532,
        fallbackTokenAddress: '',
      }),
    ).toThrow('No pay token configured for chain 84532');
  });

  it('exposes production-chain helpers', () => {
    expect(isProductionPayTokenChain(ARBITRUM_ONE_CHAIN_ID)).toBe(true);
    expect(getProductionPayToken(ARBITRUM_ONE_CHAIN_ID)).toBe(
      ARBITRUM_ONE_USDC,
    );
    expect(isProductionPayTokenChain(84532)).toBe(false);
    expect(getProductionPayToken(84532)).toBeNull();
  });
});
