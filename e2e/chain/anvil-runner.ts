/**
 * Anvil Runner - Specialized Anvil process management
 *
 * Provides advanced Anvil-specific features like state dumping,
 * loading, and advanced configuration options.
 */

import { spawn, ChildProcess, execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export interface AnvilConfig {
  port?: number;
  chainId?: number;
  accounts?: number;
  balance?: string;
  mnemonic?: string;
  blockTime?: number;
  forkUrl?: string;
  forkBlockNumber?: number;
  stepsTracing?: boolean;
  timestamp?: number;
  gasLimit?: number;
  gasPrice?: number;
  baseFee?: number;
  codeSizeLimit?: number;
  silent?: boolean;
}

export interface AnvilState {
  pid: number;
  port: number;
  chainId: number;
  accounts: AnvilAccount[];
}

export interface AnvilAccount {
  address: string;
  privateKey: string;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: Required<AnvilConfig> = {
  port: 8545,
  chainId: 31337,
  accounts: 20,
  balance: '10000',
  mnemonic: 'test test test test test test test test test test test junk',
  blockTime: 0,
  forkUrl: '',
  forkBlockNumber: 0,
  stepsTracing: false,
  timestamp: 0,
  gasLimit: 30000000,
  gasPrice: 0,
  baseFee: 0,
  codeSizeLimit: 0,
  silent: true,
};

// =============================================================================
// ANVIL RUNNER CLASS
// =============================================================================

export class AnvilRunner extends EventEmitter {
  private config: Required<AnvilConfig>;
  private process: ChildProcess | null = null;
  private state: AnvilState | null = null;
  private stateDir: string;

  constructor(config: AnvilConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stateDir = join(process.cwd(), '.anvil-state');
  }

  // ---------------------------------------------------------------------------
  // Lifecycle Methods
  // ---------------------------------------------------------------------------

  /**
   * Check if Anvil is installed
   */
  static isInstalled(): boolean {
    try {
      execSync('anvil --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Anvil version
   */
  static getVersion(): string | null {
    try {
      const output = execSync('anvil --version', { encoding: 'utf-8' });
      return output.trim();
    } catch {
      return null;
    }
  }

  /**
   * Start Anvil
   */
  async start(): Promise<AnvilState> {
    if (this.process) {
      console.log('⚠️  Anvil already running');
      return this.state!;
    }

    if (!AnvilRunner.isInstalled()) {
      throw new Error(
        'Anvil is not installed. Install Foundry: curl -L https://foundry.paradigm.xyz | bash',
      );
    }

    console.log('\n🔨 Starting Anvil...');

    const args = this.buildArgs();

    this.process = spawn('anvil', args, {
      stdio: this.config.silent ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      shell: true,
    });

    if (this.config.silent) {
      this.setupOutputHandlers();
    }

    this.setupProcessHandlers();

    // Wait for Anvil to be ready
    await this.waitForReady();

    // Parse accounts from output
    this.state = {
      pid: this.process.pid!,
      port: this.config.port,
      chainId: this.config.chainId,
      accounts: this.generateAccounts(),
    };

    this.emit('started', this.state);

    console.log(`✅ Anvil started on port ${this.config.port}`);
    console.log(`   PID: ${this.state.pid}`);
    console.log(`   Chain ID: ${this.state.chainId}`);

    return this.state;
  }

  /**
   * Stop Anvil
   */
  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    console.log('\n🛑 Stopping Anvil...');

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.process?.kill('SIGKILL');
        this.cleanup();
        resolve();
      }, 5000);

      this.process!.on('exit', () => {
        clearTimeout(timeout);
        this.cleanup();
        resolve();
      });

      this.process!.kill('SIGTERM');
    });
  }

  /**
   * Restart Anvil
   */
  async restart(): Promise<AnvilState> {
    await this.stop();
    return this.start();
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  /**
   * Dump current chain state to file
   */
  async dumpState(filename?: string): Promise<string> {
    if (!this.state) {
      throw new Error('Anvil is not running');
    }

    const stateFile = filename || `state-${Date.now()}.json`;
    const statePath = join(this.stateDir, stateFile);

    // Ensure directory exists
    if (!existsSync(this.stateDir)) {
      mkdirSync(this.stateDir, { recursive: true });
    }

    // Use Anvil's RPC to dump state
    const response = await fetch(`http://127.0.0.1:${this.config.port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'anvil_dumpState',
        params: [],
        id: 1,
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(`Failed to dump state: ${result.error.message}`);
    }

    writeFileSync(statePath, JSON.stringify(result.result, null, 2));

    console.log(`📦 State dumped to: ${statePath}`);
    return statePath;
  }

  /**
   * Load chain state from file
   */
  async loadState(statePath: string): Promise<void> {
    if (!this.state) {
      throw new Error('Anvil is not running');
    }

    if (!existsSync(statePath)) {
      throw new Error(`State file not found: ${statePath}`);
    }

    const stateData = readFileSync(statePath, 'utf-8');
    const state = JSON.parse(stateData);

    const response = await fetch(`http://127.0.0.1:${this.config.port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'anvil_loadState',
        params: [state],
        id: 1,
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(`Failed to load state: ${result.error.message}`);
    }

    console.log(`📥 State loaded from: ${statePath}`);
  }

  /**
   * Reset chain to initial state
   */
  async reset(forkUrl?: string, forkBlockNumber?: number): Promise<void> {
    if (!this.state) {
      throw new Error('Anvil is not running');
    }

    const params: any = {};
    if (forkUrl) {
      params.forking = {
        jsonRpcUrl: forkUrl,
        blockNumber: forkBlockNumber,
      };
    }

    const response = await fetch(`http://127.0.0.1:${this.config.port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'anvil_reset',
        params: Object.keys(params).length > 0 ? [params] : [],
        id: 1,
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(`Failed to reset: ${result.error.message}`);
    }

    console.log('🔄 Chain reset');
  }

  // ---------------------------------------------------------------------------
  // Mining Control
  // ---------------------------------------------------------------------------

  /**
   * Enable auto-mining
   */
  async enableAutoMine(): Promise<void> {
    await this.rpcCall('evm_setAutomine', [true]);
    console.log('⛏️  Auto-mining enabled');
  }

  /**
   * Disable auto-mining
   */
  async disableAutoMine(): Promise<void> {
    await this.rpcCall('evm_setAutomine', [false]);
    console.log('⛏️  Auto-mining disabled');
  }

  /**
   * Set mining interval
   */
  async setMiningInterval(seconds: number): Promise<void> {
    await this.rpcCall('evm_setIntervalMining', [seconds]);
    console.log(`⛏️  Mining interval set to ${seconds}s`);
  }

  /**
   * Mine a single block
   */
  async mine(): Promise<void> {
    await this.rpcCall('evm_mine', []);
  }

  /**
   * Mine multiple blocks
   */
  async mineBlocks(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      await this.mine();
    }
    console.log(`⛏️  Mined ${count} blocks`);
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /**
   * Get current state
   */
  getState(): AnvilState | null {
    return this.state;
  }

  /**
   * Get RPC URL
   */
  getRpcUrl(): string {
    return `http://127.0.0.1:${this.config.port}`;
  }

  /**
   * Check if running
   */
  isRunning(): boolean {
    return this.process !== null && this.state !== null;
  }

  /**
   * Get accounts
   */
  getAccounts(): AnvilAccount[] {
    return this.state?.accounts ?? [];
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private buildArgs(): string[] {
    const args: string[] = [
      '--port',
      String(this.config.port),
      '--chain-id',
      String(this.config.chainId),
      '--accounts',
      String(this.config.accounts),
      '--balance',
      this.config.balance,
      '--mnemonic',
      `"${this.config.mnemonic}"`,
    ];

    if (this.config.blockTime > 0) {
      args.push('--block-time', String(this.config.blockTime));
    }

    if (this.config.forkUrl) {
      args.push('--fork-url', this.config.forkUrl);
      if (this.config.forkBlockNumber > 0) {
        args.push('--fork-block-number', String(this.config.forkBlockNumber));
      }
    }

    if (this.config.stepsTracing) {
      args.push('--steps-tracing');
    }

    if (this.config.timestamp > 0) {
      args.push('--timestamp', String(this.config.timestamp));
    }

    if (this.config.gasLimit !== DEFAULT_CONFIG.gasLimit) {
      args.push('--gas-limit', String(this.config.gasLimit));
    }

    if (this.config.gasPrice > 0) {
      args.push('--gas-price', String(this.config.gasPrice));
    }

    if (this.config.baseFee > 0) {
      args.push('--base-fee', String(this.config.baseFee));
    }

    if (this.config.codeSizeLimit > 0) {
      args.push('--code-size-limit', String(this.config.codeSizeLimit));
    }

    return args;
  }

  private setupOutputHandlers(): void {
    this.process?.stdout?.on('data', (data) => {
      const output = data.toString();
      this.emit('stdout', output);
    });

    this.process?.stderr?.on('data', (data) => {
      const output = data.toString();
      this.emit('stderr', output);
    });
  }

  private setupProcessHandlers(): void {
    this.process?.on('error', (error) => {
      console.error('[Anvil] Process error:', error);
      this.emit('error', error);
    });

    this.process?.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`[Anvil] Process exited with code ${code}`);
      }
      this.emit('exit', code);
    });
  }

  private async waitForReady(maxAttempts: number = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://127.0.0.1:${this.config.port}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
        });

        const result = await response.json();
        if (!result.error) {
          return;
        }
      } catch {
        // Retry
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Anvil failed to start after ${maxAttempts} attempts`);
  }

  private generateAccounts(): AnvilAccount[] {
    const { ethers } = require('ethers');
    const accounts: AnvilAccount[] = [];

    const hdNode = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(this.config.mnemonic),
    );

    for (let i = 0; i < this.config.accounts; i++) {
      const wallet = hdNode.deriveChild(i);
      accounts.push({
        address: wallet.address,
        privateKey: wallet.privateKey,
      });
    }

    return accounts;
  }

  private async rpcCall(method: string, params: any[] = []): Promise<any> {
    if (!this.state) {
      throw new Error('Anvil is not running');
    }

    const response = await fetch(`http://127.0.0.1:${this.config.port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: 1,
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(`RPC error: ${result.error.message}`);
    }

    return result.result;
  }

  private cleanup(): void {
    this.process = null;
    this.state = null;
    this.emit('stopped');
    console.log('✅ Anvil stopped');
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create an Anvil runner instance
 */
export function createAnvilRunner(config?: AnvilConfig): AnvilRunner {
  return new AnvilRunner(config);
}
