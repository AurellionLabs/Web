import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import ABIs
import { AusysAbi } from './abis/AusysAbi';
import { AurumNodeManagerAbi } from './abis/AurumNodeManagerAbi';
import { AuraAssetAbi } from './abis/AuraAssetAbi';
import { AuStakeAbi } from './abis/AuStakeAbi';
import { CLOBAbi } from './abis/CLOBAbi';

// Base Sepolia Chain ID: 84532
const BASE_SEPOLIA_CHAIN_ID = 84532;

export default createConfig({
  networks: {
    baseSepolia: {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      transport: http(process.env.PONDER_RPC_URL_84532),
    },
  },
  contracts: {
    // AuSys Contract - Orders, Journeys, Signatures, Settlements
    Ausys: {
      network: 'baseSepolia',
      abi: AusysAbi,
      address: '0x986dC5647390e40AB9c0429ceE017034D42CB3bA' as `0x${string}`,
      startBlock: 32311125,
    },
    // AurumNodeManager Contract - Nodes, NodeAssets, Capacity
    AurumNodeManager: {
      network: 'baseSepolia',
      abi: AurumNodeManagerAbi,
      address: '0x5Dd5881fFa8fb3c4fAD112ffc4a37f0300dd1835' as `0x${string}`,
      startBlock: 32311127,
    },
    // AuraAsset Contract - ERC1155 Assets, Transfers, Balances
    AuraAsset: {
      network: 'baseSepolia',
      abi: AuraAssetAbi,
      address: '0x510fD569817b442318537f36F936e0F1719478a6' as `0x${string}`,
      startBlock: 32311131,
    },
    // AuStake Contract - Operations, Stakes, Rewards
    AuStake: {
      network: 'baseSepolia',
      abi: AuStakeAbi,
      address: '0xCBfb27e1c7d74e1c0E865ec47C1DBC0016C0bc07' as `0x${string}`,
      startBlock: 32311129,
    },
    // CLOB Contract - Central Limit Order Book (to be deployed)
    // Uncomment and update address after deployment
    // CLOB: {
    //   network: "baseSepolia",
    //   abi: CLOBAbi,
    //   address: "0x..." as `0x${string}`,
    //   startBlock: 0,
    // },
  },
});
