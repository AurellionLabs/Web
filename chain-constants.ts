// Auto-generated deployment constants for baseSepolia
// Deployed: 2026-02-19T22:29:43.666Z
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
  '0xCA6e4044AA25400F593Efed0B11694f1a6f7c053';

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
  '0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7';
export const NEXT_PUBLIC_DIAMOND_CUT_FACET_ADDRESS =
  '0xf20eBBF5cD6D9Be29C07aefC7A90Fb42C5Fd7770';
export const NEXT_PUBLIC_DIAMOND_LOUPE_FACET_ADDRESS =
  '0x63a67381E5158A5183df4C2dd2a72AfF409eAA01';
export const NEXT_PUBLIC_OWNERSHIP_FACET_ADDRESS =
  '0x03fc08c2Ee451E86e798DeF0e7262556b66E13e1';
export const NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS =
  '0xFDb90E10F42b3Da93DBFaC5fEFE8D75E31775e34';
export const NEXT_PUBLIC_NODES_FACET_ADDRESS =
  '0xc23eB03C84626dE9228c64377f8111a97F8CaEc1';
export const NEXT_PUBLIC_ASSETS_FACET_ADDRESS =
  '0x73755152A5002F3020Efa4bc2e0333267c22eaA8';
export const NEXT_PUBLIC_ORDERS_FACET_ADDRESS =
  '0x3da9c79805af442d1EC0163843b92DF289717a15';
export const NEXT_PUBLIC_STAKING_FACET_ADDRESS =
  '0xa9E03bAB4dB2fAC44C6e4b7eB8e9D3bEfF26CcF5';
export const NEXT_PUBLIC_BRIDGE_FACET_ADDRESS =
  '0x83365e0d2fD97Bb0Ba5eCF8D52dF371F2a14315b';
export const NEXT_PUBLIC_CLOB_FACET_ADDRESS =
  '0x76235E5138910F7033610530d6c01082F23C9d90';
// OrderRouterFacet - SINGLE ENTRY POINT for all order operations (V2 storage)
export const NEXT_PUBLIC_ORDER_ROUTER_FACET_ADDRESS =
  '0x2bd1D7DCd64F6705898A9E5aeD5d39c0462B08AB';

// Diamond deployment block (for indexer start block)
export const DIAMOND_DEPLOY_BLOCK = 36030424;

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
  '0xa695B719138d91A06FA9Ec24589EA73bdCb10830';
