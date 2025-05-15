import { ethers } from 'ethers';

export const AUSYS_CONTRACT_ADDRESS = '0x...'; // This should be replaced with the actual deployed contract address

export const AUSYS_ABI = [
  'event emitSig(address indexed user, bytes32 indexed id)',
  'function packageSign(address driver, address sender, bytes32 id) public',
  // Add other necessary contract functions
] as const;
