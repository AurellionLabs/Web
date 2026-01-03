import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import ABIs
import { DiamondABI } from './abis/DiamondABI';
import { AusysAbi } from './abis/AusysAbi';
import { AurumNodeManagerAbi } from './abis/AurumNodeManagerAbi';
import { AuraAssetAbi } from './abis/AuraAssetAbi';
import { AuStakeAbi } from './abis/AuStakeAbi';
import { CLOBAbi } from './abis/CLOBAbi';

// Import Diamond constants
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Helper to get contract address from env or default to zero address
function getAddress(
  envVar: string | undefined,
  defaultAddress: string,
): `0x${string}` {
  return (envVar as `0x${string}`) || (defaultAddress as `0x${string}`);
}

// Helper to get start block from env or default to 0
function getStartBlock(
  envVar: string | undefined,
  defaultBlock: number,
): number {
  return envVar ? parseInt(envVar, 10) : defaultBlock;
}

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
    // Diamond - Single proxy that delegates to all facets
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
      address: getAddress(
        process.env.NEXT_PUBLIC_AUSYS_ADDRESS,
        '0x0000000000000000000000000000000000000000',
      ),
      startBlock: getStartBlock(process.env.AUSYS_START_BLOCK, 0),
    },
    AurumNodeManager: {
      network: 'baseSepolia',
      abi: AurumNodeManagerAbi,
      address: getAddress(
        process.env.NEXT_PUBLIC_AURUM_NODE_MANAGER_ADDRESS,
        '0x0000000000000000000000000000000000000000',
      ),
      startBlock: getStartBlock(process.env.AURUM_START_BLOCK, 0),
    },
    AuraAsset: {
      network: 'baseSepolia',
      abi: AuraAssetAbi,
      address: getAddress(
        process.env.NEXT_PUBLIC_AURA_ASSET_ADDRESS,
        '0x0000000000000000000000000000000000000000',
      ),
      startBlock: getStartBlock(process.env.AURA_ASSET_START_BLOCK, 0),
    },
    AuStake: {
      network: 'baseSepolia',
      abi: AuStakeAbi,
      address: getAddress(
        process.env.NEXT_PUBLIC_AUSTAKE_ADDRESS,
        '0x0000000000000000000000000000000000000000',
      ),
      startBlock: getStartBlock(process.env.AUSTAKE_START_BLOCK, 0),
    },
    CLOB: {
      network: 'baseSepolia',
      abi: CLOBAbi,
      address: getAddress(
        process.env.NEXT_PUBLIC_CLOB_ADDRESS,
        '0x0000000000000000000000000000000000000000',
      ),
      startBlock: getStartBlock(process.env.CLOB_START_BLOCK, 0),
    },
  },
});
