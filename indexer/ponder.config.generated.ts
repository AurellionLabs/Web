// Auto-generated Ponder config - DO NOT EDIT
// Generated at: 2026-01-18T11:06:09.376Z

import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import generated ABIs
import { DiamondABI } from './abis/generated';
import { AuraAssetABI } from './abis/generated/AuraAsset';


// Import chain constants
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';
import {
  NEXT_PUBLIC_RPC_URL_84532,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  AURA_ASSET_DEPLOY_BLOCK,
} from './chain-constants';

const BASE_SEPOLIA_CHAIN_ID = 84532;

export default createConfig({
  networks: {
    baseSepolia: {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      transport: http(NEXT_PUBLIC_RPC_URL_84532),
    },
  },
  contracts: {
    Diamond: {
      network: 'baseSepolia',
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    AuraAsset: {
      network: 'baseSepolia',
      abi: AuraAssetABI,
      address: NEXT_PUBLIC_AURA_ASSET_ADDRESS as `0x${string}`,
      startBlock: AURA_ASSET_DEPLOY_BLOCK,
    }
  },
});
