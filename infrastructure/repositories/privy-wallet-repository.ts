import { ethers } from 'ethers';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { IWalletRepository } from '@/domain/repositories/wallet-repository';
import { Wallet, WalletState } from '@/domain/models/wallet';
import { handleContractError } from '@/utils/error-handler';

export class PrivyWalletRepository implements IWalletRepository {
  private wallet: Wallet;
  private privyWallets: ReturnType<typeof useWallets>;
  private privyAuth: ReturnType<typeof usePrivy>;

  constructor(
    privyWallets: ReturnType<typeof useWallets>,
    privyAuth: ReturnType<typeof usePrivy>,
  ) {
    this.wallet = new Wallet();
    this.privyWallets = privyWallets;
    this.privyAuth = privyAuth;
  }

  public getPrivyWallets() {
    return this.privyWallets;
  }

  private normalizeChainId(chainId: string | number): string {
    if (typeof chainId === 'number') {
      return `0x${chainId.toString(16)}`;
    }
    // If it starts with '0x', use it as is, otherwise prepend '0x'
    return chainId.startsWith('0x') ? chainId : `0x${chainId}`;
  }

  public async connect(): Promise<void> {
    try {
      if (!this.privyAuth.ready) {
        throw new Error('Privy is not ready');
      }
      if (!this.privyAuth.authenticated) {
        await this.privyAuth.login();
      }
      await new Promise((resolve) => setTimeout(resolve, 100));

      const connectedWallet = this.privyWallets.wallets?.[0];
      if (!connectedWallet) {
        throw new Error('No connected wallet found after login attempt.');
      }

      const tempProvider = new ethers.BrowserProvider(
        await connectedWallet.getEthereumProvider(),
      );
      const signer = await tempProvider.getSigner();
      const address = await signer.getAddress();
      const chainId = this.normalizeChainId(connectedWallet.chainId);

      this.wallet.updateState({
        address,
        isConnected: true,
        chainId,
      });
    } catch (error) {
      handleContractError(error, 'connect wallet');
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.privyAuth.logout();
      this.wallet.disconnect();
    } catch (error) {
      handleContractError(error, 'disconnect wallet');
      throw error;
    }
  }

  public getState(): WalletState {
    const connectedWallet = this.privyWallets.wallets?.[0];
    const isConnected = this.privyAuth.authenticated && !!connectedWallet;

    if (isConnected) {
      return {
        isConnected: true,
        address: connectedWallet.address,
        chainId: this.normalizeChainId(connectedWallet.chainId),
      };
    } else {
      return this.wallet.getState();
    }
  }

  public getProvider(): ethers.BrowserProvider | null {
    return null;
  }

  public getWallet(): Wallet {
    return this.wallet;
  }
}
