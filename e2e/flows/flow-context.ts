/**
 * Flow Context - Manages test state and user context for E2E flows
 *
 * Provides a unified context for managing test accounts, balances,
 * deployed contracts, and test state.
 */

import { ethers, Signer, Contract, JsonRpcProvider } from 'ethers';
import { ChainManager, TestAccount } from '../chain/chain-manager';
import {
  ContractDeployer,
  DeployedContract,
  DeploymentResult,
} from '../chain/contract-deployer';
import { WalletMock, createWalletMock } from './wallet-mock';
import {
  CoverageTracker,
  getCoverageTracker,
} from '../coverage/coverage-tracker';

// =============================================================================
// TYPES
// =============================================================================

export interface TestUser {
  name: string;
  account: TestAccount;
  signer: Signer;
  address: string;
  role: UserRole;
}

export type UserRole =
  | 'deployer'
  | 'operator'
  | 'customer'
  | 'driver'
  | 'node'
  | 'investor'
  | 'provider';

export interface FlowContextOptions {
  /** Enable verbose logging */
  verbose?: boolean;
  /** Track coverage automatically */
  trackCoverage?: boolean;
  /** Auto-fund accounts with ETH */
  autoFund?: boolean;
  /** Default ETH amount for auto-funding */
  defaultFundAmount?: string;
}

export interface TestSnapshot {
  id: string;
  description: string;
  timestamp: number;
}

// =============================================================================
// FLOW CONTEXT CLASS
// =============================================================================

export class FlowContext {
  private chain: ChainManager;
  private deployer: ContractDeployer;
  private walletMock: WalletMock | null = null;
  private users: Map<string, TestUser> = new Map();
  private contracts: Map<string, DeployedContract> = new Map();
  private options: Required<FlowContextOptions>;
  private coverageTracker: CoverageTracker;
  private snapshots: TestSnapshot[] = [];
  private currentTest: string | null = null;

  constructor(chain: ChainManager, options: FlowContextOptions = {}) {
    this.chain = chain;
    this.deployer = new ContractDeployer(chain);

    this.options = {
      verbose: options.verbose ?? false,
      trackCoverage: options.trackCoverage ?? true,
      autoFund: options.autoFund ?? true,
      defaultFundAmount: options.defaultFundAmount ?? '1000',
    };

    this.coverageTracker = getCoverageTracker();
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initialize the flow context with deployed contracts
   */
  async initialize(deploymentMode: string = 'full'): Promise<void> {
    this.log('🚀 Initializing flow context...');

    // Deploy contracts
    const result = await this.deployer.deployMode(deploymentMode);

    // Store deployed contracts
    for (const [name, deployed] of result.contracts) {
      this.contracts.set(name, deployed);
    }

    // Create default users
    await this.createDefaultUsers();

    // Setup test environment (tokens, roles, etc.)
    await this.setupTestEnvironment();

    // Create wallet mock
    this.walletMock = createWalletMock(this.chain, {
      verbose: this.options.verbose,
    });

    this.log('✅ Flow context initialized');
  }

  /**
   * Setup test environment with tokens and roles
   */
  private async setupTestEnvironment(): Promise<void> {
    this.log('🔧 Setting up test environment...');

    try {
      // 1. Mint AURA tokens to all test accounts
      await this.mintTokensToTestAccounts();
    } catch (error) {
      this.log(
        `⚠️ Token minting failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    try {
      // 2. Setup AuStake admin roles
      await this.setupAuStakeRoles();
    } catch (error) {
      this.log(
        `⚠️ AuStake role setup failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    try {
      // 3. Setup AuSys roles (admin, driver)
      await this.setupAuSysRoles();
    } catch (error) {
      this.log(
        `⚠️ AuSys role setup failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    try {
      // 4. Setup RWYVault operator approvals
      await this.setupRWYVaultOperators();
    } catch (error) {
      this.log(
        `⚠️ RWYVault operator setup failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    // Skip node registration for now - it's complex and may not be needed for basic tests
    // try {
    //   // 5. Setup node registrations (for AuSys orders)
    //   await this.setupNodeRegistrations();
    // } catch (error) {
    //   this.log(`⚠️ Node registration failed: ${error instanceof Error ? error.message : 'unknown'}`);
    // }

    this.log('✅ Test environment setup complete');
  }

  /**
   * Mint AURA tokens to all test accounts
   */
  private async mintTokensToTestAccounts(): Promise<void> {
    const aura = this.contracts.get('Aura');
    if (!aura) {
      this.log('⚠️ Aura contract not deployed, skipping token minting');
      return;
    }

    const deployer = this.getUser('deployer');
    const auraContract = aura.contract.connect(deployer.signer) as Contract;

    // Mint a large amount to deployer first
    const mintAmount = 1000000; // 1 million tokens (contract multiplies by 10^18)
    this.log(`💰 Minting ${mintAmount} AURA tokens to deployer...`);
    const mintTx = await auraContract.mintTokenToTreasury(mintAmount);
    await mintTx.wait();

    // Distribute to all test users
    const distributionAmount = ethers.parseEther('10000'); // 10k tokens each
    const usersToFund = [
      'operator1',
      'operator2',
      'customer1',
      'customer2',
      'driver1',
      'driver2',
      'node1',
      'node2',
      'investor1',
      'investor2',
      'provider1',
      'provider2',
    ];

    for (const userName of usersToFund) {
      const user = this.users.get(userName);
      if (user) {
        const tx = await auraContract.transfer(
          user.address,
          distributionAmount,
        );
        await tx.wait();
        this.log(`  💵 Funded ${userName} with 10,000 AURA`);
      }
    }
  }

  /**
   * Setup AuStake admin roles
   */
  private async setupAuStakeRoles(): Promise<void> {
    const auStake = this.contracts.get('AuStake');
    if (!auStake) {
      this.log('⚠️ AuStake contract not deployed, skipping role setup');
      return;
    }

    const deployer = this.getUser('deployer');
    const auStakeContract = auStake.contract.connect(
      deployer.signer,
    ) as Contract;

    // Make providers admins so they can create operations
    const providers = ['provider1', 'provider2'];
    for (const providerName of providers) {
      const provider = this.users.get(providerName);
      if (provider) {
        const tx = await auStakeContract.setAdmin(provider.address, true);
        await tx.wait();
        this.log(`  👮 Set ${providerName} as AuStake admin`);
      }
    }
  }

  /**
   * Setup AuSys roles (admin, driver, dispatcher)
   */
  private async setupAuSysRoles(): Promise<void> {
    const auSys = this.contracts.get('AuSys');
    if (!auSys) {
      this.log('⚠️ AuSys contract not deployed, skipping role setup');
      return;
    }

    const deployer = this.getUser('deployer');
    const auSysContract = auSys.contract.connect(deployer.signer) as Contract;

    // Set deployer as admin first
    const setAdminTx = await auSysContract.setAdmin(deployer.address);
    await setAdminTx.wait();
    this.log('  👮 Set deployer as AuSys admin');

    // Set drivers
    const drivers = ['driver1', 'driver2'];
    for (const driverName of drivers) {
      const driver = this.users.get(driverName);
      if (driver) {
        const tx = await auSysContract.setDriver(driver.address, true);
        await tx.wait();
        this.log(`  🚗 Set ${driverName} as AuSys driver`);
      }
    }
  }

  /**
   * Setup RWYVault operator approvals
   */
  private async setupRWYVaultOperators(): Promise<void> {
    const rwyVault = this.contracts.get('RWYVault');
    if (!rwyVault) {
      this.log('⚠️ RWYVault contract not deployed, skipping operator setup');
      return;
    }

    const deployer = this.getUser('deployer');
    const rwyVaultContract = rwyVault.contract.connect(
      deployer.signer,
    ) as Contract;

    // Approve operators
    const operators = ['operator1', 'operator2'];
    for (const operatorName of operators) {
      const operator = this.users.get(operatorName);
      if (operator) {
        const tx = await rwyVaultContract.approveOperator(operator.address);
        await tx.wait();
        this.log(`  ✅ Approved ${operatorName} as RWYVault operator`);
      }
    }
  }

  /**
   * Setup node registrations for AuSys
   */
  private async setupNodeRegistrations(): Promise<void> {
    const nodeManager = this.contracts.get('AurumNodeManager');
    if (!nodeManager) {
      this.log(
        '⚠️ AurumNodeManager contract not deployed, skipping node setup',
      );
      return;
    }

    const deployer = this.getUser('deployer');
    const nodeManagerContract = nodeManager.contract.connect(
      deployer.signer,
    ) as Contract;

    // First set deployer as admin
    try {
      const adminTx = await nodeManagerContract.setAdmin(deployer.address);
      await adminTx.wait();
      this.log('  👮 Set deployer as AurumNodeManager admin');
    } catch (error) {
      this.log(
        `  ⚠️ Could not set admin: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    // Register nodes - registerNode takes a Node struct
    const nodes = ['node1', 'node2'];
    for (const nodeName of nodes) {
      const nodeUser = this.users.get(nodeName);
      if (nodeUser) {
        try {
          // Node struct: { location: NodeLocationData, validNode: bytes1, owner: address, supportedAssets: Asset[], status: bytes1 }
          // NodeLocationData: { addressName: string, location: Location }
          // Location: { lat: string, lng: string }
          const nodeStruct = {
            location: {
              addressName: `${nodeName} Warehouse`,
              location: { lat: '40.7128', lng: '-74.0060' },
            },
            validNode: '0x01',
            owner: nodeUser.address,
            supportedAssets: [],
            status: '0x01',
          };

          const tx = await nodeManagerContract.registerNode(nodeStruct);
          const receipt = await tx.wait();

          // Get the node address from the event
          const event = receipt.logs.find(
            (log: any) => log.fragment?.name === 'NodeRegistered',
          );
          if (event) {
            const nodeAddress = event.args?.[0];
            this.log(`  📍 Registered ${nodeName} as node at ${nodeAddress}`);
          } else {
            this.log(`  📍 Registered ${nodeName} as node`);
          }
        } catch (error) {
          // Node registration might fail if already registered or other issues
          this.log(
            `  ⚠️ Could not register ${nodeName}: ${error instanceof Error ? error.message : 'unknown error'}`,
          );
        }
      }
    }
  }

  /**
   * Create default test users with roles
   */
  private async createDefaultUsers(): Promise<void> {
    const accounts = this.chain.getAccounts();

    const defaultUsers: { name: string; index: number; role: UserRole }[] = [
      { name: 'deployer', index: 0, role: 'deployer' },
      { name: 'operator1', index: 1, role: 'operator' },
      { name: 'operator2', index: 2, role: 'operator' },
      { name: 'customer1', index: 3, role: 'customer' },
      { name: 'customer2', index: 4, role: 'customer' },
      { name: 'driver1', index: 5, role: 'driver' },
      { name: 'driver2', index: 6, role: 'driver' },
      { name: 'node1', index: 7, role: 'node' },
      { name: 'node2', index: 8, role: 'node' },
      { name: 'investor1', index: 9, role: 'investor' },
      { name: 'investor2', index: 10, role: 'investor' },
      { name: 'provider1', index: 11, role: 'provider' },
      { name: 'provider2', index: 12, role: 'provider' },
      // Special users for security testing
      { name: 'attacker', index: 13, role: 'customer' }, // Malicious actor
      { name: 'random', index: 14, role: 'customer' }, // Random user without permissions
    ];

    for (const { name, index, role } of defaultUsers) {
      if (index < accounts.length) {
        const account = accounts[index];
        this.users.set(name, {
          name,
          account,
          signer: account.signer,
          address: account.address,
          role,
        });
      }
    }

    this.log(`👥 Created ${this.users.size} default users`);
  }

  // ---------------------------------------------------------------------------
  // User Management
  // ---------------------------------------------------------------------------

  /**
   * Get a test user by name
   */
  getUser(name: string): TestUser {
    const user = this.users.get(name);
    if (!user) {
      throw new Error(
        `Unknown user: ${name}. Available: ${Array.from(this.users.keys()).join(', ')}`,
      );
    }
    return user;
  }

  /**
   * Get users by role
   */
  getUsersByRole(role: UserRole): TestUser[] {
    return Array.from(this.users.values()).filter((u) => u.role === role);
  }

  /**
   * Get the deployer user
   */
  getDeployer(): TestUser {
    return this.getUser('deployer');
  }

  /**
   * Create a custom user from an account index
   */
  createUser(name: string, accountIndex: number, role: UserRole): TestUser {
    const account = this.chain.getAccount(accountIndex);
    const user: TestUser = {
      name,
      account,
      signer: account.signer,
      address: account.address,
      role,
    };
    this.users.set(name, user);
    return user;
  }

  /**
   * Switch wallet mock to a specific user
   */
  switchUser(name: string): void {
    const user = this.getUser(name);
    const accounts = this.chain.getAccounts();
    const index = accounts.findIndex((a) => a.address === user.address);

    if (index === -1) {
      throw new Error(`User account not found in chain: ${name}`);
    }

    this.walletMock?.switchAccount(index);
    this.log(`👤 Switched to user: ${name} (${user.address})`);
  }

  // ---------------------------------------------------------------------------
  // Contract Access
  // ---------------------------------------------------------------------------

  /**
   * Get a deployed contract by name
   */
  getContract(name: string): Contract {
    const deployed = this.contracts.get(name);
    if (!deployed) {
      throw new Error(
        `Contract not deployed: ${name}. Available: ${Array.from(this.contracts.keys()).join(', ')}`,
      );
    }
    return deployed.contract;
  }

  /**
   * Get contract address by name
   */
  getContractAddress(name: string): string {
    const deployed = this.contracts.get(name);
    if (!deployed) {
      throw new Error(`Contract not deployed: ${name}`);
    }
    return deployed.address;
  }

  /**
   * Get contract connected to a specific user's signer
   */
  getContractAs(contractName: string, userName: string): Contract {
    const contract = this.getContract(contractName);
    const user = this.getUser(userName);
    return contract.connect(user.signer) as Contract;
  }

  /**
   * Get all deployed contract addresses
   */
  getContractAddresses(): Record<string, string> {
    const addresses: Record<string, string> = {};
    for (const [name, deployed] of this.contracts) {
      addresses[name] = deployed.address;
    }
    return addresses;
  }

  // ---------------------------------------------------------------------------
  // Chain Helpers
  // ---------------------------------------------------------------------------

  /**
   * Get the JSON-RPC provider
   */
  getProvider(): JsonRpcProvider {
    return this.chain.getProvider();
  }

  /**
   * Get the chain ID
   */
  getChainId(): number {
    return this.chain.getChainId();
  }

  /**
   * Mine blocks
   */
  async mineBlocks(count: number = 1): Promise<void> {
    await this.chain.mineBlocks(count);
  }

  /**
   * Increase blockchain time
   */
  async increaseTime(seconds: number): Promise<void> {
    await this.chain.increaseTime(seconds);
  }

  /**
   * Set next block timestamp
   */
  async setNextBlockTimestamp(timestamp: number): Promise<void> {
    await this.chain.setNextBlockTimestamp(timestamp);
  }

  /**
   * Get ETH balance for an address
   */
  async getBalance(address: string): Promise<bigint> {
    return this.getProvider().getBalance(address);
  }

  /**
   * Get ETH balance for a user
   */
  async getUserBalance(userName: string): Promise<bigint> {
    const user = this.getUser(userName);
    return this.getBalance(user.address);
  }

  /**
   * Fund an address with ETH
   */
  async fundAddress(
    address: string,
    amountEth: string = this.options.defaultFundAmount,
  ): Promise<void> {
    await this.chain.fundAccount(address, ethers.parseEther(amountEth));
  }

  /**
   * Fund a user with ETH
   */
  async fundUser(
    userName: string,
    amountEth: string = this.options.defaultFundAmount,
  ): Promise<void> {
    const user = this.getUser(userName);
    await this.fundAddress(user.address, amountEth);
  }

  // ---------------------------------------------------------------------------
  // Snapshot Management
  // ---------------------------------------------------------------------------

  /**
   * Take a snapshot of the current state
   */
  async snapshot(description?: string): Promise<string> {
    const id = await this.chain.snapshot(description);

    this.snapshots.push({
      id,
      description: description ?? `Snapshot ${this.snapshots.length + 1}`,
      timestamp: Date.now(),
    });

    return id;
  }

  /**
   * Revert to a snapshot
   */
  async revert(snapshotId?: string): Promise<void> {
    await this.chain.revert(snapshotId);
  }

  /**
   * Revert to the last snapshot
   */
  async revertToLast(): Promise<void> {
    const last = this.snapshots[this.snapshots.length - 1];
    if (!last) {
      throw new Error('No snapshots available');
    }
    await this.chain.revert(last.id);
  }

  // ---------------------------------------------------------------------------
  // Test Helpers
  // ---------------------------------------------------------------------------

  /**
   * Set the current test name (for coverage tracking)
   */
  setCurrentTest(testName: string): void {
    this.currentTest = testName;
    this.coverageTracker.setCurrentTest(testName);
  }

  /**
   * Clear the current test name
   */
  clearCurrentTest(): void {
    this.currentTest = null;
    this.coverageTracker.setCurrentTest(null);
  }

  /**
   * Mark a method as covered
   */
  markCovered(interfaceName: string, methodName: string): void {
    if (this.options.trackCoverage) {
      this.coverageTracker.mark(interfaceName, methodName);
    }
  }

  /**
   * Get the coverage tracker
   */
  getCoverageTracker(): CoverageTracker {
    return this.coverageTracker;
  }

  /**
   * Get the wallet mock
   */
  getWalletMock(): WalletMock | null {
    return this.walletMock;
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Reset the context (clear users, contracts, etc.)
   */
  reset(): void {
    this.users.clear();
    this.contracts.clear();
    this.snapshots = [];
    this.currentTest = null;
    this.deployer.clear();
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[FlowContext] ${message}`);
    }
  }
}

// =============================================================================
// SINGLETON & FACTORY
// =============================================================================

let globalContext: FlowContext | null = null;

/**
 * Get or create the global flow context
 */
export function getFlowContext(): FlowContext | null {
  return globalContext;
}

/**
 * Set the global flow context
 */
export function setGlobalContext(context: FlowContext): void {
  globalContext = context;
}

/**
 * Create a new flow context
 */
export function createFlowContext(
  chain: ChainManager,
  options?: FlowContextOptions,
): FlowContext {
  return new FlowContext(chain, options);
}

/**
 * Create and initialize a flow context
 */
export async function createAndInitializeContext(
  chain: ChainManager,
  deploymentMode: string = 'full',
  options?: FlowContextOptions,
): Promise<FlowContext> {
  const context = createFlowContext(chain, options);
  await context.initialize(deploymentMode);
  setGlobalContext(context);
  return context;
}
