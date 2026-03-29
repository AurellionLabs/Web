import {
  NEXT_PUBLIC_RPC_URL_42161,
  NEXT_PUBLIC_RPC_URL_8453,
  NEXT_PUBLIC_RPC_URL_84532,
} from '@/chain-constants';

// Keep chain IDs as numbers for simpler comparison
export const SUPPORTED_CHAINS = [
  42161, // Arbitrum One
  11155111, // Sepolia
  84532, // Base Sepolia
  8453, // Base
];

interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
}

const EXPLICIT_RPC_URLS: Record<number, string> = {
  42161: NEXT_PUBLIC_RPC_URL_42161,
  84532: NEXT_PUBLIC_RPC_URL_84532,
  8453: NEXT_PUBLIC_RPC_URL_8453,
};

// Helper function to get RPC URL from explicit public env constants first.
// Dynamic process.env access is unreliable in client bundles.
const getRpcUrl = (chainId: number, fallback: string): string => {
  return EXPLICIT_RPC_URLS[chainId] || fallback;
};

export function getPublicRpcConfigurationError(
  chainId: number | null | undefined,
): string | null {
  if (!chainId) return null;

  const networkConfig = NETWORK_CONFIGS[chainId];
  if (!networkConfig) {
    return `Unsupported public chain: ${chainId}.`;
  }

  if (!networkConfig.rpcUrl) {
    return `Public RPC is not configured for ${networkConfig.name}. Set NEXT_PUBLIC_RPC_URL_${chainId}.`;
  }

  return null;
}

// Keep numeric keys for network configs since they're used for display/RPC
export const NETWORK_CONFIGS: { [chainId: number]: NetworkConfig } = {
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: getRpcUrl(42161, ''),
    currency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://arbiscan.io',
  },
  11155111: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: getRpcUrl(11155111, 'https://sepolia.infura.io/v3/YOUR_KEY'),
    currency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://sepolia.etherscan.io',
  },
  84532: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: getRpcUrl(84532, 'https://sepolia.base.org'),
    currency: {
      name: 'Base Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://sepolia.basescan.org',
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: getRpcUrl(8453, 'https://mainnet.base.org'),
    currency: {
      name: 'Base Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://basescan.org',
  },
};
