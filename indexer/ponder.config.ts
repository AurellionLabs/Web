import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import ABIs
import { DiamondABI } from './abis/DiamondABI';
import { AusysAbi } from './abis/AusysAbi';
import { AurumNodeManagerAbi } from './abis/AurumNodeManagerAbi';
import { AuraAssetAbi } from './abis/AuraAssetAbi';
import { AuStakeAbi } from './abis/AuStakeAbi';
import { CLOBAbi } from './abis/CLOBAbi';
import { RWYVaultAbi } from './abis/RWYVault';

// Import constants from diamond-constants (auto-updated by deploy script)
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';

// Import contract addresses and deployment blocks from chain-constants
import {
  NEXT_PUBLIC_AUSYS_ADDRESS,
  NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_AUSTAKE_ADDRESS,
  NEXT_PUBLIC_CLOB_ADDRESS,
  NEXT_PUBLIC_RWY_VAULT_ADDRESS,
  NEXT_PUBLIC_RPC_URL_84532,
  DEPLOYMENT_BLOCKS,
} from '../chain-constants';

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

export default createConfig({
  cors: {
    origins: [
      'https://aurellionlabs.com',
      'https://www.aurellionlabs.com',
      /https:\/\/web-.*-aurellion\.vercel\.app/,
      'https://indexer.aurellionlabs.com',
      'http://localhost:3000',
    ],
  },
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
    CLOB: {
      network: 'baseSepolia',
      abi: CLOBAbi,
      address: NEXT_PUBLIC_CLOB_ADDRESS as `0x${string}`,
      startBlock: DEPLOYMENT_BLOCKS.clob,
    },
    // RWY Vault - Real World Yield commodity staking
    RWYVault: {
      network: 'baseSepolia',
      abi: RWYVaultAbi,
      address: NEXT_PUBLIC_RWY_VAULT_ADDRESS as `0x${string}`,
      startBlock: DEPLOYMENT_BLOCKS.rwyVault,
    },
  },
});
