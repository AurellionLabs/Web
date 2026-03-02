// Auto-generated Ponder config - DO NOT EDIT
// Generated at: 2026-03-02T06:49:40.890Z

import { createConfig } from 'ponder';

// Import generated ABIs
import { DiamondABI } from './abis/generated';


// Import chain constants
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';
import {
  NEXT_PUBLIC_RPC_URL_84532,
  NEXT_PUBLIC_CLOB_V2_DIAMOND_ADDRESS,
} from './chain-constants';

const BASE_SEPOLIA_CHAIN_ID = 84532;
// CLOB V2 Diamond deploy block (2026-03-02)
const CLOB_V2_DEPLOY_BLOCK = 38344179;

export default createConfig({
  chains: {
    baseSepolia: {
      id: BASE_SEPOLIA_CHAIN_ID,
      rpc: NEXT_PUBLIC_RPC_URL_84532,
    },
  },
  contracts: {
    // Main Diamond — P2P, logistics, nodes, staking, assets
    Diamond: {
      chain: 'baseSepolia',
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    // CLOB V2 Diamond — limit orders, matching, circuit breaker, MEV
    ClobDiamond: {
      chain: 'baseSepolia',
      abi: DiamondABI,
      address: NEXT_PUBLIC_CLOB_V2_DIAMOND_ADDRESS as `0x${string}`,
      startBlock: CLOB_V2_DEPLOY_BLOCK,
    },
  },
});
