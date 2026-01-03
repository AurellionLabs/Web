import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import ABIs
import { DiamondABI } from './abis/DiamondABI';
import { CLOBAbi } from './abis/CLOBAbi';

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Diamond proxy address (never changes after deployment)
const DIAMOND_ADDRESS = '0x...' as `0x${string}`;

// Existing CLOB address (if not part of Diamond)
const CLOB_ADDRESS =
  '0x2b9D42594Bb18FAFaA64FFEC4f5e69C8ac328aAc' as `0x${string}`;

// Deployment block for the Diamond
const DIAMOND_DEPLOY_BLOCK = 35850000;

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
    // All node, asset, order, staking, and bridge events come from here
    Diamond: {
      network: 'baseSepolia',
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    },
    // CLOB - External CLOB contract (if separate from Diamond)
    CLOB: {
      network: 'baseSepolia',
      abi: CLOBAbi,
      address: CLOB_ADDRESS,
      startBlock: 35771333,
    },
  },
});
