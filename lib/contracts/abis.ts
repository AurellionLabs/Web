/**
 * Contract ABIs with full type inference
 * 
 * This file exports ABIs from the extracted-abis.json file which is committed
 * to the repository. The ABIs are extracted from Hardhat artifacts after compilation.
 * 
 * To update ABIs after contract changes:
 *   1. Run `npx hardhat compile`
 *   2. Run `npm run extract-abis`
 * 
 * Usage with ethers:
 *   import { AurumNodeManagerABI } from '@/lib/contracts/abis';
 *   const contract = new ethers.Contract(address, AurumNodeManagerABI, signer);
 */

import extractedAbis from './extracted-abis.json';

// Type for ABI entries
type AbiItem = {
  type: string;
  name?: string;
  inputs?: { name: string; type: string; indexed?: boolean; internalType?: string }[];
  outputs?: { name: string; type: string; internalType?: string }[];
  stateMutability?: string;
  anonymous?: boolean;
};

// Export ABIs
export const AurumNodeManagerABI: AbiItem[] = extractedAbis.AurumNodeManager;
export const AurumNodeABI: AbiItem[] = extractedAbis.AurumNode;
export const AuraAssetABI: AbiItem[] = extractedAbis.AuraAsset;
export const AuStakeABI: AbiItem[] = extractedAbis.AuStake;
export const AusysABI: AbiItem[] = extractedAbis.Ausys;
export const AuraGoatRedABI: AbiItem[] = extractedAbis.AuraGoatRed;
export const CLOBABI: AbiItem[] = extractedAbis.CLOB;
export const OrderBridgeABI: AbiItem[] = extractedAbis.OrderBridge;
export const RWYVaultABI: AbiItem[] = extractedAbis.RWYVault;
export const RWYStakingFacetABI: AbiItem[] =
  (extractedAbis as any).RWYStakingFacet || [];

// Diamond ABIs
export const DiamondABI: AbiItem[] = extractedAbis.Diamond;
export const DiamondCutFacetABI: AbiItem[] = extractedAbis.DiamondCutFacet;
export const DiamondLoupeFacetABI: AbiItem[] = extractedAbis.DiamondLoupeFacet;
export const OwnershipFacetABI: AbiItem[] = extractedAbis.OwnershipFacet;

// Export all ABIs as a single object
export const ContractABIs = extractedAbis;
