import { describe, expect, it } from 'vitest';

import {
  renderIndexerDiamondConstants,
  replaceChainConstant,
} from '../../scripts/lib/deploy-config';

describe('deploy config helpers', () => {
  it('preserves chain metadata exports in generated diamond constants', () => {
    const content = renderIndexerDiamondConstants({
      address: '0x77FA5086e44B797F3C82A265ebac98937A258c8e',
      blockNumber: 38515909,
      timestamp: '2026-03-06T12:30:37.401Z',
    });

    expect(content).toContain(
      'export const CHAIN_ID = Number(process.env.CHAIN_ID',
    );
    expect(content).toContain(
      "export const CHAIN_NAME = process.env.CHAIN_NAME || 'baseSepolia'",
    );
  });

  it('updates env-fallback chain constants without removing the env override', () => {
    const original = `export const NEXT_PUBLIC_DIAMOND_ADDRESS =
  process.env.NEXT_PUBLIC_DIAMOND_ADDRESS ||
  '0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7'; // Default: Base Sepolia`;

    const updated = replaceChainConstant(
      original,
      'NEXT_PUBLIC_DIAMOND_ADDRESS',
      '0x77FA5086e44B797F3C82A265ebac98937A258c8e',
    );

    expect(updated).toContain('process.env.NEXT_PUBLIC_DIAMOND_ADDRESS ||');
    expect(updated).toContain('0x77FA5086e44B797F3C82A265ebac98937A258c8e');
    expect(updated).not.toContain('0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7');
  });

  it('updates multiline literal chain constants instead of appending duplicates', () => {
    const original = `export const NEXT_PUBLIC_RWY_STAKING_FACET_ADDRESS =
  '0xf6959b08B01d10358E06545b663eBE352327f5b8';`;

    const updated = replaceChainConstant(
      original,
      'NEXT_PUBLIC_RWY_STAKING_FACET_ADDRESS',
      '0x1111111111111111111111111111111111111111',
    );

    expect(updated).toContain(
      "export const NEXT_PUBLIC_RWY_STAKING_FACET_ADDRESS =\n  '0x1111111111111111111111111111111111111111';",
    );
    expect(
      updated.match(/NEXT_PUBLIC_RWY_STAKING_FACET_ADDRESS/g)?.length,
    ).toBe(1);
  });
});
