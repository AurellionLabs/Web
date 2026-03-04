// Auto-generated Ponder config
// Supports multi-chain via environment variables

import { createConfig } from 'ponder';

// Import generated ABIs
import { DiamondABI } from './abis/generated';

// Import chain constants (now env-var configurable)
import {
  DIAMOND_ADDRESS,
  DIAMOND_DEPLOY_BLOCK,
  CHAIN_ID,
  CHAIN_NAME,
} from './diamond-constants';

import { resolveDeployBlock } from './resolve-deploy-block';

// RPC URL from environment - prefer the one matching our chain ID
const RPC_URL =
  process.env.PONDER_RPC_URL ||
  process.env.SEP_RPC_URL || // Base Sepolia
  (CHAIN_ID === 84532 ? process.env.NEXT_PUBLIC_RPC_URL_84532 : '') ||
  (CHAIN_ID === 42161 ? process.env.NEXT_PUBLIC_RPC_URL_42161 : '') ||
  '';

if (!RPC_URL) {
  throw new Error(
    'No RPC URL configured. Set PONDER_RPC_URL or NEXT_PUBLIC_RPC_URL_<chainId>',
  );
}

// Resolve start block dynamically at startup:
//   1. If DIAMOND_DEPLOY_BLOCK is set explicitly (env or constant), use it
//   2. Otherwise query explorer API for contract creation block
//   3. Fallback: binary search eth_getCode via RPC
//   4. Fallback: first transaction to address
//   5. Final fallback: hardcoded per-chain defaults
const HARDCODED_FALLBACK = CHAIN_ID === 84532 ? 35859000 : 100000000;

const START_BLOCK =
  DIAMOND_DEPLOY_BLOCK > 0
    ? DIAMOND_DEPLOY_BLOCK
    : await resolveDeployBlock({
        address: DIAMOND_ADDRESS,
        chainId: CHAIN_ID,
        rpcUrl: RPC_URL,
        fallback: HARDCODED_FALLBACK,
        explorerApiKey: process.env.EXPLORER_API_KEY,
      });

export default createConfig({
  chains: {
    [CHAIN_NAME]: {
      id: CHAIN_ID,
      rpc: RPC_URL,
    },
  },
  contracts: {
    Diamond: {
      chain: CHAIN_NAME as 'baseSepolia',
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: START_BLOCK,
    },
  },
});
