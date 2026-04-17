// Auto-generated deployment constants for baseSepolia
// Deployed: 2026-03-21T02:16:34.316Z
// Chain ID: 84532

// =============================================================================
// CONTRACT ADDRESSES - Base Sepolia
// =============================================================================

export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS =
  '0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6';
export const NEXT_PUBLIC_AURA_ASSET_ADDRESS =
  '0xb3090aBF81918FF50e921b166126aD6AB9a03944';

// CLOB V2 Diamond - separate Diamond for CLOB trading (placeLimitOrder, matching, etc.)
// Deployed: 2026-01-07 (see deployments/clob-v2-baseSepolia-*.json)
export const NEXT_PUBLIC_CLOB_V2_DIAMOND_ADDRESS =
  '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f';
// RWY Staking is now part of the Diamond (RWYStakingFacet)
// Use NEXT_PUBLIC_DIAMOND_ADDRESS for RWY staking operations

// Quote token address for CLOB trading
// For testnet: Using AURA token so testers have tokens to simulate payments
// For mainnet: Would use USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e on Base Sepolia)
export const NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS || NEXT_PUBLIC_AURA_TOKEN_ADDRESS;

export const NEXT_PUBLIC_AUSYS_FACET_ADDRESS =
  '0xdD4B2363a3deB632AA23e311EC7Ec0B86117106f';

// Quote token decimals - changes based on which token is used
// AURA = 18 decimals (testnet), USDC = 6 decimals (production)
const ARBITRUM_USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';
const quoteTokenIsArbitrumUsdc =
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS.toLowerCase() === ARBITRUM_USDC_ADDRESS;

export const NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS = Number(
  process.env.NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS ||
    (quoteTokenIsArbitrumUsdc ? '6' : '18'),
);
export const NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL =
  process.env.NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL ||
  (quoteTokenIsArbitrumUsdc ? 'USDC' : 'AURA');

// =============================================================================
// EIP-2535 DIAMOND CONTRACTS - Base Sepolia
// =============================================================================
// FRESH DIAMOND V2 - Deployed 2026-01-08 with clean V2 storage
// This replaces the old Diamond which had corrupted V1/V2 storage conflicts

export const NEXT_PUBLIC_DIAMOND_ADDRESS =
  process.env.NEXT_PUBLIC_DIAMOND_ADDRESS ||
  '0xDA8D2eAF06d53c22B832934e3F9b26A3E93EF3ed';
export const NEXT_PUBLIC_DIAMOND_CUT_FACET_ADDRESS =
  '0x35B415E719E593f09eF371d962d344fFA3218391';
export const NEXT_PUBLIC_DIAMOND_LOUPE_FACET_ADDRESS =
  '0x988C685276Bd162D17409fDc2BD391B7d3634488';
export const NEXT_PUBLIC_OWNERSHIP_FACET_ADDRESS =
  '0x880621b9cfA09018ec894A08FAebBf27d16010b6';
export const NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS =
  '0xffEe7EC29ACC792D102dA599898aDB2Eb40b1135';
export const NEXT_PUBLIC_NODES_FACET_ADDRESS =
  '0x1Cd2DB5E9dd3acd2Ef441517d179e6463d61c1b6';
export const NEXT_PUBLIC_ASSETS_FACET_ADDRESS =
  '0x7f97Ce0507C8F153fF3E3f1137621523Bf54E1Ab';
export const NEXT_PUBLIC_ORDERS_FACET_ADDRESS =
  '0x4aF840b4939B615e8E8CD285dD7d573E701973D8';
export const NEXT_PUBLIC_STAKING_FACET_ADDRESS =
  '0xa9E03bAB4dB2fAC44C6e4b7eB8e9D3bEfF26CcF5';
export const NEXT_PUBLIC_BRIDGE_FACET_ADDRESS =
  '0xFe47b5e2E35c1DEE5Bd344A26112baD3cF994565';
export const NEXT_PUBLIC_CLOB_FACET_ADDRESS =
  '0x3583B737636a73a8CBC0E2Bf102fD4b82ea9E7CE';
// OrderRouterFacet - SINGLE ENTRY POINT for all order operations (V2 storage)
export const NEXT_PUBLIC_ORDER_ROUTER_FACET_ADDRESS =
  '0x0A38ab8b61C94Dd23Fb27Ad69AA7F56C86f6bC90';

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

// =============================================================================
// DEPLOYMENT BLOCKS (for indexer configuration)
// =============================================================================

export const DEPLOYMENT_BLOCKS = {
  diamond: DIAMOND_DEPLOY_BLOCK,
  auraAsset: 36033385,
};

// Export individual constants for generator
export const AURA_ASSET_DEPLOY_BLOCK = 36033385;

export const NEXT_PUBLIC_RWY_STAKING_FACET_ADDRESS =
  '0xdf79919593BC5111e5c911b46BBF1DDDDe5a8DD2';

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
