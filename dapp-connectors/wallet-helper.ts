import { BrowserProvider } from 'ethers';

// Types
interface ConnectResponse {
  success: boolean;
  address?: string;
  error?: string;
}

export class Wallet {
  private provider: BrowserProvider | null = null;

  async connectWallet() {
    try {
      // Check if ethereum is already injected
      if (typeof window.ethereum === 'undefined') {
        return {
          success: false,
          error: 'Please install MetaMask',
        };
      }

      // Use the existing provider instead of creating a new one
      this.provider = new BrowserProvider(window.ethereum);

      // Request accounts
      await this.provider.send('eth_requestAccounts', []);

      return {
        success: true,
        provider: this.provider,
      };
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  public setupWalletListeners(
    onAccountsChanged: (accounts: string[]) => void,
    onChainChanged: () => void,
  ): (() => void) | undefined {
    if (typeof window.ethereum !== 'undefined') {
      // Handle account changes
      window.ethereum.on('accountsChanged', onAccountsChanged);
      // Handle chain changes
      window.ethereum.on('chainChanged', onChainChanged);

      // Return cleanup function
      return () => {
        window.ethereum?.removeListener('accountsChanged', onAccountsChanged);
        window.ethereum?.removeListener('chainChanged', onChainChanged);
      };
    }
  }

  public async getCurrentChainId(): Promise<string | null> {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const chainId = await window.ethereum.request({
          method: 'eth_chainId',
        });
        return chainId;
      }
      return null;
    } catch (error) {
      console.error('Error getting chain ID:', error);
      return null;
    }
  }

  public async switchNetwork(chainId: string): Promise<boolean> {
    try {
      if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId }],
        });
        return true;
      }
      return false;
    } catch (error: any) {
      // Handle error code 4902 (chain not added to MetaMask)
      if (error.code === 4902) {
        // Implement addNetwork logic here if needed
        console.log('Chain not added to MetaMask');
      }
      console.error('Error switching network:', error);
      return false;
    }
  }

  getProvider() {
    return this.provider;
  }
}
