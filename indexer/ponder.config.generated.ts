// Auto-generated Ponder config - DO NOT EDIT
// Generated at: 2026-01-16T19:32:37.913Z

import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import generated ABIs
import { NodesFacetABI } from './abis/generated/NodesFacet';
import { CLOBFacetV2ABI } from './abis/generated/CLOBFacetV2';
import { OrderMatchingFacetABI } from './abis/generated/OrderMatchingFacet';
import { OrderRouterFacetABI } from './abis/generated/OrderRouterFacet';
import { BridgeFacetABI } from './abis/generated/BridgeFacet';
import { StakingFacetABI } from './abis/generated/StakingFacet';
import { CLOBAdminFacetABI } from './abis/generated/CLOBAdminFacet';
import { DiamondCutFacetABI } from './abis/generated/DiamondCutFacet';
import { OwnershipFacetABI } from './abis/generated/OwnershipFacet';

// Import chain constants
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';
import {
  NEXT_PUBLIC_RPC_URL_84532,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_RWY_VAULT_ADDRESS,
  AURA_ASSET_DEPLOY_BLOCK,
  RWY_VAULT_DEPLOY_BLOCK,
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
    NodesFacet: {
      network: 'baseSepolia',
      abi: NodesFacetABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    CLOBFacetV2: {
      network: 'baseSepolia',
      abi: CLOBFacetV2ABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    OrderMatchingFacet: {
      network: 'baseSepolia',
      abi: OrderMatchingFacetABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    OrderRouterFacet: {
      network: 'baseSepolia',
      abi: OrderRouterFacetABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    BridgeFacet: {
      network: 'baseSepolia',
      abi: BridgeFacetABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    StakingFacet: {
      network: 'baseSepolia',
      abi: StakingFacetABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    CLOBAdminFacet: {
      network: 'baseSepolia',
      abi: CLOBAdminFacetABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    DiamondCutFacet: {
      network: 'baseSepolia',
      abi: DiamondCutFacetABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    OwnershipFacet: {
      network: 'baseSepolia',
      abi: OwnershipFacetABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
  },
});
