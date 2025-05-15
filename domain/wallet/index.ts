import { ethers } from 'ethers';
import { Wallet, WalletState } from '../models/wallet';

export interface IWalletRepository {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getState(): WalletState;
  getProvider(): ethers.BrowserProvider | null;
  getWallet(): Wallet;
}
