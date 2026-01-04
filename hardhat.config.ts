import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import 'dotenv/config';

task('get-selectors', 'Print function selectors').setAction(
  async (args, hre) => {
    const OrdersFacet = await hre.ethers.getContractFactory('OrdersFacet');
    const CLOBFacet = await hre.ethers.getContractFactory('CLOBFacet');

    console.log('OrdersFacet selectors:');
    console.log(
      '  createOrder:',
      OrdersFacet.interface.getFunction('createOrder')?.selector,
    );
    console.log(
      '  cancelOrder:',
      OrdersFacet.interface.getFunction('cancelOrder')?.selector,
    );
    console.log(
      '  getOrder:',
      OrdersFacet.interface.getFunction('getOrder')?.selector,
    );
    console.log(
      '  updateOrderStatus:',
      OrdersFacet.interface.getFunction('updateOrderStatus')?.selector,
    );

    console.log('\nCLOBFacet selectors:');
    console.log(
      '  createMarket:',
      CLOBFacet.interface.getFunction('createMarket')?.selector,
    );
    console.log(
      '  placeOrder:',
      CLOBFacet.interface.getFunction('placeOrder')?.selector,
    );
    console.log(
      '  cancelOrder:',
      CLOBFacet.interface.getFunction('cancelOrder')?.selector,
    );
    console.log(
      '  getOrder:',
      CLOBFacet.interface.getFunction('getOrder')?.selector,
    );
  },
);

const config: HardhatUserConfig = {
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
  defaultNetwork: 'baseSepolia',
  networks: {
    hardhat: {
      chainId: 84532,
    },
    baseSepolia: {
      url: process.env.BASE_TEST_RPC_URL || 'https://sepolia.base.org',
      accounts: process.env.SEP_PRIVATE_KEY
        ? [process.env.SEP_PRIVATE_KEY]
        : process.env.PRIVATE_KEY
          ? [process.env.PRIVATE_KEY]
          : [],
      chainId: 84532,
      gas: 'auto',
      gasPrice: 'auto',
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || '',
      base: process.env.BASESCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolias.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
    ],
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  paths: {
    tests: './test/foundry',
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;
