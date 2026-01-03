// Auto-generated deployment constants for baseSepolia
// Deployed: 2026-01-01T23:43:02.813Z
// Chain ID: 84532

// =============================================================================
// CONTRACT ADDRESSES - Base Sepolia
// =============================================================================

export const NEXT_PUBLIC_AUSTAKE_ADDRESS =
  '0xd41b6Dc779558bbe674B13F6996BFD5679f75074';
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS =
  '0x838Cb08335Ab4121CE4f438F38A002C9A62F69C1';
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS =
  '0xc50F6505BcBb00Af8f1086d9121525695Bf09D30';
export const NEXT_PUBLIC_AUSYS_ADDRESS =
  '0x84dC0BB1098aE6F4777C33F1C6221f11725EEfde';
export const NEXT_PUBLIC_AURA_ASSET_ADDRESS =
  '0xdc1B355885ba73EFf0f0a5A72F12D87e785581a8';
export const NEXT_PUBLIC_CLOB_ADDRESS =
  '0x2b9D42594Bb18FAFaA64FFEC4f5e69C8ac328aAc';
export const NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS =
  '0x0000000000000000000000000000000000000000'; // TODO: Deploy and set

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
  auraToken: 35771316,
  auSys: 35771321,
  aurumNodeManager: 35771324,
  auStake: 35771327,
  auraAsset: 35771330,
  clob: 35771333,
};
