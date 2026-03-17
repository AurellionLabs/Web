import { DiamondABI } from './abis/generated';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:aurellion_secure_2026@localhost:5432/ponder_indexer';

const CHAIN_NAME_BY_ID: Record<number, string> = {
  42161: 'arbitrumOne',
  84532: 'baseSepolia',
  8453: 'base',
  11155111: 'sepolia',
};

type RuntimeEnv = Record<string, string | undefined>;

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getRpcUrl(env: RuntimeEnv, chainId: number): string {
  return env.PONDER_RPC_URL || env[`NEXT_PUBLIC_RPC_URL_${chainId}`] || '';
}

function getDiamondAddress(env: RuntimeEnv): `0x${string}` {
  return (env.DIAMOND_ADDRESS ||
    env.NEXT_PUBLIC_DIAMOND_ADDRESS ||
    '0x0000000000000000000000000000000000000000') as `0x${string}`;
}

export function resolveIndexerRuntimeConfig(env: RuntimeEnv = process.env) {
  const chainId = parseNumber(env.CHAIN_ID, 84532);
  const chainName =
    env.CHAIN_NAME || CHAIN_NAME_BY_ID[chainId] || `chain_${chainId}`;
  const rpc = getRpcUrl(env, chainId);
  const diamondAddress = getDiamondAddress(env);
  const startBlock = parseNumber(env.DIAMOND_DEPLOY_BLOCK, 0);

  return {
    chain: {
      id: chainId,
      name: chainName,
      rpc,
    },
    contracts: {
      Diamond: {
        chain: chainName,
        abi: DiamondABI,
        address: diamondAddress,
        startBlock,
      },
    },
    database: {
      connectionString: env.DATABASE_URL || DEFAULT_DATABASE_URL,
      schema: env.DATABASE_SCHEMA || 'public',
    },
  };
}
