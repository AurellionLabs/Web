// Auto-generated deployment constants for baseSepolia
// Deployed: 2026-01-07T14:48:22.597Z
// Chain ID: 84532

// =============================================================================
// CONTRACT ADDRESSES - Base Sepolia
// =============================================================================

export const NEXT_PUBLIC_AUSTAKE_ADDRESS =
  '0xd41b6Dc779558bbe674B13F6996BFD5679f75074';
export const NEXT_PUBLIC_AURA_TOKEN_ADDRESS =
  '0x838Cb08335Ab4121CE4f438F38A002C9A62F69C1';
export const NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS =
  '0x6482Bf07f158D6ca7E6431c95d660a5D21eE505c';
export const NEXT_PUBLIC_AUSYS_ADDRESS =
  '0x84dC0BB1098aE6F4777C33F1C6221f11725EEfde';
export const NEXT_PUBLIC_AURA_ASSET_ADDRESS =
  '0x2581599a24951307F32d976a06a2523acC05A1c7';
export const NEXT_PUBLIC_CLOB_ADDRESS =
  '0x2f17AF60e5Ca09Eb55560bFB9A374701711a4C49';
export const NEXT_PUBLIC_ORDER_BRIDGE_ADDRESS =
  '0xad1f2aBF1baE127464Ea5ADd8A540c7bfDade226';

// RWY Vault address - Real World Yield commodity staking
// Deploy with: DEPLOY_MODE=rwy npx hardhat run scripts/unified-deploy.ts --network baseSepolia
export const NEXT_PUBLIC_RWY_VAULT_ADDRESS =
  '0xfC2d5b8464f14a051661E6dE14DB3F703C601938';

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

export const NEXT_PUBLIC_DIAMOND_ADDRESS =
  '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f';
export const NEXT_PUBLIC_DIAMOND_CUT_FACET_ADDRESS =
  '0x128AB1F0F066B9330277Aeb5b0EC3752A67D392f';
export const NEXT_PUBLIC_DIAMOND_LOUPE_FACET_ADDRESS =
  '0x6f275755D83bc5E82f116BD7a9F39573bdc8fAA9';
export const NEXT_PUBLIC_OWNERSHIP_FACET_ADDRESS =
  '0xD3ed4760b987DA1e57790d92b60692199265b553';
export const NEXT_PUBLIC_ERC1155_RECEIVER_FACET_ADDRESS =
  '0xc633B31068729CFF175dcBBee6A7B81EFbc4f2f8';
export const NEXT_PUBLIC_NODES_FACET_ADDRESS =
  '0x7C3dc2A7fb69DEF36856F059b88a0900970b1dBD';
export const NEXT_PUBLIC_ASSETS_FACET_ADDRESS =
  '0x5e3Cbf2d774eB618eC541c1A67EF09ffcd7C3C31';
export const NEXT_PUBLIC_ORDERS_FACET_ADDRESS =
  '0x7FA30b3Ae2780803Ef3f0E67EB92931cD41C3411';
export const NEXT_PUBLIC_STAKING_FACET_ADDRESS =
  '0x407D13F6cAa876297975a4847Bd75403f43EdD94';
export const NEXT_PUBLIC_BRIDGE_FACET_ADDRESS =
  '0xab99C57492A7e1f060560139FeAf3e642fF1e8E1';
export const NEXT_PUBLIC_CLOB_FACET_ADDRESS =
  '0xEb8B895110f8321B06b06A516f03a3d12D6387a6';

// Diamond deployment block (for indexer start block)
export const DIAMOND_DEPLOY_BLOCK = 35859031;

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
  auraToken: 35859031,
  auSys: 35859031,
  aurumNodeManager: 35927819,
  auStake: 35859031,
  auraAsset: 35977495,
  clob: 35859031,
  rwyVault: 35861876,
};
