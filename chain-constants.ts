// Auto-generated deployment constants for baseSepolia
// Deployed: 2026-02-01T10:36:13.732Z
// Chain ID: 84532

// =============================================================================
// CONTRACT ADDRESSES - Base Sepolia
// =============================================================================

export const NEXT_PUBLIC_AUSTAKE_ADDRESS =
  '0x6d00C0cE97E10794d8771743915a2C0DB6d99492';
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS =
  '0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6';
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS =
  '0x725793e4Ebb067df8167D43be56b4d86A6c964F3';
export const NEXT_PUBLIC_AUSYS_ADDRESS =
  '0x94a61417e11C2e4FB756DBF2a0CaC7f433eaE6Aa';
export const NEXT_PUBLIC_AURA_ASSET_ADDRESS =
  '0xb3090aBF81918FF50e921b166126aD6AB9a03944';
export const NEXT_PUBLIC_CLOB_ADDRESS =
  '0xDd33fF6AE3E20E59D1AC20336358F024a2861304';
export const NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS =
  '0xad1f2aBF1baE127464Ea5ADd8A540c7bfDade226';

// RWY Staking is now part of the Diamond (RWYStakingFacet)
// Use NEXT_PUBLIC_DIAMOND_ADDRESS for RWY staking operations

// Quote token address for CLOB trading
// For testnet: Using AURA token so testers have tokens to simulate payments
// For mainnet: Would use USDC (0x036CbD53842c5426634e7929541eC2318f3dCF7e on Base Sepolia)
export const NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS = NEXT_PUBLIC_AURA_TOKEN_ADDRESS;

// Quote token decimals - changes based on which token is used
// AURA = 18 decimals (testnet), USDC = 6 decimals (production)
export const NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS = 18; // Change to 6 for USDC in production
export const NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL = 'AURA'; // Change to 'USDC' for production

//
// AuraGoat is the same as AuraAsset for now (ERC1155 token contract)
export const NEXT_PUBLIC_AURA_GOAT_ADDRESS = NEXT_PUBLIC_AURA_ASSET_ADDRESS;

// =============================================================================
// EIP-2535 DIAMOND CONTRACTS - Base Sepolia
// =============================================================================
// FRESH DIAMOND V2 - Deployed 2026-01-08 with clean V2 storage
// This replaces the old Diamond which had corrupted V1/V2 storage conflicts

export const NEXT_PUBLIC_DIAMOND_ADDRESS =
  '0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58';
export const NEXT_PUBLIC_DIAMOND_CUT_FACET_ADDRESS =
  '0x00A8dc79e9D061bA29C46a041389ADf246b021aA';
export const NEXT_PUBLIC_DIAMOND_LOUPE_FACET_ADDRESS =
  '0x9D950F6B7363314a0c304C90997FAbcd281225FE';
export const NEXT_PUBLIC_OWNERSHIP_FACET_ADDRESS =
  '0xa5F85fBC22369A9c5FCaF72ce15FC2fE0e2DeF5c';
export const NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS =
  '0xf67afE54c7F2E1d898Ee87a7783432026Fe26d43';
export const NEXT_PUBLIC_NODES_FACET_ADDRESS =
  '0xf26E7C1146c3CC3bD4cD53007D0b17727CDf7518';
export const NEXT_PUBLIC_ASSETS_FACET_ADDRESS =
  '0x1Bd89c5624886cB09D2bb6eC28958f18DEA2BCb3';
export const NEXT_PUBLIC_ORDERS_FACET_ADDRESS =
  '0x22A9B8F70AdF0bE73ee4c7b237E617B053B65a6d';
export const NEXT_PUBLIC_STAKING_FACET_ADDRESS =
  '0xa9E03bAB4dB2fAC44C6e4b7eB8e9D3bEfF26CcF5';
export const NEXT_PUBLIC_BRIDGE_FACET_ADDRESS =
  '0xcD338753ceF77df64BD5950c13Ae4d33F8005c42';
export const NEXT_PUBLIC_CLOB_FACET_ADDRESS =
  '0x4266D981D864106F872e449FfeBCBE4e3F462a7b';
// OrderRouterFacet - SINGLE ENTRY POINT for all order operations (V2 storage)
export const NEXT_PUBLIC_ORDER_ROUTER_FACET_ADDRESS =
  '0x549Adb2a4d24607DCa383700C43e2c01dbaa060f';

// Diamond deployment block (for indexer start block)
export const DIAMOND_DEPLOY_BLOCK = 36030424;

// =============================================================================
// RPC URLS
// =============================================================================

export const NEXT_PUBLIC_RPC_URL_84532 =
  'https://base-sepolia.infura.io/v3/30d0943a6329474e8b08a1ce7ab66892';
export const NEXT_PUBLIC_RPC_URL_42161 =
  'https://arbitrum-mainnet.infura.io/v3/30d0943a6329474e8b08a1ce7ab66892';
export const NEXT_PUBLIC_RPC_URL_8453 =
  'https://base-mainnet.infura.io/v3/30d0943a6329474e8b08a1ce7ab66892';

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
  '0xaEC49e4662c640dd00aDAD6a5856092a9BbBCD75';
