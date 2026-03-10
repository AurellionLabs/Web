// Auto-generated deployment constants for baseSepolia
// Deployed: 2026-03-10T16:32:32.898Z
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
  '0x3D644C1497719c83E66e05C3B585348240304533';

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
  '0x77FA5086e44B797F3C82A265ebac98937A258c8e';
export const NEXT_PUBLIC_DIAMOND_CUT_FACET_ADDRESS =
  '0x531Bd77ad7b0D8bB2f1E586d6Ca9A06Ac1381047';
export const NEXT_PUBLIC_DIAMOND_LOUPE_FACET_ADDRESS =
  '0x9317f365379FD2c4DDC5488F54717e45fd387971';
export const NEXT_PUBLIC_OWNERSHIP_FACET_ADDRESS =
  '0xa01166FbDF1251c99bD78ce432BA69088bd288e5';
export const NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS =
  '0xE9811091352dc890308817150dee878A60ce49d2';
export const NEXT_PUBLIC_NODES_FACET_ADDRESS =
  '0x012238A35D21F2637Dc830E7603adc34FbDC0FfF';
export const NEXT_PUBLIC_ASSETS_FACET_ADDRESS =
  '0x47C630b320877e0006679e6a26242c53bEaD87F6';
export const NEXT_PUBLIC_ORDERS_FACET_ADDRESS =
  '0x8bc76C8e2eb67C1b85360db8716421C1E0D97935';
export const NEXT_PUBLIC_STAKING_FACET_ADDRESS =
  '0xa9E03bAB4dB2fAC44C6e4b7eB8e9D3bEfF26CcF5';
export const NEXT_PUBLIC_BRIDGE_FACET_ADDRESS =
  '0x3F87Bb04f68f9515caC69fb911A0e5f8F973aD8b';
export const NEXT_PUBLIC_CLOB_FACET_ADDRESS =
  '0x533B1bc0A1264AC8cFe1aCff7883f8186f2ed86f';
// OrderRouterFacet - SINGLE ENTRY POINT for all order operations (V2 storage)
export const NEXT_PUBLIC_ORDER_ROUTER_FACET_ADDRESS =
  '0xB131D210e83fC00F2bCdf975C1d1B871E13E2f8D';

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
  '0x836Ab179A8Ec5BE4890C886AAa90cb5Adf2fee50';

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
