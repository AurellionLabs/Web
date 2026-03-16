import { ethers } from 'ethers';

import { resolveDiamondAddress } from '@/scripts/lib/runtime-contracts';

describe('runtime-contracts', () => {
  it('prefers the explicit CLI diamond address', () => {
    const result = resolveDiamondAddress({
      explicitAddress: '0x1111111111111111111111111111111111111111',
      manifestDiamondAddress: '0x2222222222222222222222222222222222222222',
      env: {
        DIAMOND_ADDRESS: '0x3333333333333333333333333333333333333333',
      },
    });

    expect(result).toBe('0x1111111111111111111111111111111111111111');
  });

  it('prefers DIAMOND_ADDRESS over NEXT_PUBLIC_DIAMOND_ADDRESS and manifest fallback', () => {
    const result = resolveDiamondAddress({
      manifestDiamondAddress: '0x2222222222222222222222222222222222222222',
      env: {
        DIAMOND_ADDRESS: '0x3333333333333333333333333333333333333333',
        NEXT_PUBLIC_DIAMOND_ADDRESS:
          '0x4444444444444444444444444444444444444444',
      },
    });

    expect(result).toBe('0x3333333333333333333333333333333333333333');
  });

  it('falls back to the active chain manifest when env vars are absent', () => {
    const result = resolveDiamondAddress({
      manifestDiamondAddress: '0x2222222222222222222222222222222222222222',
      env: {},
    });

    expect(result).toBe('0x2222222222222222222222222222222222222222');
  });

  it('rejects missing or zero addresses', () => {
    expect(() =>
      resolveDiamondAddress({
        env: {
          DIAMOND_ADDRESS: ethers.ZeroAddress,
        },
      }),
    ).toThrow('Diamond address not found');
  });
});
