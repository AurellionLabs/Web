import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import ABIs
import { DiamondABI } from './abis/DiamondABI';

// Import Diamond address from chain-constants
import { NEXT_PUBLIC_DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from '../chain-constants';

// Base Sepolia Chain ID
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Diamond proxy address (from chain-constants)
const DIAMOND_ADDRESS = NEXT_PUBLIC_DIAMOND_ADDRESS as `0x${string}`;

// Deployment block for the Diamond (from chain-constants)
const DIAMOND_DEPLOY_BLOCK = DIAMOND_DEPLOY_BLOCK;

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
  },
});
