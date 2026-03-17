// Auto-generated deployment constants for baseSepolia
// Deployed: 2026-03-17T10:09:33.605Z
// Chain ID: 84532

// =============================================================================
// CONTRACT ADDRESSES - Base Sepolia
// =============================================================================

export const NEXT_PUBLIC_AUSTAKE_ADDRESS =
  '0x6d00C0cE97E10794d8771743915a2C0DB6d99492';
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS =
  '0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6';
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS =
  '0x725793e4Ebb067df8167D43be56B4d86A6c964F3';
export const NEXT_PUBLIC_AUSYS_ADDRESS =
  '0x94a61417e11C2e4FB756DBF2a0CaC7f433eaE6Aa';
export const NEXT_PUBLIC_AURA_ASSET_ADDRESS =
  '0xb3090aBF81918FF50e921b166126aD6AB9a03944';
export const NEXT_PUBLIC_CLOB_ADDRESS =
  '0xDd33fF6AE3E20E59D1AC20336358F024a2861304';

// CLOB V2 Diamond - separate Diamond for CLOB trading (placeLimitOrder, matching, etc.)
// Deployed: 2026-01-07 (see deployments/clob-v2-baseSepolia-*.json)
export const NEXT_PUBLIC_CLOB_V2_DIAMOND_ADDRESS =
  '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f';
export const NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS =
  '0xad1f2aBF1baE127464Ea5ADd8A540c7bfDade226';

// RWY Staking is now part of the Diamond (RWYStakingFacet)
// Use NEXT_PUBLIC_DIAMOND_ADDRESS for RWY staking operations

// Quote token address for CLOB trading
// For testnet: Using AURA token so testers have tokens to simulate payments
// For mainnet: Would use USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e on Base Sepolia)
export const NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS = NEXT_PUBLIC_AURA_TOKEN_ADDRESS;

export const NEXT_PUBLIC_AUSYS_FACET_ADDRESS =
  '0xf6cfAfDabA9162e58c586380F821B35C5fc03b76';

// Quote token decimals - changes based on which token is used
// AURA = 18 decimals (testnet), USDC = 6 decimals (production)
export const NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS = 18; // Change to 6 for USDC in production
export const NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL =
  'AURA';

//
// AuraGoat is the same as AuraAsset for now (ERC1155 token contract)
export const NEXT_PUBLIC_AURA_GOAT_ADDRESS = NEXT_PUBLIC_AURA_ASSET_ADDRESS;

// =============================================================================
// EIP-2535 DIAMOND CONTRACTS - Base Sepolia
// =============================================================================
// FRESH DIAMOND V2 - Deployed 2026-01-08 with clean V2 storage
// This replaces the old Diamond which had corrupted V1/V2 storage conflicts

export const NEXT_PUBLIC_DIAMOND_ADDRESS =
  process.env.NEXT_PUBLIC_DIAMOND_ADDRESS ||
  '0x0Adc63e71B035d5c7FDB1B4593999FA1F296f1B2';
export const NEXT_PUBLIC_DIAMOND_CUT_FACET_ADDRESS =
  '0x4415c7a891c2e53015f7A9E3818c366962C0f1C1';
export const NEXT_PUBLIC_DIAMOND_LOUPE_FACET_ADDRESS =
  '0x990993b1a1f88eCDB062Cae8BcB4A7a312d044ee';
export const NEXT_PUBLIC_OWNERSHIP_FACET_ADDRESS =
  '0x3CA79C1cf29B8d19F7c643bB6E6bc9c49762E70f';
export const NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS =
  '0x3E6b78b8954aA5d41C305162c73Fa5B4A762eCa1';
export const NEXT_PUBLIC_NODES_FACET_ADDRESS =
  '0x86B2265f649fF5b1Bd4D2273D643f892Feba5981';
export const NEXT_PUBLIC_ASSETS_FACET_ADDRESS =
  '0x0167D34d3e99100D8336B9817550F96e6fe7F5d8';
export const NEXT_PUBLIC_ORDERS_FACET_ADDRESS =
  '0xB2d0CaC089063848b429e4d5795e49FE3504Eb24';
export const NEXT_PUBLIC_STAKING_FACET_ADDRESS =
  '0xa9E03bAB4dB2fAC44C6e4b7eB8e9D3bEfF26CcF5';
export const NEXT_PUBLIC_BRIDGE_FACET_ADDRESS =
  '0x3EbAcfA2a54B0eD6d9e742783B994Bc55662272d';
export const NEXT_PUBLIC_CLOB_FACET_ADDRESS =
  '0x054774fFcCEcA75f29eD3fBD344E84217BF7ADDe';
// OrderRouterFacet - SINGLE ENTRY POINT for all order operations (V2 storage)
export const NEXT_PUBLIC_ORDER_ROUTER_FACET_ADDRESS =
  '0xcfD05223A52A1E28ca2a11099a1eDC53d2EC8553';

// Diamond deployment block (for indexer start block)
export const DIAMOND_DEPLOY_BLOCK = 38515909;

// =============================================================================
// RPC URLS - Read from environment variables, never hardcode API keys
// =============================================================================

export const NEXT_PUBLIC_RPC_URL_84532 =
  process.env.NEXT_PUBLIC_RPC_URL_84532 || '';
export const NEXT_PUBLIC_RPC_URL_42161 =
  process.env.NEXT_PUBLIC_RPC_URL_42161 || '';
export const NEXT_PUBLIC_RPC_URL_8453 =
  process.env.NEXT_PUBLIC_RPC_URL_8453 || '';

// =============================================================================
// CHAIN CONFIG (must be before indexer URLs — they depend on default chain)
// =============================================================================

export const NEXT_PUBLIC_DEFAULT_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 84532,
); // Default: Base Sepolia (84532), Production: Arbitrum One (42161)

// =============================================================================
// SUBGRAPH / INDEXER URLS
// =============================================================================

// Indexer endpoints per chain
const INDEXER_URLS: Record<number, string> = {
  // Mainnet (Arbitrum One)
  42161:
    process.env.NEXT_PUBLIC_INDEXER_URL_42161 ||
    'https://indexer.aurellionlabs.com/graphql',
  // Testnet (Base Sepolia)
  84532:
    process.env.NEXT_PUBLIC_INDEXER_URL_84532 ||
    'https://dev.indexer.aurellionlabs.com/graphql',
};

// Default / legacy static export (uses default chain)
export const NEXT_PUBLIC_INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL ||
  INDEXER_URLS[NEXT_PUBLIC_DEFAULT_CHAIN_ID] ||
  'https://indexer.aurellionlabs.com/graphql';

/**
 * Get the indexer GraphQL URL for a given chain.
 * Falls back to the default chain's URL if the chain is unknown.
 */
export function getIndexerUrl(chainId?: number | null): string {
  if (chainId && INDEXER_URLS[chainId]) {
    return INDEXER_URLS[chainId];
  }
  return NEXT_PUBLIC_INDEXER_URL;
}

// Legacy aliases — kept for backward compat, prefer getIndexerUrl(chainId)
export const NEXT_PUBLIC_AUSYS_SUBGRAPH_URL = NEXT_PUBLIC_INDEXER_URL;
export const NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL = NEXT_PUBLIC_INDEXER_URL;
export const NEXT_PUBLIC_AURUM_SUBGRAPH_URL = NEXT_PUBLIC_INDEXER_URL;
export const NEXT_PUBLIC_AUSTAKE_SUBGRAPH_URL = NEXT_PUBLIC_INDEXER_URL;

// =============================================================================
// DEPLOYMENT BLOCKS (for indexer configuration)
// =============================================================================

export const DEPLOYMENT_BLOCKS = {
  auraToken: 36423435,
  auSys: 36423438,
  aurumNodeManager: 36423440,
  auStake: 36423442,
  auraAsset: 36423444,
  clob: 36423451,
};

// Export individual constants for generator
export const AURA_ASSET_DEPLOY_BLOCK = 36033385;
// RWY_VAULT_DEPLOY_BLOCK removed - now part of Diamond

export const NEXT_PUBLIC_RWY_STAKING_FACET_ADDRESS =
  '0x597565d7e1C737cd789Ca635173f98DB26280997';

// =============================================================================
// IPFS GROUP IDS - Chain-specific Pinata groups for metadata
// =============================================================================

export const IPFS_GROUP_IDS: Record<number, string> = {
  42161: '9282bdc8-1a27-469a-b132-1e820e2433db', // Arbitrum One
  84532: '6eae9d79-14a8-45c4-9d1c-acf2a0f9a42c', // Base Sepolia
};

export function getIpfsGroupId(chainId: number): string {
  const groupId = IPFS_GROUP_IDS[chainId];
  if (!groupId) {
    throw new Error(`No IPFS group configured for chain ${chainId}`);
  }
  return groupId;
}
