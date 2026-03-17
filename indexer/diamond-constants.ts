// Diamond contract constants for the Ponder indexer
// Auto-updated by unified-deploy.ts script
// Last updated: 2026-03-17T10:09:33.605Z

export const DIAMOND_ADDRESS: `0x${string}` =
  '0x0Adc63e71B035d5c7FDB1B4593999FA1F296f1B2';

export const DIAMOND_DEPLOY_BLOCK = 442701508;

// Chain configuration
export const CHAIN_ID = Number(process.env.CHAIN_ID || 84532); // Default: Base Sepolia (84532), Prod: Arbitrum One (42161)
export const CHAIN_NAME = process.env.CHAIN_NAME || 'baseSepolia'; // Default: baseSepolia, Prod: arbitrumOne
