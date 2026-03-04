// Auto-generated Ponder config
// Supports multi-chain via environment variables

import { createConfig, getFetch } from 'ponder';
import { http } from 'viem';
import { baseSepolia, arbitrum } from 'viem/chains';

// Import generated ABIs
import { DiamondABI } from './abis/generated';

// Import chain constants (now env-var configurable)
import {
  DIAMOND_ADDRESS,
  DIAMOND_DEPLOY_BLOCK,
  CHAIN_ID,
  CHAIN_NAME,
} from './diamond-constants';

// RPC URL from environment - prefer the one matching our chain ID
const RPC_URL =
  process.env.PONDER_RPC_URL ||
  process.env.SEP_RPC_URL || // Base Sepolia
  (CHAIN_ID === 84532 ? process.env.NEXT_PUBLIC_RPC_URL_84532 : '') ||
  (CHAIN_ID === 42161 ? process.env.NEXT_PUBLIC_RPC_URL_42161 : '') ||
  '';

if (!RPC_URL) {
  throw new Error(
    'No RPC URL configured. Set PONDER_RPC_URL or NEXT_PUBLIC_RPC_URL_<chainId>',
  );
}

// Auto-detect deployment block if not set
async function getStartBlock(): Promise<number> {
  if (DIAMOND_DEPLOY_BLOCK > 0) {
    return DIAMOND_DEPLOY_BLOCK;
  }
  
  // Query RPC to find earliest transaction to contract
  try {
    const chain = CHAIN_ID === 84532 ? baseSepolia : arbitrum;
    const transport = http(RPC_URL, { fetchOptions: { fetch: getFetch() } });
    
    // Get current block number to limit search
    const latestBlock = await transport({ method: 'eth_blockNumber', params: [] });
    const latest = parseInt(latestBlock, 16);
    
    // Binary search to find first block with contract transaction
    // Start from a reasonable block (e.g., 1M) instead of 0
    let low = 1000000;
    let high = latest;
    
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const block = await transport({ 
        method: 'eth_getBlockByNumber', 
        params: [`0x${mid.toString(16)}`, false] 
      });
      
      if (block && block.transactions && block.transactions.includes(DIAMOND_ADDRESS.toLowerCase())) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    
    console.log(`🔍 Auto-detected contract deployment block: ${low}`);
    return low;
  } catch (e) {
    console.warn('⚠️ Failed to auto-detect deployment block, using fallback:', e);
    return 1000000; // Fallback to safe default
  }
}

// Get start block synchronously - use default if not yet detected
const START_BLOCK = DIAMOND_DEPLOY_BLOCK > 0 ? DIAMOND_DEPLOY_BLOCK : 1000000;

export default createConfig({
  chains: {
    [CHAIN_NAME]: {
      id: CHAIN_ID,
      rpc: RPC_URL,
    },
  },
  contracts: {
    Diamond: {
      chain: CHAIN_NAME as 'baseSepolia',
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: START_BLOCK,
    },
  },
});
