import { ethers } from 'ethers';
import { Wallet, WalletState } from '../models/wallet';

export interface IWalletRepository {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getState(): WalletState;
  getProvider(): Promise<ethers.BrowserProvider>;
  getWallet(): Wallet;
  getEthBalance(address: string): Promise<bigint>;
  getErc20Balance(
    address: string,
    tokenAddress: string,
  ): Promise<{ balance: bigint; decimals: number }>;
  isApprovedForAll(
    owner: string,
    operator: string,
    diamondAddress: string,
  ): Promise<boolean>;
  setApprovalForAll(
    operator: string,
    approved: boolean,
    diamondAddress: string,
  ): Promise<ethers.TransactionResponse>;
}
