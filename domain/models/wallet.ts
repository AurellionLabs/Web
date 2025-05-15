import { ethers } from 'ethers';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: string | null;
}

export class Wallet {
  private state: WalletState;
  private provider: ethers.BrowserProvider | null;

  constructor() {
    this.state = {
      address: null,
      isConnected: false,
      chainId: null,
    };
    this.provider = null;
  }

  public getState(): WalletState {
    return { ...this.state };
  }

  public getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  public async connect(provider: ethers.BrowserProvider): Promise<void> {
    this.provider = provider;
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();

    this.state = {
      address,
      isConnected: true,
      chainId: `0x${network.chainId.toString(16)}`,
    };
  }

  public disconnect(): void {
    this.provider = null;
    this.state = {
      address: null,
      isConnected: false,
      chainId: null,
    };
  }

  public updateState(newState: WalletState): void {
    this.state = newState;
  }

  public isConnected(): boolean {
    return this.state.isConnected;
  }

  public getAddress(): string | null {
    return this.state.address;
  }

  public getChainId(): string | null {
    return this.state.chainId;
  }
}
