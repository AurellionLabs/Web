// Diamond contract constants for the Ponder indexer
// Auto-updated by unified-deploy.ts script
// Last updated: 2026-03-06T12:30:37.401Z

export const DIAMOND_ADDRESS: `0x${string}` =
  '0x77FA5086e44B797F3C82A265ebac98937A258c8e';

export const DIAMOND_DEPLOY_BLOCK = 38515909;

// Chain configuration
export const CHAIN_ID = Number(process.env.CHAIN_ID || 84532); // Default: Base Sepolia (84532), Prod: Arbitrum One (42161)
export const CHAIN_NAME = process.env.CHAIN_NAME || 'baseSepolia'; // Default: baseSepolia, Prod: arbitrumOne
