/**
 * Contract ABIs with full type inference
 *
 * Uses the Diamond ABI (generated from all facets) as the primary source for
 * Diamond-proxied contracts (Ausys, CLOB, etc). Falls back to extracted ABIs
 * from Hardhat artifacts for standalone contracts.
 *
 * To update ABIs after contract changes:
 *   1. Run `npx hardhat compile`
 *   2. Run `npm run extract-abis` (standalone contracts)
 *   3. Run `npm run contract:gen` (Diamond ABI)
 *
 * Usage with ethers:
 *   import { AusysABI } from '@/lib/contracts/abis';
 *   const contract = new ethers.Contract(address, AusysABI, signer);
 */

import extractedAbis from './extracted-abis.json';
import { DIAMOND_ABI } from '@/infrastructure/contracts/diamond-abi.generated';

// Type for ABI entries
type AbiItem = {
  type: string;
  name?: string;
  inputs?: {
    name: string;
    type: string;
    indexed?: boolean;
    internalType?: string;
  }[];
  outputs?: { name: string; type: string; internalType?: string }[];
  stateMutability?: string;
  anonymous?: boolean;
};

/**
 * Helper: use extracted ABI if non-empty, otherwise fall back to Diamond ABI.
 * This handles the case where Hardhat artifacts aren't compiled locally.
 */
function resolveAbi(extracted: AbiItem[]): AbiItem[] {
  return extracted.length > 0 ? extracted : (DIAMOND_ABI as AbiItem[]);
}

// Diamond-proxied contracts — use Diamond ABI as source of truth
// These contracts are deployed behind the Diamond proxy, so the Diamond ABI
// contains all their methods (from all facets).
export const AusysABI: AbiItem[] = resolveAbi(extractedAbis.Ausys);
export const CLOBABI: AbiItem[] = resolveAbi(extractedAbis.CLOB);

// Standalone contracts — use extracted ABIs (with Diamond fallback if empty)
export const AurumNodeManagerABI: AbiItem[] = resolveAbi(
  extractedAbis.AurumNodeManager,
);
export const AurumNodeABI: AbiItem[] = resolveAbi(extractedAbis.AurumNode);
export const AuraAssetABI: AbiItem[] = resolveAbi(extractedAbis.AuraAsset);
export const AuStakeABI: AbiItem[] = resolveAbi(extractedAbis.AuStake);
export const AuraGoatRedABI: AbiItem[] = resolveAbi(extractedAbis.AuraGoatRed);
export const OrderBridgeABI: AbiItem[] = extractedAbis.OrderBridge;
export const RWYVaultABI: AbiItem[] = resolveAbi(extractedAbis.RWYVault);
export const RWYStakingFacetABI: AbiItem[] =
  (extractedAbis as any).RWYStakingFacet || [];

// Diamond ABIs
export const DiamondABI: AbiItem[] = extractedAbis.Diamond;
export const DiamondCutFacetABI: AbiItem[] = extractedAbis.DiamondCutFacet;
export const DiamondLoupeFacetABI: AbiItem[] = extractedAbis.DiamondLoupeFacet;
export const OwnershipFacetABI: AbiItem[] = extractedAbis.OwnershipFacet;

// Export all ABIs as a single object
export const ContractABIs = extractedAbis;
