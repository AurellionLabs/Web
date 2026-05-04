// Auto-generated Ponder config - DO NOT EDIT
// Generated at: 2026-04-17T23:44:28.751Z

import { createConfig } from 'ponder';

// Import generated ABIs
import { DiamondABI } from './abis/generated';


// Import chain constants
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';
import {
  NEXT_PUBLIC_RPC_URL_84532,
  NEXT_PUBLIC_RPC_URL_42161,
} from './chain-constants';
import * as dotenv from 'dotenv';
dotenv.config();


export default createConfig({
  chains: {
    chain_undefined: {
      id: Number(process.env.CHAIN_ID),
      rpc: process.env.PONDER_RPC_URL,
    },
  },
  contracts: {
    Diamond: {
    chain: 'chain_undefined', 
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    }
  },
});
