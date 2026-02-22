/**
 * Wallet Injector for Playwright Browser Tests
 *
 * Injects a mock window.ethereum provider before the page loads,
 * enabling realistic wallet interaction testing without a real wallet.
 *
 * This reuses concepts from e2e/flows/wallet-mock.ts but adapted
 * for browser context injection via Playwright.
 */

import { Page, BrowserContext } from '@playwright/test';
import { ethers } from 'ethers';

// =============================================================================
// TYPES
// =============================================================================

export interface WalletConfig {
  /** The wallet address to use */
  address: string;
  /** Chain ID in hex format (e.g., '0x14a34' for Base Sepolia) */
  chainId: string;
  /** Network version as decimal string */
  networkVersion: string;
  /** Whether to auto-approve transactions */
  autoApprove?: boolean;
  /** RPC URL for read operations (optional) */
  rpcUrl?: string;
  /** Optional private key for real signature generation in tests */
  privateKey?: string;
}

export interface MockEthereumConfig {
  wallet: WalletConfig;
  /** Mock responses for specific RPC methods */
  mockResponses?: Record<string, any>;
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

const DEFAULT_TEST_PRIVATE_KEY =
  process.env.PLAYWRIGHT_WALLET_PRIVATE_KEY ||
  process.env.ARB_PRIVATE_KEY ||
  process.env.SEP_PRIVATE_KEY;

function normalizePrivateKey(privateKey: string): string {
  return privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
}

function deriveAddressFromPrivateKey(privateKey?: string): string | null {
  if (!privateKey) return null;
  try {
    return new ethers.Wallet(normalizePrivateKey(privateKey)).address;
  } catch {
    return null;
  }
}

function resolveWalletConfig(wallet: WalletConfig): WalletConfig {
  const derivedAddress = deriveAddressFromPrivateKey(wallet.privateKey);
  if (!derivedAddress) return wallet;
  return {
    ...wallet,
    address: derivedAddress,
  };
}

async function signPersonalMessage(privateKey: string, params: any[]) {
  const signer = new ethers.Wallet(normalizePrivateKey(privateKey));
  const message = params[0];
  if (typeof message === 'string' && message.startsWith('0x')) {
    return signer.signMessage(ethers.getBytes(message));
  }
  return signer.signMessage(String(message ?? ''));
}

async function signTypedDataMessage(privateKey: string, params: any[]) {
  const signer = new ethers.Wallet(normalizePrivateKey(privateKey));
  const typedDataInput = params[1];
  const typedData =
    typeof typedDataInput === 'string'
      ? JSON.parse(typedDataInput)
      : typedDataInput;
  const { domain = {}, message = {}, types = {} } = typedData || {};
  const sanitizedTypes = { ...types };
  delete sanitizedTypes.EIP712Domain;
  return signer.signTypedData(domain, sanitizedTypes, message);
}

async function sendSignedTransaction(
  privateKey: string,
  params: any[],
  rpcUrl?: string,
) {
  const tx = params[0];
  if (!tx || typeof tx !== 'object') {
    throw new Error('Invalid eth_sendTransaction payload.');
  }

  if (!rpcUrl) {
    throw new Error('RPC URL required for eth_sendTransaction in test mode.');
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(normalizePrivateKey(privateKey), provider);
  const response = await signer.sendTransaction(tx);
  return response.hash;
}

async function attachPrivateKeyBindings(
  target: Page | BrowserContext,
  privateKey?: string,
  rpcUrl?: string,
) {
  if (!privateKey) return;

  // Ignore duplicate exposure errors across reused pages/contexts.
  try {
    await target.exposeFunction(
      '__walletMockSignPersonal',
      async (params: any[]) => signPersonalMessage(privateKey, params),
    );
  } catch {}

  try {
    await target.exposeFunction(
      '__walletMockSignTypedData',
      async (params: any[]) => signTypedDataMessage(privateKey, params),
    );
  } catch {}

  try {
    await target.exposeFunction(
      '__walletMockSendTransaction',
      async (params: any[]) =>
        sendSignedTransaction(privateKey, params, rpcUrl),
    );
  } catch {}
}

export const BASE_SEPOLIA_CONFIG: WalletConfig = {
  address:
    deriveAddressFromPrivateKey(DEFAULT_TEST_PRIVATE_KEY) ||
    '0x1234567890123456789012345678901234567890',
  chainId: '0x14a34', // 84532 in hex
  networkVersion: '84532',
  autoApprove: true,
  rpcUrl: 'https://sepolia.base.org',
  privateKey: DEFAULT_TEST_PRIVATE_KEY,
};

export const HARDHAT_CONFIG: WalletConfig = {
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Hardhat account 0
  chainId: '0x7a69', // 31337 in hex
  networkVersion: '31337',
  autoApprove: true,
  rpcUrl: 'http://localhost:8545',
};

// =============================================================================
// WALLET INJECTION SCRIPT
// =============================================================================

/**
 * Generates the script to inject into the browser context
 * This runs before any page scripts, setting up window.ethereum
 */
function generateInjectionScript(config: MockEthereumConfig): string {
  const { mockResponses = {} } = config;
  const wallet = resolveWalletConfig(config.wallet);

  return `
    (function() {
      // Store for event listeners
      const listeners = new Map();
      let connected = false;
      let selectedAddress = null;

      // Mock ethereum provider
      const mockEthereum = {
        isMetaMask: true,
        isConnected: () => connected,
        selectedAddress: null,
        chainId: '${wallet.chainId}',
        networkVersion: '${wallet.networkVersion}',

        // Event handling
        on: function(event, handler) {
          if (!listeners.has(event)) {
            listeners.set(event, []);
          }
          listeners.get(event).push(handler);
        },

        removeListener: function(event, handler) {
          const handlers = listeners.get(event);
          if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
              handlers.splice(index, 1);
            }
          }
        },

        removeAllListeners: function(event) {
          if (event) {
            listeners.delete(event);
          } else {
            listeners.clear();
          }
        },

        emit: function(event, ...args) {
          const handlers = listeners.get(event);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(...args);
              } catch (e) {
                console.error('[MockEthereum] Handler error:', e);
              }
            });
          }
        },

        // RPC request handler
        request: async function({ method, params = [] }) {
          console.log('[MockEthereum] Request:', method, params);

          // Check for mock responses first
          const mockResponses = ${JSON.stringify(mockResponses)};
          if (mockResponses[method] !== undefined) {
            console.log('[MockEthereum] Using mock response for:', method);
            return mockResponses[method];
          }

          switch (method) {
            case 'eth_requestAccounts':
            case 'eth_accounts':
              if (!connected) {
                connected = true;
                selectedAddress = '${wallet.address}';
                mockEthereum.selectedAddress = selectedAddress;
                mockEthereum.emit('connect', { chainId: '${wallet.chainId}' });
                mockEthereum.emit('accountsChanged', [selectedAddress]);
              }
              return [selectedAddress || '${wallet.address}'];

            case 'eth_chainId':
              return '${wallet.chainId}';

            case 'net_version':
              return '${wallet.networkVersion}';

            case 'wallet_switchEthereumChain':
              const requestedChainId = params[0]?.chainId;
              if (requestedChainId !== '${wallet.chainId}') {
                throw { code: 4902, message: 'Unrecognized chain ID' };
              }
              return null;

            case 'wallet_addEthereumChain':
              return null; // Pretend success

            case 'wallet_watchAsset':
              return true; // Pretend success

            case 'eth_getBalance':
              // Return 100 ETH in wei
              return '0x56bc75e2d63100000';

            case 'eth_blockNumber':
              return '0x1';

            case 'eth_estimateGas':
              return '0x5208'; // 21000 gas

            case 'eth_gasPrice':
              return '0x3b9aca00'; // 1 gwei

            case 'eth_sendTransaction':
              ${
                wallet.autoApprove
                  ? `
              if (typeof window.__walletMockSendTransaction === 'function') {
                const txHash = await window.__walletMockSendTransaction(params);
                console.log('[MockEthereum] Signed tx:', txHash);
                return txHash;
              }
              const fallbackHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
              console.log('[MockEthereum] Auto-approved tx:', fallbackHash);
              return fallbackHash;
              `
                  : `
              throw { code: 4001, message: 'User rejected the request' };
              `
              }

            case 'personal_sign':
            case 'eth_sign':
              ${
                wallet.autoApprove
                  ? `
              if (typeof window.__walletMockSignPersonal === 'function') {
                return await window.__walletMockSignPersonal(params);
              }
              return '0x' + Array(130).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
              `
                  : `
              throw { code: 4001, message: 'User rejected the request' };
              `
              }

            case 'eth_signTypedData_v4':
              ${
                wallet.autoApprove
                  ? `
              if (typeof window.__walletMockSignTypedData === 'function') {
                return await window.__walletMockSignTypedData(params);
              }
              return '0x' + Array(130).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
              `
                  : `
              throw { code: 4001, message: 'User rejected the request' };
              `
              }

            case 'eth_call':
              // For read calls, we might want to proxy to actual RPC
              // For now, return empty data
              console.log('[MockEthereum] eth_call:', params);
              return '0x';

            case 'eth_getTransactionReceipt':
              // Return a mock successful receipt
              return {
                transactionHash: params[0],
                blockNumber: '0x1',
                blockHash: '0x' + Array(64).fill('0').join(''),
                status: '0x1',
                gasUsed: '0x5208',
              };

            default:
              console.warn('[MockEthereum] Unhandled method:', method);
              throw new Error('Method not supported: ' + method);
          }
        },
      };

      // Install the mock
      Object.defineProperty(window, 'ethereum', {
        value: mockEthereum,
        writable: false,
        configurable: false,
      });

      console.log('[MockEthereum] Wallet mock installed');
      console.log('[MockEthereum] Address:', '${wallet.address}');
      console.log('[MockEthereum] Chain ID:', '${wallet.chainId}');
    })();
  `;
}

// =============================================================================
// INJECTION FUNCTIONS
// =============================================================================

/**
 * Inject wallet mock into a page before it loads
 *
 * @example
 * ```ts
 * test('trading flow', async ({ page }) => {
 *   await injectWalletMock(page, { wallet: BASE_SEPOLIA_CONFIG });
 *   await page.goto('/customer/trading');
 *   // Wallet is now available
 * });
 * ```
 */
export async function injectWalletMock(
  page: Page,
  config: MockEthereumConfig = { wallet: BASE_SEPOLIA_CONFIG },
): Promise<void> {
  const wallet = resolveWalletConfig(config.wallet);
  await attachPrivateKeyBindings(page, wallet.privateKey, wallet.rpcUrl);
  const script = generateInjectionScript(config);
  await page.addInitScript(script);
}

/**
 * Inject wallet mock into a browser context
 * This affects all pages created in the context
 *
 * @example
 * ```ts
 * test.beforeEach(async ({ context }) => {
 *   await injectWalletMockToContext(context, { wallet: BASE_SEPOLIA_CONFIG });
 * });
 * ```
 */
export async function injectWalletMockToContext(
  context: BrowserContext,
  config: MockEthereumConfig = { wallet: BASE_SEPOLIA_CONFIG },
): Promise<void> {
  const wallet = resolveWalletConfig(config.wallet);
  await attachPrivateKeyBindings(context, wallet.privateKey, wallet.rpcUrl);
  const script = generateInjectionScript(config);
  await context.addInitScript(script);
}

/**
 * Create a custom wallet config
 */
export function createWalletConfig(
  address: string,
  chainId: number,
  options: Partial<WalletConfig> = {},
): WalletConfig {
  return {
    address,
    chainId: `0x${chainId.toString(16)}`,
    networkVersion: chainId.toString(),
    autoApprove: true,
    ...options,
  };
}

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Wait for wallet to be connected on the page
 */
export async function waitForWalletConnection(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      return window.ethereum?.isConnected?.() === true;
    },
    { timeout: 10000 },
  );
}

/**
 * Trigger wallet connection on the page
 */
export async function connectWallet(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    if (!window.ethereum) {
      throw new Error('No ethereum provider found');
    }
    return window.ethereum.request({ method: 'eth_requestAccounts' });
  });
}

/**
 * Get current connected address
 */
export async function getConnectedAddress(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    return window.ethereum?.selectedAddress || null;
  });
}

/**
 * Check if wallet is connected
 */
export async function isWalletConnected(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return window.ethereum?.isConnected?.() === true;
  });
}

// =============================================================================
// TYPE AUGMENTATION
// =============================================================================

declare global {
  interface Window {
    __walletMockSignPersonal?: (params: any[]) => Promise<string>;
    __walletMockSignTypedData?: (params: any[]) => Promise<string>;
    __walletMockSendTransaction?: (params: any[]) => Promise<string>;
    ethereum?: {
      isMetaMask: boolean;
      isConnected: () => boolean;
      selectedAddress: string | null;
      chainId: string | null;
      networkVersion: string | null;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (
        event: string,
        handler: (...args: any[]) => void,
      ) => void;
      removeAllListeners: (event?: string) => void;
    };
  }
}
