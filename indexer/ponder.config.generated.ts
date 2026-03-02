// Auto-generated Ponder config - DO NOT EDIT
// Generated at: 2026-03-02T06:37:34.861Z

import { createConfig } from 'ponder';

// Import generated ABIs
import { DiamondABI } from './abis/generated';


// Import chain constants
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';
import {
  NEXT_PUBLIC_RPC_URL_84532,
} from './chain-constants';

const BASE_SEPOLIA_CHAIN_ID = 84532;

export default createConfig({
  chains: {
    baseSepolia: {
      id: BASE_SEPOLIA_CHAIN_ID,
      rpc: NEXT_PUBLIC_RPC_URL_84532,
    },
  },
  contracts: {
    Diamond: {
      chain: 'baseSepolia',
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    }
  },
});
