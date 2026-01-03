import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import ABIs
import { AusysAbi } from './abis/AusysAbi';
import { AurumNodeManagerAbi } from './abis/AurumNodeManagerAbi';
import { AuraAssetAbi } from './abis/AuraAssetAbi';
import { AuStakeAbi } from './abis/AuStakeAbi';
import { CLOBAbi } from './abis/CLOBAbi';
import { OrderBridgeAbi } from './abis/OrderBridgeAbi';

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Contract addresses - Updated with fresh deployment (Jan 3, 2026)
const CONTRACTS = {
  ausys: '0xCfeE7c48315c35325CEC9721A9aad46C372439D7' as `0x${string}`,
  aurumNodeManager:
    '0x5a1A031f66612906CA81c73153ec572DB4C3814B' as `0x${string}`,
  auraAsset: '0xE28388bC599aCFd63B6722E467A252973176C87F' as `0x${string}`,
  auStake: '0x1310fe679b58d10764E6Dd636a640139bD083cB2' as `0x${string}`,
  clob: '0x2b9D42594Bb18FAFaA64FFEC4f5e69C8ac328aAc' as `0x${string}`,
  orderBridge: '0x0000000000000000000000000000000000000000' as `0x${string}`, // TODO: Deploy
};

const START_BLOCKS = {
  ausys: 35850000, // TODO: Update with actual deployment block
  aurumNodeManager: 35850002, // TODO: Update with actual deployment block
  auraAsset: 35850004, // TODO: Update with actual deployment block
  auStake: 35850006, // TODO: Update with actual deployment block
  clob: 35771333, // Existing CLOB deployment
  orderBridge: 0,
};

export default createConfig({
  cors: {
    origins: [
      'https://aurellionlabs.com',
      'https://www.aurellionlabs.com',
      'https://web-gk8i9h3wk-aurellion.vercel.app',
      'https://indexer.aurellionlabs.com',
    ],
  },
  networks: {
    baseSepolia: {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      transport: http(
        process.env.NEXT_PUBLIC_RPC_URL_84532 ||
          process.env.BASE_TEST_RPC_URL ||
          'https://base-sepolia.infura.io/v3/281dfd93e10842199b64ed6f3535fa4c',
      ),
    },
  },
  contracts: {
    // AuSys Contract - Orders, Journeys, Signatures, Settlements
    Ausys: {
      network: 'baseSepolia',
      abi: AusysAbi,
      address: CONTRACTS.ausys,
      startBlock: START_BLOCKS.ausys,
    },
    // AurumNodeManager Contract - Nodes, NodeAssets, Capacity
    AurumNodeManager: {
      network: 'baseSepolia',
      abi: AurumNodeManagerAbi,
      address: CONTRACTS.aurumNodeManager,
      startBlock: START_BLOCKS.aurumNodeManager,
    },
    // AuraAsset Contract - ERC1155 Assets, Transfers, Balances
    AuraAsset: {
      network: 'baseSepolia',
      abi: AuraAssetAbi,
      address: CONTRACTS.auraAsset,
      startBlock: START_BLOCKS.auraAsset,
    },
    // AuStake Contract - Operations, Stakes, Rewards
    AuStake: {
      network: 'baseSepolia',
      abi: AuStakeAbi,
      address: CONTRACTS.auStake,
      startBlock: START_BLOCKS.auStake,
    },
    // CLOB Contract - Central Limit Order Book
    CLOB: {
      network: 'baseSepolia',
      abi: CLOBAbi,
      address: CONTRACTS.clob,
      startBlock: START_BLOCKS.clob,
    },
    // OrderBridge Contract - Unified order flow (CLOB → Ausys)
    OrderBridge: {
      network: 'baseSepolia',
      abi: OrderBridgeAbi,
      address: CONTRACTS.orderBridge,
      startBlock: START_BLOCKS.orderBridge,
    },
  },
});
