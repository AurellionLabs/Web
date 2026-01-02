import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@typechain/hardhat';
import 'dotenv/config';
import 'tsconfig-paths/register';

const config: HardhatUserConfig = {
  paths: {
    sources: './contracts',
    tests: './test/repositories',
    cache: './cache',
    artifacts: './artifacts',
  },
  solidity: {
    version: '0.8.28',
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEP_RPC_URL || '',
      accounts: process.env.SEP_PRIVATE_KEY
        ? [process.env.SEP_PRIVATE_KEY]
        : [],
    },
    arbitrum: {
      url: process.env.ARB_RPC_URL || '',
      accounts: process.env.ARB_PRIVATE_KEY
        ? [process.env.ARB_PRIVATE_KEY]
        : [],
    },
    arbitrumSepolia: {
      url:
        process.env.ARB_SEP_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: process.env.ARB_SEP_PRIVATE_KEY
        ? [process.env.ARB_SEP_PRIVATE_KEY]
        : [],
      chainId: 421614,
    },
    baseTest: {
      url: process.env.BASE_TEST_RPC_URL || '',
      accounts: process.env.SEP_PRIVATE_KEY
        ? [process.env.SEP_PRIVATE_KEY]
        : [],
    },
    baseSepolia: {
      url: process.env.BASE_TEST_RPC_URL || 'https://sepolia.base.org',
      accounts: process.env.SEP_PRIVATE_KEY
        ? [process.env.SEP_PRIVATE_KEY]
        : [],
      chainId: 84532,
    },
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || '',
      baseSepolia: process.env.BASESCAN_API_KEY || '',
      sepolia: process.env.ETHERSCAN_API_KEY || '',
    },
  },
};

export default config;
