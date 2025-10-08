import { ethers } from 'ethers';
import AusysArtifact from '../../artifacts/contracts/AuSys.sol/Ausys.json';

export const AUSYS_CONTRACT_ADDRESS = '0x...'; // This should be replaced with the actual deployed contract address

// Use the full ABI from the compiled contract
export const AUSYS_ABI = AusysArtifact.abi;
