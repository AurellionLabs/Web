// Diamond contract constants for the Ponder indexer
// Configurable via environment variables for multi-chain support

export const DIAMOND_ADDRESS: `0x${string}` = (process.env.DIAMOND_ADDRESS ||
  '0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7') as `0x${string}`; // Default: Base Sepolia

export const DIAMOND_DEPLOY_BLOCK = Number(
  process.env.DIAMOND_DEPLOY_BLOCK || 0, // 0 = auto-detect from chain
);

// Chain configuration
export const CHAIN_ID = Number(process.env.CHAIN_ID || 84532); // Default: Base Sepolia (84532), Prod: Arbitrum One (42161)
export const CHAIN_NAME = process.env.CHAIN_NAME || 'baseSepolia'; // Default: baseSepolia, Prod: arbitrumOne
