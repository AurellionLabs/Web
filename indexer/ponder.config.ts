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

// Optimization settings - configurable via environment variables
// Polling interval in milliseconds (optimized: 3500ms = 3.5 seconds)
// Base Sepolia has ~2 second block time, but polling every 3.5s reduces RPC calls by ~43%
// while still catching all blocks (we'll process multiple blocks per poll)
// Increasing this further reduces RPC calls but increases latency
const POLLING_INTERVAL_MS = parseInt(
  process.env.PONDER_POLLING_INTERVAL_MS || '3500',
  10,
);

// Max block range per RPC request (optimized: 5000 blocks)
// Larger ranges = fewer RPC calls but more data per call
// Increased from 2000 to 5000 to reduce call frequency by 60%
const MAX_BLOCK_RANGE = parseInt(
  process.env.PONDER_MAX_BLOCK_RANGE || '5000',
  10,
);

// RPC batch wait time - how long to wait to batch requests (optimized: 100ms)
// Longer wait = better batching but slightly higher latency
const RPC_BATCH_WAIT_MS = parseInt(
  process.env.PONDER_RPC_BATCH_WAIT_MS || '100',
  10,
);

// Contract addresses - Updated with fresh deployment (Jan 1, 2026)
const CONTRACTS = {
  ausys: '0x84dC0BB1098aE6F4777C33F1C6221f11725EEfde' as `0x${string}`,
  aurumNodeManager: '0xc50F6505BcBb00Af8f1086d9121525695Bf09D30' as `0x${string}`,
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
  networks: {
    baseSepolia: {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      // Optimize RPC transport with batching and retry settings
      transport: http(
        process.env.NEXT_PUBLIC_RPC_URL_84532 ||
          process.env.BASE_TEST_RPC_URL ||
          'https://base-sepolia.infura.io/v3/281dfd93e10842199b64ed6f3535fa4c',
        {
          // Batch multiple RPC requests together to reduce overhead
          // Optimized: Increased wait time for better batching
          batch: {
            multicall: true,
            wait: RPC_BATCH_WAIT_MS, // Wait 100ms to batch requests (optimized from 50ms)
          },
          // Retry configuration to handle transient failures
          retryCount: 3,
          retryDelay: 1000, // 1 second delay between retries
          // Timeout settings to prevent hanging requests
          timeout: 30000, // 30 second timeout
        },
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
      // Optimize: Only index events we actually need
      // Ponder will automatically filter events based on handlers
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
  // Global optimization settings
  options: {
    // Polling interval - how often to check for new blocks
    // Optimized: 3500ms (3.5 seconds) reduces RPC calls by ~43% vs 2000ms
    // Base Sepolia has ~2 second block time, but we process multiple blocks per poll
    // This still catches all blocks while significantly reducing API calls
    pollingInterval: POLLING_INTERVAL_MS,
    // Maximum block range per RPC request
    // Optimized: 5000 blocks (up from 2000) reduces call frequency by 60%
    // Larger ranges = fewer calls but more data per call
    maxBlockRange: MAX_BLOCK_RANGE,
  },
});
