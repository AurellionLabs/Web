/**
 * Typed contract utilities using ethers.js
 * 
 * This module provides type-safe contract instantiation without typechain.
 * Uses ABIs directly from Hardhat artifacts.
 */

import { ethers, Contract, Signer, Provider, InterfaceAbi } from 'ethers';
import {
  AurumNodeManagerABI,
  AurumNodeABI,
  AuraAssetABI,
  AuStakeABI,
  AusysABI,
  AuraGoatRedABI,
  CLOBABI,
  OrderBridgeABI,
  RWYVaultABI,
  DiamondABI,
  DiamondCutFacetABI,
  DiamondLoupeFacetABI,
  OwnershipFacetABI,
} from './abis';

// Re-export ABIs
export * from './abis';

/**
 * Generic contract factory function
 */
function createContract(
  address: string,
  abi: InterfaceAbi,
  signerOrProvider: Signer | Provider,
): Contract {
  return new ethers.Contract(address, abi, signerOrProvider);
}

/**
 * Contract factory functions - these create typed contract instances
 */
export const ContractFactories = {
  AurumNodeManager: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, AurumNodeManagerABI, signerOrProvider),
    abi: AurumNodeManagerABI,
  },
  
  AurumNode: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, AurumNodeABI, signerOrProvider),
    abi: AurumNodeABI,
  },
  
  AuraAsset: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, AuraAssetABI, signerOrProvider),
    abi: AuraAssetABI,
  },
  
  AuStake: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, AuStakeABI, signerOrProvider),
    abi: AuStakeABI,
  },
  
  Ausys: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, AusysABI, signerOrProvider),
    abi: AusysABI,
  },
  
  AuraGoatRed: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, AuraGoatRedABI, signerOrProvider),
    abi: AuraGoatRedABI,
  },
  
  CLOB: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, CLOBABI, signerOrProvider),
    abi: CLOBABI,
  },
  
  OrderBridge: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, OrderBridgeABI, signerOrProvider),
    abi: OrderBridgeABI,
  },
  
  RWYVault: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, RWYVaultABI, signerOrProvider),
    abi: RWYVaultABI,
  },
  
  Diamond: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, DiamondABI, signerOrProvider),
    abi: DiamondABI,
  },
  
  DiamondCutFacet: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, DiamondCutFacetABI, signerOrProvider),
    abi: DiamondCutFacetABI,
  },
  
  DiamondLoupeFacet: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, DiamondLoupeFacetABI, signerOrProvider),
    abi: DiamondLoupeFacetABI,
  },
  
  OwnershipFacet: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, OwnershipFacetABI, signerOrProvider),
    abi: OwnershipFacetABI,
  },
} as const;

// Convenience aliases matching typechain naming convention
export const AurumNodeManager__factory = ContractFactories.AurumNodeManager;
export const AurumNode__factory = ContractFactories.AurumNode;
export const AuraAsset__factory = ContractFactories.AuraAsset;
export const AuStake__factory = ContractFactories.AuStake;
export const Ausys__factory = ContractFactories.Ausys;
export const AuraGoatRed__factory = ContractFactories.AuraGoatRed;
export const CLOB__factory = ContractFactories.CLOB;
export const OrderBridge__factory = ContractFactories.OrderBridge;
export const RWYVault__factory = ContractFactories.RWYVault;
export const Diamond__factory = ContractFactories.Diamond;
export const DiamondCutFacet__factory = ContractFactories.DiamondCutFacet;
export const DiamondLoupeFacet__factory = ContractFactories.DiamondLoupeFacet;
export const OwnershipFacet__factory = ContractFactories.OwnershipFacet;

/**
 * Type aliases for contract instances
 * Using Contract type directly - these are runtime ethers.Contract instances
 */
export type AurumNodeManager = Contract;
export type AurumNode = Contract;
export type AuraAsset = Contract;
export type AuStake = Contract;
export type Ausys = Contract;
export type AuraGoatRed = Contract;
export type CLOB = Contract;
export type OrderBridge = Contract;
export type RWYVault = Contract;
export type Diamond = Contract;
export type DiamondCutFacet = Contract;
export type DiamondLoupeFacet = Contract;
export type OwnershipFacet = Contract;

// Re-export Contract type for convenience
export { Contract } from 'ethers';
