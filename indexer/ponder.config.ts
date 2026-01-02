import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import ABIs
import { AusysAbi } from './abis/AusysAbi';
import { AurumNodeManagerAbi } from './abis/AurumNodeManagerAbi';
import { AuraAssetAbi } from './abis/AuraAssetAbi';
import { AuStakeAbi } from './abis/AuStakeAbi';
import { CLOBAbi } from './abis/CLOBAbi';

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Contract addresses - Updated with fresh deployment (Jan 1, 2026)
const CONTRACTS = {
  ausys: '0x84dC0BB1098aE6F4777C33F1C6221f11725EEfde' as `0x${string}`,
  aurumNodeManager:
    '0xc50F6505BcBb00Af8f1086d9121525695Bf09D30' as `0x${string}`,
  auraAsset: '0xdc1B355885ba73EFf0f0a5A72F12D87e785581a8' as `0x${string}`,
  auStake: '0xd41b6Dc779558bbe674B13F6996BFD5679f75074' as `0x${string}`,
  clob: '0x2b9D42594Bb18FAFaA64FFEC4f5e69C8ac328aAc' as `0x${string}`,
};

const START_BLOCKS = {
  ausys: 35771321,
  aurumNodeManager: 35771324,
  auraAsset: 35771330,
  auStake: 35771327,
  clob: 35771333,
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
  },
});
