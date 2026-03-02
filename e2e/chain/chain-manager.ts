/**
 * Chain Manager - Unified local chain lifecycle management
 *
 * Supports both Hardhat Network and Anvil for E2E testing.
 * Provides snapshot/revert capabilities for test isolation.
 */

import { ethers, JsonRpcProvider, Wallet, Signer, NonceManager } from 'ethers';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export type ChainType = 'hardhat' | 'anvil';

export interface ChainConfig {
  type: ChainType;
  port?: number;
  chainId?: number;
  blockTime?: number; // seconds between blocks (0 = instant mining)
  accounts?: number; // number of test accounts to generate
  balance?: string; // initial balance per account in ETH
  forkUrl?: string; // optional fork URL
  forkBlockNumber?: number;
}

export interface ChainState {
  isRunning: boolean;
  port: number;
  chainId: number;
  rpcUrl: string;
  accounts: TestAccount[];
  snapshotId?: string;
}

export interface TestAccount {
  address: string;
  privateKey: string;
  signer: Signer;
  balance: bigint;
}

export interface SnapshotInfo {
  id: string;
  timestamp: number;
  description?: string;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: Required<ChainConfig> = {
  type: 'hardhat',
  port: 8545,
  chainId: 31337,
  blockTime: 0,
  accounts: 20,
  balance: '10000', // 10,000 ETH per account
  forkUrl: '',
  forkBlockNumber: 0,
};

// Hardhat default test accounts (deterministic)
// This is the default mnemonic used by Hardhat Network
const HARDHAT_MNEMONIC =
  'test test test test test test test test test test test junk';

// Pre-computed Hardhat accounts (derived from the above mnemonic)
// These are the default accounts that Hardhat Network creates
const HARDHAT_ACCOUNTS = [
  {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey:
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
  {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey:
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
  {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    privateKey:
      '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  },
  {
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    privateKey:
      '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  },
  {
    address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    privateKey:
      '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  },
  {
    address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    privateKey:
      '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  },
  {
    address: '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    privateKey:
      '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  },
  {
    address: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
    privateKey:
      '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  },
  {
    address: '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
    privateKey:
      '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
  },
  {
    address: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
    privateKey:
      '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
  },
  {
    address: '0xBcd4042DE499D14e55001CcbB24a551F3b954096',
    privateKey:
      '0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897',
  },
  {
    address: '0x71bE63f3384f5fb98995898A86B02Fb2426c5788',
    privateKey:
      '0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82',
  },
  {
    address: '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a',
    privateKey:
      '0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1',
  },
  {
    address: '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec',
    privateKey:
      '0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd',
  },
  {
    address: '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097',
    privateKey:
      '0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa',
  },
  {
    address: '0xcd3B766CCDd6AE721141F452C550Ca635964ce71',
    privateKey:
      '0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61',
  },
  {
    address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    privateKey:
      '0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0',
  },
  {
    address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
    privateKey:
      '0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd',
  },
  {
    address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    privateKey:
      '0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0',
  },
  {
    address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    privateKey:
      '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e',
  },
];

// =============================================================================
// CHAIN MANAGER CLASS
// =============================================================================

export class ChainManager extends EventEmitter {
  private config: Required<ChainConfig>;
  private process: ChildProcess | null = null;
  private provider: JsonRpcProvider | null = null;
  private state: ChainState | null = null;
  private snapshots: Map<string, SnapshotInfo> = new Map();
  private isInitialized = false;

  constructor(config: ChainConfig = { type: 'hardhat' }) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle Methods
  // ---------------------------------------------------------------------------

  /**
   * Start the local chain
   */
  async start(): Promise<ChainState> {
    if (this.state?.isRunning) {
      console.log('⚠️  Chain already running');
      return this.state;
    }

    console.log(`\n🔗 Starting ${this.config.type} chain...`);

    try {
      if (this.config.type === 'anvil') {
        await this.startAnvil();
      } else {
        await this.startHardhat();
      }

      // Wait for chain to be ready
      await this.waitForReady();

      // Initialize provider and accounts
      await this.initializeProvider();

      this.isInitialized = true;
      this.emit('started', this.state);

      console.log(`✅ Chain started on ${this.state!.rpcUrl}`);
      console.log(`   Chain ID: ${this.state!.chainId}`);
      console.log(`   Accounts: ${this.state!.accounts.length}`);

      return this.state!;
    } catch (error) {
      console.error('❌ Failed to start chain:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop the local chain
   */
  async stop(): Promise<void> {
    if (!this.state?.isRunning && !this.process) {
      return;
    }

    console.log('\n🛑 Stopping chain...');

    if (this.process) {
      this.process.kill('SIGTERM');

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill('SIGKILL');
          resolve();
        }, 5000);

        this.process?.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.process = null;
    }

    this.provider = null;
    this.state = null;
    this.snapshots.clear();
    this.isInitialized = false;

    this.emit('stopped');
    console.log('✅ Chain stopped');
  }

  /**
   * Restart the chain (useful for clean state)
   */
  async restart(): Promise<ChainState> {
    await this.stop();
    return this.start();
  }

  // ---------------------------------------------------------------------------
  // Snapshot Methods
  // ---------------------------------------------------------------------------

  /**
   * Take a snapshot of the current chain state
   */
  async snapshot(description?: string): Promise<string> {
    this.ensureRunning();

    const snapshotId = await this.provider!.send('evm_snapshot', []);

    const info: SnapshotInfo = {
      id: snapshotId,
      timestamp: Date.now(),
      description,
    };

    this.snapshots.set(snapshotId, info);
    this.state!.snapshotId = snapshotId;

    console.log(
      `📸 Snapshot taken: ${snapshotId}${description ? ` (${description})` : ''}`,
    );

    return snapshotId;
  }

  /**
   * Revert to a previous snapshot
   */
  async revert(snapshotId?: string): Promise<void> {
    this.ensureRunning();

    const id = snapshotId || this.state!.snapshotId;
    if (!id) {
      throw new Error('No snapshot ID provided and no current snapshot exists');
    }

    const success = await this.provider!.send('evm_revert', [id]);
    if (!success) {
      throw new Error(`Failed to revert to snapshot: ${id}`);
    }

    // Snapshots are consumed on revert, so take a new one
    const newSnapshotId = await this.provider!.send('evm_snapshot', []);
    this.state!.snapshotId = newSnapshotId;

    // Reset provider nonce cache to avoid NONCE_EXPIRED errors
    this.resetProviderNonces();

    console.log(`⏪ Reverted to snapshot: ${id}`);
  }

  /**
   * Reset provider nonce cache after snapshot revert
   * This is necessary because ethers.js caches nonces, but they become
   * stale after a chain revert.
   *
   * OPTIMIZED: Only recreates wallet instances without fetching balances
   */
  /**
   * Reset the NonceManager cache for all accounts
   * This forces wallets to re-fetch nonces from the chain
   */
  public resetProviderNonces(): void {
    if (!this.provider || !this.state) return;

    // Reset each NonceManager's internal state
    for (const account of this.state.accounts) {
      const signer = account.signer as NonceManager;
      if (signer.reset) {
        signer.reset();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Time Manipulation
  // ---------------------------------------------------------------------------

  /**
   * Mine a specific number of blocks
   */
  async mineBlocks(count: number = 1): Promise<void> {
    this.ensureRunning();

    for (let i = 0; i < count; i++) {
      await this.provider!.send('evm_mine', []);
    }

    console.log(`⛏️  Mined ${count} block(s)`);
  }

  /**
   * Increase blockchain time
   */
  async increaseTime(seconds: number): Promise<void> {
    this.ensureRunning();

    await this.provider!.send('evm_increaseTime', [seconds]);
    await this.provider!.send('evm_mine', []);

    console.log(`⏰ Time increased by ${seconds} seconds`);
  }

  /**
   * Set next block timestamp
   */
  async setNextBlockTimestamp(timestamp: number): Promise<void> {
    this.ensureRunning();

    await this.provider!.send('evm_setNextBlockTimestamp', [timestamp]);

    console.log(`⏰ Next block timestamp set to ${timestamp}`);
  }

  /**
   * Get current chain timestamp
   */
  async getTimestamp(): Promise<number> {
    this.ensureRunning();

    const block = await this.provider!.getBlock('latest');
    return block?.timestamp ?? Math.floor(Date.now() / 1000);
  }

  // ---------------------------------------------------------------------------
  // Account Management
  // ---------------------------------------------------------------------------

  /**
   * Get a test account by index
   */
  getAccount(index: number): TestAccount {
    this.ensureRunning();

    if (index < 0 || index >= this.state!.accounts.length) {
      throw new Error(
        `Account index ${index} out of range (0-${this.state!.accounts.length - 1})`,
      );
    }

    return this.state!.accounts[index];
  }

  /**
   * Get all test accounts
   */
  getAccounts(): TestAccount[] {
    this.ensureRunning();
    return [...this.state!.accounts];
  }

  /**
   * Get the deployer account (first account)
   */
  getDeployer(): TestAccount {
    return this.getAccount(0);
  }

  /**
   * Impersonate an address (useful for testing with real addresses)
   */
  async impersonate(address: string): Promise<Signer> {
    this.ensureRunning();

    await this.provider!.send('hardhat_impersonateAccount', [address]);

    // Fund the impersonated account
    await this.fundAccount(address, ethers.parseEther('100'));

    return this.provider!.getSigner(address);
  }

  /**
   * Stop impersonating an address
   */
  async stopImpersonating(address: string): Promise<void> {
    this.ensureRunning();
    await this.provider!.send('hardhat_stopImpersonatingAccount', [address]);
  }

  /**
   * Fund an account with ETH
   */
  async fundAccount(address: string, amount: bigint): Promise<void> {
    this.ensureRunning();

    await this.provider!.send('hardhat_setBalance', [
      address,
      '0x' + amount.toString(16),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Get the JSON-RPC provider
   */
  getProvider(): JsonRpcProvider {
    this.ensureRunning();
    return this.provider!;
  }

  /**
   * Get the RPC URL
   */
  getRpcUrl(): string {
    this.ensureRunning();
    return this.state!.rpcUrl;
  }

  /**
   * Get the chain ID
   */
  getChainId(): number {
    this.ensureRunning();
    return this.state!.chainId;
  }

  /**
   * Check if chain is running
   */
  isRunning(): boolean {
    return this.state?.isRunning ?? false;
  }

  /**
   * Get current state
   */
  getState(): ChainState | null {
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private async startHardhat(): Promise<void> {
    const args = [
      'hardhat',
      'node',
      '--port',
      String(this.config.port),
      '--hostname',
      '127.0.0.1',
    ];

    if (this.config.forkUrl) {
      args.push('--fork', this.config.forkUrl);
      if (this.config.forkBlockNumber) {
        args.push('--fork-block-number', String(this.config.forkBlockNumber));
      }
    }

    this.process = spawn('npx', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    this.setupProcessHandlers('Hardhat');
  }

  private async startAnvil(): Promise<void> {
    const args = [
      '--port',
      String(this.config.port),
      '--chain-id',
      String(this.config.chainId),
      '--accounts',
      String(this.config.accounts),
      '--balance',
      this.config.balance,
      '--mnemonic',
      HARDHAT_MNEMONIC,
    ];

    if (this.config.blockTime > 0) {
      args.push('--block-time', String(this.config.blockTime));
    }

    if (this.config.forkUrl) {
      args.push('--fork-url', this.config.forkUrl);
      if (this.config.forkBlockNumber) {
        args.push('--fork-block-number', String(this.config.forkBlockNumber));
      }
    }

    // Try to find anvil in common locations
    const isWindows = process.platform === 'win32';
    const anvilPaths = isWindows
      ? [
          `${process.env.USERPROFILE}\\.foundry\\bin\\anvil.exe`,
          'anvil.exe',
          'anvil',
        ]
      : [`${process.env.HOME}/.foundry/bin/anvil`, 'anvil'];

    let anvilCmd = 'anvil';
    for (const path of anvilPaths) {
      try {
        const { execSync } = require('child_process');
        execSync(`"${path}" --version`, { stdio: 'ignore', shell: true });
        anvilCmd = path;
        console.log(`🔧 Found Anvil at: ${anvilCmd}`);
        break;
      } catch {
        // Try next path
      }
    }

    this.process = spawn(anvilCmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false, // Don't use shell on Windows for better process control
      windowsHide: true,
    });

    this.setupProcessHandlers('Anvil');
  }

  private setupProcessHandlers(name: string): void {
    if (!this.process) return;

    this.process.stdout?.on('data', (data) => {
      const output = data.toString();
      if (process.env.DEBUG_CHAIN) {
        console.log(`[${name}] ${output}`);
      }
    });

    this.process.stderr?.on('data', (data) => {
      const output = data.toString();
      // Filter out common non-error messages
      if (!output.includes('Listening on') && !output.includes('Started')) {
        console.error(`[${name} Error] ${output}`);
      }
    });

    this.process.on('error', (error) => {
      console.error(`[${name}] Process error:`, error);
      this.emit('error', error);
    });

    this.process.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[${name}] Process exited with code ${code}`);
      }
      this.emit('exit', code);
    });
  }

  private async waitForReady(maxAttempts: number = 30): Promise<void> {
    const rpcUrl = `http://127.0.0.1:${this.config.port}`;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const tempProvider = new JsonRpcProvider(rpcUrl);
        await tempProvider.getBlockNumber();
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    throw new Error(`Chain failed to start after ${maxAttempts} attempts`);
  }

  private async initializeProvider(): Promise<void> {
    const rpcUrl = `http://127.0.0.1:${this.config.port}`;
    this.provider = new JsonRpcProvider(rpcUrl);

    // Get chain ID
    const network = await this.provider.getNetwork();
    const chainId = Number(network.chainId);

    // Use pre-computed Hardhat accounts (these are deterministic)
    const accounts: TestAccount[] = [];
    const numAccounts = Math.min(this.config.accounts, HARDHAT_ACCOUNTS.length);

    for (let i = 0; i < numAccounts; i++) {
      const { address, privateKey } = HARDHAT_ACCOUNTS[i];
      const wallet = new Wallet(privateKey, this.provider);
      // Wrap with NonceManager to always fetch nonce from chain
      // This prevents stale nonce errors when reusing wallets across test files
      const nonceManager = new NonceManager(wallet);
      const balance = await this.provider.getBalance(address);

      accounts.push({
        address,
        privateKey,
        signer: nonceManager,
        balance,
      });
    }

    this.state = {
      isRunning: true,
      port: this.config.port,
      chainId,
      rpcUrl,
      accounts,
    };
  }

  private ensureRunning(): void {
    if (!this.state?.isRunning || !this.provider) {
      throw new Error('Chain is not running. Call start() first.');
    }
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a Hardhat chain manager
 */
export function createHardhatChain(
  config?: Partial<ChainConfig>,
): ChainManager {
  return new ChainManager({ ...config, type: 'hardhat' });
}

/**
 * Create an Anvil chain manager
 */
export function createAnvilChain(config?: Partial<ChainConfig>): ChainManager {
  return new ChainManager({ ...config, type: 'anvil' });
}

/**
 * Create a chain manager based on environment
 */
export function createChain(config?: Partial<ChainConfig>): ChainManager {
  const type = (process.env.CHAIN as ChainType) || config?.type || 'hardhat';
  return new ChainManager({ ...config, type });
}

// =============================================================================
// SINGLETON INSTANCE (using globalThis for cross-module sharing in Vitest)
// =============================================================================

// Declare global type for TypeScript
declare global {
  var __chainManager: ChainManager | undefined;
}

/**
 * Get or create the global chain instance
 * Uses globalThis to ensure the same instance is shared across all test files
 */
export function getGlobalChain(config?: ChainConfig): ChainManager {
  if (!globalThis.__chainManager) {
    globalThis.__chainManager = createChain(config);
  }
  return globalThis.__chainManager;
}

/**
 * Reset the global chain instance
 */
export async function resetGlobalChain(): Promise<void> {
  if (globalThis.__chainManager) {
    await globalThis.__chainManager.stop();
    globalThis.__chainManager = undefined;
  }
}
