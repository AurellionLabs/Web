import { ensureQuoteTokenRuntimeConfig } from '@/scripts/lib/deploy-config';

describe('ensureQuoteTokenRuntimeConfig', () => {
  it('replaces legacy quote-token constants with runtime-configurable exports', () => {
    const input = `// Quote token address for CLOB trading
export const NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS = NEXT_PUBLIC_AURA_TOKEN_ADDRESS;

// Quote token decimals - changes based on which token is used
// AURA = 18 decimals (testnet), USDC = 6 decimals (production)
export const NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS = 18;
export const NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL = 'AURA';`;

    const output = ensureQuoteTokenRuntimeConfig(input);

    expect(output).toContain(
      'process.env.NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS || NEXT_PUBLIC_AURA_TOKEN_ADDRESS',
    );
    expect(output).toContain(
      "const ARBITRUM_USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';",
    );
    expect(output).toContain('process.env.NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS ||');
    expect(output).toContain('process.env.NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL ||');
    expect(output).not.toContain(
      "export const NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL = 'AURA';",
    );
  });

  it('adds the quote-token runtime block when constants are missing', () => {
    const input = `export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS =
  '0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6';`;

    const output = ensureQuoteTokenRuntimeConfig(input);

    expect(output).toContain('export const NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS =');
    expect(output).toContain('export const NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS =');
    expect(output).toContain('export const NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL =');
  });
});
