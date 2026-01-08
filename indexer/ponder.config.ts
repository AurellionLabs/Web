import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import ABIs
import { DiamondABI } from './abis/DiamondABI';
import { AusysAbi } from './abis/AusysAbi';
import { AurumNodeManagerAbi } from './abis/AurumNodeManagerAbi';
import { AuraAssetAbi } from './abis/AuraAssetAbi';
import { AuStakeAbi } from './abis/AuStakeAbi';
// CLOBAbi no longer needed - CLOB functionality now in Diamond CLOBFacet
// import { CLOBAbi } from './abis/CLOBAbi';
import { RWYVaultAbi } from './abis/RWYVault';

// Import constants from diamond-constants (auto-updated by deploy script)
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';

// Import contract addresses and deployment blocks from chain-constants
// Note: In Docker, chain-constants.ts is copied to ./chain-constants.ts
// Locally it's at ../chain-constants.ts - we use a symlink or copy
import {
  NEXT_PUBLIC_AUSYS_ADDRESS,
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_AUSTAKE_ADDRESS,
  // NEXT_PUBLIC_CLOB_ADDRESS, // No longer needed - using Diamond CLOBFacet
  NEXT_PUBLIC_RWY_VAULT_ADDRESS,
  NEXT_PUBLIC_RPC_URL_84532,
  DEPLOYMENT_BLOCKS,
} from './chain-constants';

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

export default createConfig({
  // Note: CORS configuration should be handled at the server level (nginx/reverse proxy)
  // or via environment variables if supported by your Ponder version
  networks: {
    baseSepolia: {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      transport: http(NEXT_PUBLIC_RPC_URL_84532),
    },
  },
  contracts: {
    // Diamond - Single proxy that delegates to all facets
    // This is the primary contract for all new functionality
    Diamond: {
      network: 'baseSepolia',
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    // Legacy contracts (for backward compatibility during migration)
    Ausys: {
      network: 'baseSepolia',
      abi: AusysAbi,
      address: NEXT_PUBLIC_AUSYS_ADDRESS as `0x${string}`,
      startBlock: DEPLOYMENT_BLOCKS.auSys,
    },
    AurumNodeManager: {
      network: 'baseSepolia',
      abi: AurumNodeManagerAbi,
      address: NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS as `0x${string}`,
      startBlock: DEPLOYMENT_BLOCKS.aurumNodeManager,
    },
    AuraAsset: {
      network: 'baseSepolia',
      abi: AuraAssetAbi,
      address: NEXT_PUBLIC_AURA_ASSET_ADDRESS as `0x${string}`,
      startBlock: DEPLOYMENT_BLOCKS.auraAsset,
    },
    AuStake: {
      network: 'baseSepolia',
      abi: AuStakeAbi,
      address: NEXT_PUBLIC_AUSTAKE_ADDRESS as `0x${string}`,
      startBlock: DEPLOYMENT_BLOCKS.auStake,
    },
    // CLOB: Disabled - All CLOB functionality now handled by Diamond CLOBFacet
    // The Diamond contract emits OrderPlacedWithTokens events which are indexed
    // by the Diamond:OrderPlacedWithTokens handler in aurum-diamond.ts
    // CLOB: {
    //   network: 'baseSepolia',
    //   abi: CLOBAbi,
    //   address: NEXT_PUBLIC_CLOB_ADDRESS as `0x${string}`,
    //   startBlock: DEPLOYMENT_BLOCKS.clob,
    // },
    // RWY Vault - Real World Yield commodity staking
    RWYVault: {
      network: 'baseSepolia',
      abi: RWYVaultAbi,
      address: NEXT_PUBLIC_RWY_VAULT_ADDRESS as `0x${string}`,
      startBlock: DEPLOYMENT_BLOCKS.rwyVault,
    },
  },
});
