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

// Helper function to get RPC URL from environment or fallback to default
const getRpcUrl = (chainId: number, fallback: string): string => {
  const envKey = `NEXT_PUBLIC_RPC_URL_${chainId}`;
  return process.env[envKey] || fallback;
};

// Keep numeric keys for network configs since they're used for display/RPC
export const NETWORK_CONFIGS: { [chainId: number]: NetworkConfig } = {
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: getRpcUrl(
      42161,
      'https://arbitrum-mainnet.infura.io/v3/5ce3f0a2d7814e3c9da96f8e8ebf4d0c',
    ),
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
    rpcUrl: getRpcUrl(
      84532,
      'https://base-sepolia.infura.io/v3/5ce3f0a2d7814e3c9da96f8e8ebf4d0c',
    ),
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
    rpcUrl: getRpcUrl(
      8453,
      'https://base-mainnet.infura.io/v3/5ce3f0a2d7814e3c9da96f8e8ebf4d0c',
    ),
    currency: {
      name: 'Base Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://basescan.org',
  },
};
