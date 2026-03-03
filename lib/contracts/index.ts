/**
 * Typed contract utilities using ethers.js
 * 
 * This module provides type-safe contract instantiation without typechain.
 * Uses ABIs directly from Hardhat artifacts.
 */

import {
  ethers,
  Contract,
  Signer,
  Provider,
  InterfaceAbi,
  BytesLike,
  ContractTransactionResponse,
} from 'ethers';
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
  RWYStakingFacetABI,
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
      createContract(address, AusysABI, signerOrProvider) as AusysTyped,
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
  
  RWYStakingFacet: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, RWYStakingFacetABI, signerOrProvider),
    abi: RWYStakingFacetABI,
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
export const RWYStakingFacet__factory = ContractFactories.RWYStakingFacet;
export const Diamond__factory = ContractFactories.Diamond;
export const DiamondCutFacet__factory = ContractFactories.DiamondCutFacet;
export const DiamondLoupeFacet__factory = ContractFactories.DiamondLoupeFacet;
export const OwnershipFacet__factory = ContractFactories.OwnershipFacet;

// ---------------------------------------------------------------------------
// AuSys typed return types
// ---------------------------------------------------------------------------

/** Return value of getJourney — mirrors DiamondStorage.AuSysJourney */
export interface AuSysJourney {
  parcelData: {
    startLocation: { lat: string; lng: string };
    endLocation: { lat: string; lng: string };
    startName: string;
    endName: string;
  };
  journeyId: string;
  currentStatus: bigint;
  sender: string;
  receiver: string;
  driver: string;
  journeyStart: bigint;
  journeyEnd: bigint;
  bounty: bigint;
  ETA: bigint;
}

/**
 * Typed interface for the AuSys contract (Diamond proxy).
 * Intersects with the generic ethers Contract, adding strongly typed method
 * signatures for the driver/logistics facet functions used throughout the app.
 *
 * Note: defined as a type intersection (not interface extends) to avoid conflicts
 * with ethers v6's string index signature on Contract.
 */
export type AusysTyped = Contract & {
  /** Returns the DRIVER_ROLE bytes32 constant */
  DRIVER_ROLE(): Promise<string>;
  /** Check whether `account` holds `role` in the AuSys access-control system */
  hasAuSysRole(role: BytesLike, account: string): Promise<boolean>;
  /** Grant or revoke the driver role for `driver` */
  setDriver(
    driver: string,
    enable: boolean,
  ): Promise<ContractTransactionResponse>;
  /** Fetch full journey details by journey id */
  getJourney(id: BytesLike): Promise<AuSysJourney>;
  /** Sign for a package (pickup or delivery confirmation) */
  packageSign(id: BytesLike): Promise<ContractTransactionResponse>;
  /** Start a journey (requires both driver + sender signatures) */
  handOn(id: BytesLike): Promise<ContractTransactionResponse>;
  /** Complete handoff (settles the journey) */
  handOff(id: BytesLike): Promise<ContractTransactionResponse>;
  /** Assign a driver to a journey */
  assignDriverToJourney(
    driver: string,
    journeyId: BytesLike,
  ): Promise<ContractTransactionResponse>;
};

// ---------------------------------------------------------------------------
// Type aliases for contract instances
// ---------------------------------------------------------------------------

/**
 * Type aliases for contract instances
 * Using Contract type directly - these are runtime ethers.Contract instances
 */
export type AurumNodeManager = Contract;
export type AurumNode = Contract;
export type AuraAsset = Contract;
export type AuStake = Contract;
/** Typed AuSys contract — all logistics/driver methods are strongly typed */
export type Ausys = AusysTyped;
export type AuraGoatRed = Contract;
export type CLOB = Contract;
export type OrderBridge = Contract;
export type RWYVault = Contract;
export type RWYStakingFacet = Contract;
export type Diamond = Contract;
export type DiamondCutFacet = Contract;
export type DiamondLoupeFacet = Contract;
export type OwnershipFacet = Contract;

// Re-export Contract type for convenience
export { Contract } from 'ethers';
