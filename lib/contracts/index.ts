/**
 * Diamond-only contract utilities using ethers.js.
 */

import {
  ethers,
  Contract,
  Signer,
  Provider,
  InterfaceAbi,
  BytesLike,
  ContractTransactionResponse,
  ContractRunner,
} from 'ethers';

import {
  AusysABI,
  CLOBABI,
  RWYStakingFacetABI,
  DiamondABI,
  DiamondCutFacetABI,
  DiamondLoupeFacetABI,
  OwnershipFacetABI,
} from './abis';

export * from './abis';

function createContract(
  address: string,
  abi: InterfaceAbi,
  signerOrProvider: Signer | Provider,
): Contract {
  return new ethers.Contract(address, abi, signerOrProvider);
}

export const ContractFactories = {
  Ausys: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, AusysABI, signerOrProvider) as AusysTyped,
    abi: AusysABI,
  },
  CLOB: {
    connect: (address: string, signerOrProvider: Signer | Provider) =>
      createContract(address, CLOBABI, signerOrProvider),
    abi: CLOBABI,
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

export const Ausys__factory = ContractFactories.Ausys;
export const CLOB__factory = ContractFactories.CLOB;
export const RWYStakingFacet__factory = ContractFactories.RWYStakingFacet;
export const Diamond__factory = ContractFactories.Diamond;
export const DiamondCutFacet__factory = ContractFactories.DiamondCutFacet;
export const DiamondLoupeFacet__factory = ContractFactories.DiamondLoupeFacet;
export const OwnershipFacet__factory = ContractFactories.OwnershipFacet;

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

export type AusysTyped = Contract & {
  connect(runner: ContractRunner): AusysTyped;
  DRIVER_ROLE(): Promise<string>;
  hasAuSysRole(role: BytesLike, account: string): Promise<boolean>;
  setDriver(
    driver: string,
    enable: boolean,
  ): Promise<ContractTransactionResponse>;
  getJourney(id: BytesLike): Promise<AuSysJourney>;
  packageSign(id: BytesLike): Promise<ContractTransactionResponse>;
  handOn(id: BytesLike): Promise<ContractTransactionResponse>;
  handOff(id: BytesLike): Promise<ContractTransactionResponse>;
  assignDriverToJourney(
    driver: string,
    journeyId: BytesLike,
  ): Promise<ContractTransactionResponse>;
};

export type Ausys = AusysTyped;
export type CLOB = Contract;
export type RWYStakingFacet = Contract;
export type Diamond = Contract;
export type DiamondCutFacet = Contract;
export type DiamondLoupeFacet = Contract;
export type OwnershipFacet = Contract;

export { Contract } from 'ethers';
