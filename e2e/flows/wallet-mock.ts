/**
 * Wallet Mock - Mock ethereum provider for E2E testing
 *
 * Provides a mock window.ethereum that routes to a local test chain,
 * enabling realistic testing of wallet interactions.
 */

import {
  ethers,
  JsonRpcProvider,
  Wallet,
  Signer,
  TransactionRequest,
  TransactionResponse,
} from 'ethers';
import { ChainManager, TestAccount } from '../chain/chain-manager';
import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export interface MockEthereumProvider {
  isMetaMask: boolean;
  isConnected: () => boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
  removeAllListeners: (event?: string) => void;
  selectedAddress: string | null;
  chainId: string | null;
  networkVersion: string | null;
}

export interface WalletMockOptions {
  /** Default account index to use */
  defaultAccountIndex?: number;
  /** Auto-approve all transactions */
  autoApprove?: boolean;
  /** Log all requests */
  verbose?: boolean;
  /** Simulate confirmation delays (ms) */
  confirmationDelay?: number;
}

// =============================================================================
// WALLET MOCK CLASS
// =============================================================================

export class WalletMock extends EventEmitter implements MockEthereumProvider {
  private chain: ChainManager;
  private provider: JsonRpcProvider;
  private accounts: TestAccount[];
  private currentAccountIndex: number;
  private options: Required<WalletMockOptions>;
  private connected: boolean = false;
  private pendingRequests: Map<
    number,
    { resolve: Function; reject: Function }
  > = new Map();
  private requestId: number = 0;

  // EIP-1193 properties
  isMetaMask = true;
  selectedAddress: string | null = null;
  chainId: string | null = null;
  networkVersion: string | null = null;

  constructor(chain: ChainManager, options: WalletMockOptions = {}) {
    super();

    this.chain = chain;
    this.provider = chain.getProvider();
    this.accounts = chain.getAccounts();

    this.options = {
      defaultAccountIndex: options.defaultAccountIndex ?? 0,
      autoApprove: options.autoApprove ?? true,
      verbose: options.verbose ?? false,
      confirmationDelay: options.confirmationDelay ?? 0,
    };

    this.currentAccountIndex = this.options.defaultAccountIndex;
    this.chainId = `0x${chain.getChainId().toString(16)}`;
    this.networkVersion = chain.getChainId().toString();
  }

  // ---------------------------------------------------------------------------
  // EIP-1193 Methods
  // ---------------------------------------------------------------------------

  isConnected(): boolean {
    return this.connected && this.chain.isRunning();
  }

  async request(args: { method: string; params?: any[] }): Promise<any> {
    const { method, params = [] } = args;

    this.log(`📨 Request: ${method}`, params);

    try {
      const result = await this.handleRequest(method, params);
      this.log(`✅ Response: ${method}`, result);
      return result;
    } catch (error) {
      this.log(`❌ Error: ${method}`, error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Request Handler
  // ---------------------------------------------------------------------------

  private async handleRequest(method: string, params: any[]): Promise<any> {
    switch (method) {
      // Connection
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return this.handleGetAccounts();

      // Chain info
      case 'eth_chainId':
        return this.chainId;

      case 'net_version':
        return this.networkVersion;

      case 'eth_blockNumber':
        return this.provider.send('eth_blockNumber', []);

      // Account info
      case 'eth_getBalance':
        return this.provider.send('eth_getBalance', params);

      case 'eth_getTransactionCount':
        return this.provider.send('eth_getTransactionCount', params);

      // Transactions
      case 'eth_sendTransaction':
        return this.handleSendTransaction(params[0]);

      case 'eth_getTransactionReceipt':
        return this.provider.send('eth_getTransactionReceipt', params);

      case 'eth_getTransactionByHash':
        return this.provider.send('eth_getTransactionByHash', params);

      case 'eth_call':
        return this.provider.send('eth_call', params);

      case 'eth_estimateGas':
        return this.provider.send('eth_estimateGas', params);

      case 'eth_gasPrice':
        return this.provider.send('eth_gasPrice', []);

      case 'eth_maxPriorityFeePerGas':
        return this.provider.send('eth_maxPriorityFeePerGas', []);

      case 'eth_feeHistory':
        return this.provider.send('eth_feeHistory', params);

      // Signing
      case 'personal_sign':
        return this.handlePersonalSign(params[0], params[1]);

      case 'eth_signTypedData_v4':
        return this.handleSignTypedData(params[0], params[1]);

      // Contract
      case 'eth_getCode':
        return this.provider.send('eth_getCode', params);

      case 'eth_getLogs':
        return this.provider.send('eth_getLogs', params);

      // Subscriptions (simplified)
      case 'eth_subscribe':
        return '0x1'; // Return dummy subscription ID

      case 'eth_unsubscribe':
        return true;

      // Wallet methods
      case 'wallet_switchEthereumChain':
        return this.handleSwitchChain(params[0]);

      case 'wallet_addEthereumChain':
        return null; // Pretend success

      case 'wallet_watchAsset':
        return true; // Pretend success

      default:
        // Try to forward unknown methods to provider
        try {
          return await this.provider.send(method, params);
        } catch {
          throw new Error(`Unsupported method: ${method}`);
        }
    }
  }

  // ---------------------------------------------------------------------------
  // Specific Handlers
  // ---------------------------------------------------------------------------

  private async handleGetAccounts(): Promise<string[]> {
    if (!this.connected) {
      this.connected = true;
      this.selectedAddress = this.accounts[this.currentAccountIndex].address;
      this.emit('connect', { chainId: this.chainId });
      this.emit('accountsChanged', [this.selectedAddress]);
    }

    return [this.selectedAddress!];
  }

  private async handleSendTransaction(tx: TransactionRequest): Promise<string> {
    if (!this.options.autoApprove) {
      // In a real implementation, you might want to add approval logic
      throw new Error('Transaction approval required');
    }

    // Add delay if configured
    if (this.options.confirmationDelay > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.options.confirmationDelay),
      );
    }

    const signer = this.getCurrentSigner();
    const response = await signer.sendTransaction(tx);

    return response.hash;
  }

  private async handlePersonalSign(
    message: string,
    address: string,
  ): Promise<string> {
    const signer = this.getSignerForAddress(address);
    if (!signer) {
      throw new Error(`No signer for address: ${address}`);
    }

    const messageBytes = ethers.getBytes(message);
    return signer.signMessage(messageBytes);
  }

  private async handleSignTypedData(
    address: string,
    typedData: string,
  ): Promise<string> {
    const signer = this.getSignerForAddress(address);
    if (!signer) {
      throw new Error(`No signer for address: ${address}`);
    }

    const data = JSON.parse(typedData);
    const { domain, types, message } = data;

    // Remove EIP712Domain from types if present
    const typesWithoutDomain = { ...types };
    delete typesWithoutDomain.EIP712Domain;

    return signer.signTypedData(domain, typesWithoutDomain, message);
  }

  private async handleSwitchChain(params: { chainId: string }): Promise<null> {
    const requestedChainId = params.chainId;

    if (requestedChainId !== this.chainId) {
      throw {
        code: 4902,
        message: 'Unrecognized chain ID',
      };
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Account Management
  // ---------------------------------------------------------------------------

  /**
   * Get the current signer
   */
  getCurrentSigner(): Signer {
    return this.accounts[this.currentAccountIndex].signer;
  }

  /**
   * Get signer for a specific address
   */
  getSignerForAddress(address: string): Signer | null {
    const account = this.accounts.find(
      (a) => a.address.toLowerCase() === address.toLowerCase(),
    );
    return account?.signer ?? null;
  }

  /**
   * Switch to a different account
   */
  switchAccount(index: number): void {
    if (index < 0 || index >= this.accounts.length) {
      throw new Error(`Invalid account index: ${index}`);
    }

    this.currentAccountIndex = index;
    this.selectedAddress = this.accounts[index].address;

    this.emit('accountsChanged', [this.selectedAddress]);
  }

  /**
   * Get current account address
   */
  getCurrentAddress(): string {
    return this.accounts[this.currentAccountIndex].address;
  }

  /**
   * Get all available addresses
   */
  getAddresses(): string[] {
    return this.accounts.map((a) => a.address);
  }

  /**
   * Disconnect the wallet
   */
  disconnect(): void {
    this.connected = false;
    this.selectedAddress = null;
    this.emit('disconnect', { code: 4900, message: 'User disconnected' });
    this.emit('accountsChanged', []);
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  private log(message: string, data?: any): void {
    if (this.options.verbose) {
      if (data !== undefined) {
        console.log(`[WalletMock] ${message}`, data);
      } else {
        console.log(`[WalletMock] ${message}`);
      }
    }
  }
}

// =============================================================================
// GLOBAL MOCK INSTALLATION
// =============================================================================

let originalEthereum: any = undefined;
let installedMock: WalletMock | null = null;

/**
 * Install the wallet mock as window.ethereum
 */
export function installWalletMock(
  chain: ChainManager,
  options?: WalletMockOptions,
): WalletMock {
  // Store original if exists
  if (
    typeof globalThis !== 'undefined' &&
    (globalThis as any).window?.ethereum
  ) {
    originalEthereum = (globalThis as any).window.ethereum;
  }

  const mock = new WalletMock(chain, options);

  // Install mock
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.ethereum = mock;
  }

  installedMock = mock;

  console.log('🔌 Wallet mock installed');

  return mock;
}

/**
 * Uninstall the wallet mock and restore original
 */
export function uninstallWalletMock(): void {
  if (typeof globalThis !== 'undefined' && (globalThis as any).window) {
    if (originalEthereum !== undefined) {
      (globalThis as any).window.ethereum = originalEthereum;
      originalEthereum = undefined;
    } else {
      delete (globalThis as any).window.ethereum;
    }
  }

  installedMock = null;

  console.log('🔌 Wallet mock uninstalled');
}

/**
 * Get the installed wallet mock
 */
export function getInstalledMock(): WalletMock | null {
  return installedMock;
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a wallet mock for a chain
 */
export function createWalletMock(
  chain: ChainManager,
  options?: WalletMockOptions,
): WalletMock {
  return new WalletMock(chain, options);
}
