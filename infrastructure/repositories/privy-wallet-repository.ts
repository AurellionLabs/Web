import { ethers } from 'ethers';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { IWalletRepository } from '@/domain/wallet';
import { Wallet, WalletState } from '@/domain/models/wallet';
import { handleContractError } from '@/utils/error-handler';

// Standard ERC20 ABI for balance and decimals calls
const erc20Abi = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export class PrivyWalletRepository implements IWalletRepository {
  private wallet: Wallet;
  private privyWallets: ReturnType<typeof useWallets>;
  private privyAuth: ReturnType<typeof usePrivy>;
  private _provider: ethers.BrowserProvider | null = null;

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

  /**
   * Get or create an ethers BrowserProvider for the connected wallet.
   * This enables components to access blockchain data without creating their own providers.
   */
  public async getProvider(): Promise<ethers.BrowserProvider> {
    if (this._provider) {
      return this._provider;
    }

    const connectedWallet = this.privyWallets.wallets?.[0];
    if (!connectedWallet) {
      throw new Error('No connected wallet found');
    }

    const ethereumProvider = await connectedWallet.getEthereumProvider();
    this._provider = new ethers.BrowserProvider(ethereumProvider);
    return this._provider;
  }

  /**
   * Get the ETH balance for a given address.
   */
  public async getEthBalance(address: string): Promise<bigint> {
    const provider = await this.getProvider();
    return await provider.getBalance(address);
  }

  /**
   * Get the ERC20 token balance for a given address and contract.
   */
  public async getErc20Balance(
    address: string,
    tokenAddress: string,
  ): Promise<{ balance: bigint; decimals: number }> {
    const provider = await this.getProvider();
    const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals(),
    ]);
    return { balance: BigInt(balance.toString()), decimals };
  }

  /**
   * Check if the Diamond contract is approved to transfer a specific NFT.
   * Used for ERC721 isApprovedForAll checks.
   */
  public async isApprovedForAll(
    owner: string,
    operator: string,
    diamondAddress: string,
  ): Promise<boolean> {
    const provider = await this.getProvider();
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      diamondAddress,
      [
        'function isApprovedForAll(address account, address operator) view returns (bool)',
      ],
      signer,
    );
    return await contract.isApprovedForAll(owner, operator);
  }

  /**
   * Set approval for the Diamond contract to transfer NFTs.
   */
  public async setApprovalForAll(
    operator: string,
    approved: boolean,
    diamondAddress: string,
  ): Promise<ethers.TransactionResponse> {
    const provider = await this.getProvider();
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      diamondAddress,
      ['function setApprovalForAll(address operator, bool approved) external'],
      signer,
    );
    const tx = await contract.setApprovalForAll(operator, approved);
    return tx;
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

  public getWallet(): Wallet {
    return this.wallet;
  }
}
