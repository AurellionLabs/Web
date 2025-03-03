export const SUPPORTED_CHAINS = [42161, 11155111]; // Arbitrum One and Sepolia

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

export const NETWORK_CONFIGS: { [chainId: number]: NetworkConfig } = {
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
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
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
    currency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorer: 'https://sepolia.etherscan.io',
  },
};
