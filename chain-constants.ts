// Auto-generated deployment constants for baseSepolia
// Deployed: 2026-01-03T10:59:12.989Z.813Z
// Chain ID: 84532

// =============================================================================
// CONTRACT ADDRESSES - Base Sepolia
// =============================================================================

export const NEXT_PUBLIC_AUSTAKE_ADDRESS =
  '0x1310fe679b58d10764E6Dd636a640139bD083cB2';
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS =
  '0x60f7F0467FcA6176008b36CDf96070DC7b54E2C4';
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS =
  '0x5a1A031f66612906CA81c73153ec572DB4C3814B';
export const NEXT_PUBLIC_AUSYS_ADDRESS =
  '0xCfeE7c48315c35325CEC9721A9aad46C372439D7';
export const NEXT_PUBLIC_AURA_ASSET_ADDRESS =
  '0xE28388bC599aCFd63B6722E467A252973176C87F';
export const NEXT_PUBLIC_CLOB_ADDRESS =
  '0x2b9D42594Bb18FAFaA64FFEC4f5e69C8ac328aAc';
export const NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS =
  '0xad1f2aBF1baE127464Ea5ADd8A540c7bfDade226';

// Quote token address for CLOB trading (USDT on Base Sepolia)
export const NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS =
  '0x...'; // TODO: Set actual USDT/USDC address

//
// AuraGoat is the same as AuraAsset for now (ERC1155 token contract)
export const NEXT_PUBLIC_AURA_GOAT_ADDRESS = NEXT_PUBLIC_AURA_ASSET_ADDRESS;

// =============================================================================
// RPC URLS
// =============================================================================

export const NEXT_PUBLIC_RPC_URL_84532 =
  'https://base-sepolia.infura.io/v3/281dfd93e10842199b64ed6f3535fa4c';
export const NEXT_PUBLIC_RPC_URL_42161 =
  'https://arbitrum-mainnet.infura.io/v3/281dfd93e10842199b64ed6f3535fa4c';
export const NEXT_PUBLIC_RPC_URL_8453 =
  'https://base-mainnet.infura.io/v3/281dfd93e10842199b64ed6f3535fa4c';

// =============================================================================
// SUBGRAPH / INDEXER URLS
// =============================================================================
// Ponder indexer GraphQL endpoint (custom domain with SSL)
export const NEXT_PUBLIC_INDEXER_URL =
  'https://indexer.aurellionlabs.com/graphql';
export const NEXT_PUBLIC_AUSYS_SUBGRAPH_URL = NEXT_PUBLIC_INDEXER_URL;
export const NEXT_PUBLIC_AURA_ASSET_SUBGRAPH_URL = NEXT_PUBLIC_INDEXER_URL;
export const NEXT_PUBLIC_AURUM_SUBGRAPH_URL = NEXT_PUBLIC_INDEXER_URL;
export const NEXT_PUBLIC_AUSTAKE_SUBGRAPH_URL = NEXT_PUBLIC_INDEXER_URL;

// =============================================================================
// CHAIN CONFIG
// =============================================================================

export const NEXT_PUBLIC_DEFAULT_CHAIN_ID = 84532; // Base Sepolia

// =============================================================================
// DEPLOYMENT BLOCKS (for indexer configuration)
// =============================================================================

export const DEPLOYMENT_BLOCKS = {
  auraToken: 35850000, // TODO: Update with actual deployment block
  auSys: 35850002, // TODO: Update with actual deployment block
  aurumNodeManager: 35850004, // TODO: Update with actual deployment block
  auStake: 35850006, // TODO: Update with actual deployment block
  auraAsset: 35850008, // TODO: Update with actual deployment block
  clob: 35771333, // Existing CLOB deployment
};
