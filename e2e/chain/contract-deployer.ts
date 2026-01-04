/**
 * Contract Deployer - Deploy contracts to local test chain
 *
 * Uses the existing deploy.config.ts to deploy contracts
 * in the correct order with proper dependencies.
 */

import {
  ethers,
  Contract,
  ContractFactory,
  Signer,
  JsonRpcProvider,
} from 'ethers';
import { ChainManager, TestAccount } from './chain-manager';
import {
  CONTRACTS,
  ContractConfig,
  DEPLOYMENT_MODES,
} from '../../scripts/deploy.config';

// =============================================================================
// TYPES
// =============================================================================

export interface DeployedContract {
  name: string;
  address: string;
  contract: Contract;
  deploymentBlock: number;
  transactionHash: string;
}

export interface DeploymentResult {
  contracts: Map<string, DeployedContract>;
  deployer: string;
  chainId: number;
  timestamp: number;
}

export interface DeployOptions {
  mode?: string;
  contracts?: string[];
  verbose?: boolean;
  skipPostDeploy?: boolean;
}

// =============================================================================
// CONTRACT ARTIFACTS
// =============================================================================

// Import contract factories from typechain
async function getContractFactory(
  contractName: string,
  signer: Signer,
): Promise<ContractFactory> {
  // Dynamic import to avoid loading all artifacts at once
  const factories = await import('../../typechain-types');

  const factoryName = `${contractName}__factory`;
  const Factory = (factories as any)[factoryName];

  if (!Factory) {
    throw new Error(`Contract factory not found: ${factoryName}`);
  }

  return new Factory(signer);
}

// =============================================================================
// CONTRACT DEPLOYER CLASS
// =============================================================================

export class ContractDeployer {
  private chain: ChainManager;
  private deployedContracts: Map<string, DeployedContract> = new Map();
  private deployer: TestAccount | null = null;
  private verbose: boolean = false;

  constructor(chain: ChainManager) {
    this.chain = chain;
  }

  // ---------------------------------------------------------------------------
  // Deployment Methods
  // ---------------------------------------------------------------------------

  /**
   * Deploy contracts based on a deployment mode
   */
  async deployMode(
    mode: string,
    options: DeployOptions = {},
  ): Promise<DeploymentResult> {
    const deploymentMode = DEPLOYMENT_MODES[mode];
    if (!deploymentMode) {
      throw new Error(
        `Unknown deployment mode: ${mode}. Available: ${Object.keys(DEPLOYMENT_MODES).join(', ')}`,
      );
    }

    console.log(`\n📦 Deploying: ${deploymentMode.name}`);
    console.log(`   ${deploymentMode.description}\n`);

    return this.deployContracts(deploymentMode.contracts, options);
  }

  /**
   * Deploy specific contracts
   */
  async deployContracts(
    contractNames: string[],
    options: DeployOptions = {},
  ): Promise<DeploymentResult> {
    this.verbose = options.verbose ?? false;
    this.deployer = this.chain.getDeployer();

    const provider = this.chain.getProvider();
    const chainId = this.chain.getChainId();

    console.log(`🔧 Deployer: ${this.deployer.address}`);
    console.log(`🔗 Chain ID: ${chainId}\n`);

    // Sort contracts by dependencies
    const sortedContracts = this.topologicalSort(contractNames);

    for (const contractName of sortedContracts) {
      await this.deployContract(contractName, options);
    }

    const result: DeploymentResult = {
      contracts: new Map(this.deployedContracts),
      deployer: this.deployer.address,
      chainId,
      timestamp: Date.now(),
    };

    this.printDeploymentSummary(result);

    return result;
  }

  /**
   * Deploy a single contract
   */
  async deployContract(
    contractName: string,
    options: DeployOptions = {},
  ): Promise<DeployedContract> {
    const config = CONTRACTS[contractName];
    if (!config) {
      throw new Error(`Unknown contract: ${contractName}`);
    }

    // Check if already deployed
    if (this.deployedContracts.has(contractName)) {
      this.log(`⏭️  ${contractName} already deployed`);
      return this.deployedContracts.get(contractName)!;
    }

    // Check dependencies
    if (config.dependencies) {
      for (const dep of config.dependencies) {
        if (!this.deployedContracts.has(dep)) {
          await this.deployContract(dep, options);
        }
      }
    }

    this.log(`📄 Deploying ${contractName}...`);

    const signer = this.deployer!.signer;
    const factory = await getContractFactory(config.contractName, signer);

    // Build constructor arguments
    const addresses = this.getDeployedAddresses();
    const args = config.constructorArgs
      ? config.constructorArgs(addresses, this.deployer!.address)
      : [];

    if (this.verbose && args.length > 0) {
      console.log(`   Constructor args: ${JSON.stringify(args)}`);
    }

    // Deploy contract
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    const deployTx = contract.deploymentTransaction();
    const receipt = await deployTx?.wait();

    const deployed: DeployedContract = {
      name: contractName,
      address,
      contract,
      deploymentBlock: receipt?.blockNumber ?? 0,
      transactionHash: receipt?.hash ?? '',
    };

    this.deployedContracts.set(contractName, deployed);

    console.log(`   ✅ ${contractName} deployed at ${address}`);

    // Run post-deploy hook
    if (!options.skipPostDeploy && config.postDeploy) {
      await config.postDeploy(contract, addresses, this.deployer!.address);
    }

    return deployed;
  }

  /**
   * Deploy all core contracts
   */
  async deployCore(options: DeployOptions = {}): Promise<DeploymentResult> {
    return this.deployMode('full', options);
  }

  /**
   * Deploy Diamond with all facets
   */
  async deployDiamond(options: DeployOptions = {}): Promise<DeploymentResult> {
    return this.deployMode('diamond', options);
  }

  /**
   * Deploy everything
   */
  async deployAll(options: DeployOptions = {}): Promise<DeploymentResult> {
    return this.deployMode('all', options);
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Get deployed contract by name
   */
  getContract(name: string): DeployedContract | undefined {
    return this.deployedContracts.get(name);
  }

  /**
   * Get all deployed contracts
   */
  getAllContracts(): Map<string, DeployedContract> {
    return new Map(this.deployedContracts);
  }

  /**
   * Get deployed addresses as a record
   */
  getDeployedAddresses(): Record<string, string> {
    const addresses: Record<string, string> = {};
    for (const [name, deployed] of this.deployedContracts) {
      addresses[name] = deployed.address;
    }
    return addresses;
  }

  /**
   * Clear deployed contracts (for fresh deployment)
   */
  clear(): void {
    this.deployedContracts.clear();
  }

  /**
   * Get contract instance connected to a specific signer
   */
  getContractWithSigner(name: string, signer: Signer): Contract {
    const deployed = this.deployedContracts.get(name);
    if (!deployed) {
      throw new Error(`Contract not deployed: ${name}`);
    }
    return deployed.contract.connect(signer) as Contract;
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  /**
   * Topological sort for dependency resolution
   */
  private topologicalSort(contractNames: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const config = CONTRACTS[name];
      if (!config) {
        throw new Error(`Unknown contract: ${name}`);
      }

      // Visit dependencies first
      if (config.dependencies) {
        for (const dep of config.dependencies) {
          // Only include dependency if it's in our deployment list
          if (contractNames.includes(dep)) {
            visit(dep);
          }
        }
      }

      result.push(name);
    };

    for (const name of contractNames) {
      visit(name);
    }

    return result;
  }

  /**
   * Print deployment summary
   */
  private printDeploymentSummary(result: DeploymentResult): void {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 DEPLOYMENT SUMMARY');
    console.log('═'.repeat(60));

    for (const [name, deployed] of result.contracts) {
      console.log(`   ${name.padEnd(20)} ${deployed.address}`);
    }

    console.log('═'.repeat(60));
    console.log(`   Total contracts: ${result.contracts.size}`);
    console.log(`   Deployer: ${result.deployer}`);
    console.log(`   Chain ID: ${result.chainId}`);
    console.log('═'.repeat(60) + '\n');
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a contract deployer for a chain
 */
export function createDeployer(chain: ChainManager): ContractDeployer {
  return new ContractDeployer(chain);
}

// =============================================================================
// QUICK DEPLOYMENT HELPERS
// =============================================================================

/**
 * Deploy contracts to a running chain and return the result
 */
export async function quickDeploy(
  chain: ChainManager,
  mode: string = 'full',
  options: DeployOptions = {},
): Promise<DeploymentResult> {
  const deployer = createDeployer(chain);
  return deployer.deployMode(mode, options);
}

/**
 * Deploy specific contracts to a running chain
 */
export async function deploySpecific(
  chain: ChainManager,
  contracts: string[],
  options: DeployOptions = {},
): Promise<DeploymentResult> {
  const deployer = createDeployer(chain);
  return deployer.deployContracts(contracts, options);
}
