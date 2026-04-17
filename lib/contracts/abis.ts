/**
 * Diamond ABI exports.
 */

import extractedAbis from './extracted-abis.json';
import { DIAMOND_ABI } from '@/infrastructure/contracts/diamond-abi.generated';

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

const extracted = extractedAbis as Partial<Record<string, AbiItem[]>>;

function resolveAbi(name: string): AbiItem[] {
  const abi = extracted[name];
  return abi && abi.length > 0 ? abi : (DIAMOND_ABI as AbiItem[]);
}

export const AusysABI: AbiItem[] = DIAMOND_ABI as AbiItem[];
export const CLOBABI: AbiItem[] = DIAMOND_ABI as AbiItem[];
export const RWYStakingFacetABI: AbiItem[] = resolveAbi('RWYStakingFacet');
export const DiamondABI: AbiItem[] = resolveAbi('Diamond');
export const DiamondCutFacetABI: AbiItem[] = resolveAbi('DiamondCutFacet');
export const DiamondLoupeFacetABI: AbiItem[] = resolveAbi('DiamondLoupeFacet');
export const OwnershipFacetABI: AbiItem[] = resolveAbi('OwnershipFacet');

export const ContractABIs = {
  Diamond: DiamondABI,
  DiamondCutFacet: DiamondCutFacetABI,
  DiamondLoupeFacet: DiamondLoupeFacetABI,
  OwnershipFacet: OwnershipFacetABI,
  RWYStakingFacet: RWYStakingFacetABI,
};
