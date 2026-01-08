import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import generated ABI from code generator
import { DiamondABI } from './abis/generated';
import { AuraAssetABI } from './abis/generated/AuraAsset';

// Import constants
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';
import {
  NEXT_PUBLIC_RPC_URL_84532,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
} from './chain-constants';
import { DEPLOYMENT_BLOCKS } from './chain-constants';

const BASE_SEPOLIA_CHAIN_ID = 84532;

export default createConfig({
  networks: {
    baseSepolia: {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      transport: http(NEXT_PUBLIC_RPC_URL_84532),
    },
  },
  contracts: {
    // Diamond - Single proxy for all functionality
    // Uses generated ABI with deduplicated events from all facets
    Diamond: {
      network: 'baseSepolia',
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    // AuraAsset - ERC1155 asset contract
    AuraAsset: {
      network: 'baseSepolia',
      abi: AuraAssetABI,
      address: NEXT_PUBLIC_AURA_ASSET_ADDRESS as `0x${string}`,
      startBlock: BigInt(DEPLOYMENT_BLOCKS.auraAsset),
    },
  },
});
