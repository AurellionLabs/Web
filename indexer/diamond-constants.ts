// Diamond contract constants for the Ponder indexer
// Auto-updated by unified-deploy.ts script
// Last updated: 2026-03-21T02:16:34.316Z

export const DIAMOND_ADDRESS: `0x${string}` =
  '0xDA8D2eAF06d53c22B832934e3F9b26A3E93EF3ed';

export const DIAMOND_DEPLOY_BLOCK = 39145529;

// Chain configuration
export const CHAIN_ID = Number(process.env.CHAIN_ID || 84532); // Default: Base Sepolia (84532), Prod: Arbitrum One (42161)
export const CHAIN_NAME = process.env.CHAIN_NAME || 'baseSepolia'; // Default: baseSepolia, Prod: arbitrumOne
