// Global mock for @/chain-constants
// Use this instead of inline vi.mock in test files

export const NEXT_PUBLIC_INDEXER_URL = 'https://mock-indexer.test/graphql';
export const NEXT_PUBLIC_DEFAULT_CHAIN_ID = 84532;
export const INDEXER_URLS: Record<number, string> = {
  42161: 'https://indexer.aurellionlabs.com/graphql',
  84532: 'https://dev.indexer.aurellionlabs.com/graphql',
};

export function getIndexerUrl(chainId?: number | null): string {
  if (chainId && INDEXER_URLS[chainId]) {
    return INDEXER_URLS[chainId];
  }
  return NEXT_PUBLIC_INDEXER_URL;
}

// Export other constants that might be needed
export const NEXT_PUBLIC_AURA_ASSET_ADDRESS =
  '0x1234567890abcdef1234567890abcdef12345678';
export const NEXT_PUBLIC_CUSTODY_FACTORY_ADDRESS =
  '0xabcdef1234567890abcdef1234567890abcdef12';
export const NEXT_PUBLIC_DIAMOND_ADDRESS =
  '0x9876543210fedcba9876543210fedcba98765432';
export const NEXT_PUBLIC_RWY_STAKING_FACET_ADDRESS =
  '0x1111222233334444555566667777888899990000';
export const NEXT_PUBLIC_CLOB_FACET_ADDRESS =
  '0xaaaabbbbccccddddeeeeffff0000111122223333';
export const NEXT_PUBLIC_NODES_FACET_ADDRESS =
  '0xdeadbeef12345678deadbeef12345678deadbeef';
export const NEXT_PUBLIC_DRIVER_FACET_ADDRESS =
  '0xcafebabe87654321cafebabe87654321cafebabe';
export const NEXT_PUBLIC_P2P_FACET_ADDRESS =
  '0xbaadf00d12345678baadf00d12345678baadf00d';
export const NEXT_PUBLIC_INDEXER_URL_42161 =
  'https://indexer.aurellionlabs.com/graphql';
export const NEXT_PUBLIC_INDEXER_URL_84532 =
  'https://dev.indexer.aurellionlabs.com/graphql';
