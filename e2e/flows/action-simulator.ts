/**
 * Action Simulator - Simulates UI hook calls for E2E testing
 *
 * Provides functions that mirror the exact patterns used in React hooks,
 * enabling realistic testing of UI flows without a browser.
 */

import { ethers, Contract, ContractTransactionReceipt, Signer } from 'ethers';
import { FlowContext, TestUser } from './flow-context';
import { getCoverageTracker } from '../coverage/coverage-tracker';

// =============================================================================
// TYPES
// =============================================================================

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: string;
  receipt?: ContractTransactionReceipt;
  gasUsed?: bigint;
}

export interface ActionOptions {
  /** Wait for transaction confirmation */
  waitForConfirmation?: boolean;
  /** Number of confirmations to wait for */
  confirmations?: number;
  /** Track coverage for this action */
  trackCoverage?: boolean;
  /** Interface name for coverage tracking */
  interfaceName?: string;
  /** Method name for coverage tracking */
  methodName?: string;
}

// =============================================================================
// ACTION SIMULATOR CLASS
// =============================================================================

export class ActionSimulator {
  private context: FlowContext;
  private verbose: boolean;

  constructor(context: FlowContext, verbose: boolean = false) {
    this.context = context;
    this.verbose = verbose;
  }

  // ---------------------------------------------------------------------------
  // Generic Action Execution
  // ---------------------------------------------------------------------------

  /**
   * Execute a contract write action
   */
  async executeWrite<T = any>(
    contractName: string,
    methodName: string,
    args: any[],
    user: TestUser,
    options: ActionOptions = {},
  ): Promise<ActionResult<T>> {
    try {
      this.log(`📝 ${user.name} calling ${contractName}.${methodName}`);

      const contract = this.context.getContractAs(contractName, user.name);
      const method = contract[methodName];

      if (!method) {
        throw new Error(`Method ${methodName} not found on ${contractName}`);
      }

      // Execute transaction
      const tx = await method(...args);

      // Wait for confirmation if requested
      let receipt: ContractTransactionReceipt | null = null;
      if (options.waitForConfirmation !== false) {
        receipt = await tx.wait(options.confirmations ?? 1);
      }

      // Track coverage
      if (
        options.trackCoverage !== false &&
        options.interfaceName &&
        options.methodName
      ) {
        getCoverageTracker().mark(options.interfaceName, options.methodName);
      }

      this.log(`✅ ${contractName}.${methodName} succeeded`);

      return {
        success: true,
        transactionHash: tx.hash,
        receipt: receipt ?? undefined,
        gasUsed: receipt?.gasUsed,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(`❌ ${contractName}.${methodName} failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute a contract read action
   */
  async executeRead<T = any>(
    contractName: string,
    methodName: string,
    args: any[],
    options: ActionOptions = {},
  ): Promise<ActionResult<T>> {
    try {
      this.log(`📖 Reading ${contractName}.${methodName}`);

      const contract = this.context.getContract(contractName);
      const method = contract[methodName];

      if (!method) {
        throw new Error(`Method ${methodName} not found on ${contractName}`);
      }

      const result = await method(...args);

      // Track coverage
      if (
        options.trackCoverage !== false &&
        options.interfaceName &&
        options.methodName
      ) {
        getCoverageTracker().mark(options.interfaceName, options.methodName);
      }

      this.log(`✅ ${contractName}.${methodName} returned`);

      return {
        success: true,
        data: result as T,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(`❌ ${contractName}.${methodName} failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Token Helpers
  // ---------------------------------------------------------------------------

  /**
   * Approve ERC20 token spending
   */
  async approveERC20(
    tokenContract: Contract,
    spender: string,
    amount: bigint,
    user: TestUser,
  ): Promise<ActionResult> {
    try {
      const connectedToken = tokenContract.connect(user.signer);
      const tx = await connectedToken.approve(spender, amount);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        receipt,
        gasUsed: receipt.gasUsed,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Approve ERC1155 token for all
   */
  async approveERC1155ForAll(
    tokenContract: Contract,
    operator: string,
    approved: boolean,
    user: TestUser,
  ): Promise<ActionResult> {
    try {
      const connectedToken = tokenContract.connect(user.signer);
      const tx = await connectedToken.setApprovalForAll(operator, approved);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        receipt,
        gasUsed: receipt.gasUsed,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get ERC20 balance
   */
  async getERC20Balance(
    tokenContract: Contract,
    address: string,
  ): Promise<bigint> {
    return tokenContract.balanceOf(address);
  }

  /**
   * Get ERC1155 balance
   */
  async getERC1155Balance(
    tokenContract: Contract,
    address: string,
    tokenId: bigint,
  ): Promise<bigint> {
    return tokenContract.balanceOf(address, tokenId);
  }

  // ---------------------------------------------------------------------------
  // Event Helpers
  // ---------------------------------------------------------------------------

  /**
   * Get events from a transaction receipt
   */
  getEventsFromReceipt(
    receipt: ContractTransactionReceipt,
    contract: Contract,
    eventName: string,
  ): any[] {
    const events: any[] = [];

    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });

        if (parsed && parsed.name === eventName) {
          events.push({
            name: parsed.name,
            args: parsed.args,
            log,
          });
        }
      } catch {
        // Not a matching event
      }
    }

    return events;
  }

  /**
   * Wait for a specific event
   */
  async waitForEvent(
    contract: Contract,
    eventName: string,
    filter?: any,
    timeout: number = 30000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        contract.off(eventName, handler);
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      const handler = (...args: any[]) => {
        clearTimeout(timer);
        contract.off(eventName, handler);
        resolve(args);
      };

      if (filter) {
        contract.on(contract.filters[eventName](...filter), handler);
      } else {
        contract.on(eventName, handler);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Assertion Helpers
  // ---------------------------------------------------------------------------

  /**
   * Assert that an action succeeded
   */
  assertSuccess<T>(
    result: ActionResult<T>,
    message?: string,
  ): asserts result is ActionResult<T> & { success: true } {
    if (!result.success) {
      throw new Error(message ?? `Action failed: ${result.error}`);
    }
  }

  /**
   * Assert that an action failed
   */
  assertFailure<T>(
    result: ActionResult<T>,
    message?: string,
  ): asserts result is ActionResult<T> & { success: false } {
    if (result.success) {
      throw new Error(message ?? 'Expected action to fail but it succeeded');
    }
  }

  /**
   * Assert that an action failed with a specific error
   */
  assertFailureWithError<T>(
    result: ActionResult<T>,
    expectedError: string | RegExp,
  ): void {
    this.assertFailure(result);
    const errorMatches =
      typeof expectedError === 'string'
        ? result.error?.includes(expectedError)
        : expectedError.test(result.error ?? '');

    if (!errorMatches) {
      throw new Error(
        `Expected error "${expectedError}" but got "${result.error}"`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /**
   * Parse units (ETH to wei)
   */
  parseEther(value: string): bigint {
    return ethers.parseEther(value);
  }

  /**
   * Format units (wei to ETH)
   */
  formatEther(value: bigint): string {
    return ethers.formatEther(value);
  }

  /**
   * Parse units with decimals
   */
  parseUnits(value: string, decimals: number = 18): bigint {
    return ethers.parseUnits(value, decimals);
  }

  /**
   * Format units with decimals
   */
  formatUnits(value: bigint, decimals: number = 18): string {
    return ethers.formatUnits(value, decimals);
  }

  /**
   * Generate a random bytes32
   */
  randomBytes32(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  /**
   * Get current block timestamp
   */
  async getBlockTimestamp(): Promise<number> {
    const block = await this.context.getProvider().getBlock('latest');
    return block?.timestamp ?? Math.floor(Date.now() / 1000);
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[ActionSimulator] ${message}`);
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an action simulator
 */
export function createActionSimulator(
  context: FlowContext,
  verbose: boolean = false,
): ActionSimulator {
  return new ActionSimulator(context, verbose);
}
