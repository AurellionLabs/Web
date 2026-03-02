/**
 * Assertions - Custom matchers for contract state verification
 *
 * Provides assertion helpers specifically designed for blockchain
 * and smart contract testing.
 */

import { expect } from 'vitest';
import { ethers, Contract, ContractTransactionReceipt } from 'ethers';

// =============================================================================
// TRANSACTION ASSERTIONS
// =============================================================================

/**
 * Assert that a transaction succeeded
 */
export function assertTxSuccess(
  receipt: ContractTransactionReceipt | null | undefined,
): void {
  expect(receipt).not.toBeNull();
  expect(receipt).not.toBeUndefined();
  expect(receipt!.status).toBe(1);
}

/**
 * Assert that a transaction emitted a specific event
 */
export function assertEventEmitted(
  receipt: ContractTransactionReceipt,
  contract: Contract,
  eventName: string,
  expectedArgs?: Record<string, any>,
): void {
  const events = getEventsFromReceipt(receipt, contract, eventName);
  expect(events.length).toBeGreaterThan(0);

  if (expectedArgs) {
    const event = events[0];
    for (const [key, value] of Object.entries(expectedArgs)) {
      if (typeof value === 'bigint') {
        expect(event.args[key]).toBe(value);
      } else {
        expect(event.args[key]).toEqual(value);
      }
    }
  }
}

/**
 * Assert that a transaction did not emit a specific event
 */
export function assertEventNotEmitted(
  receipt: ContractTransactionReceipt,
  contract: Contract,
  eventName: string,
): void {
  const events = getEventsFromReceipt(receipt, contract, eventName);
  expect(events.length).toBe(0);
}

/**
 * Get events from a receipt
 */
export function getEventsFromReceipt(
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

// =============================================================================
// BALANCE ASSERTIONS
// =============================================================================

/**
 * Assert that a balance equals an expected value
 */
export function assertBalance(actual: bigint, expected: bigint | string): void {
  const expectedValue =
    typeof expected === 'string' ? ethers.parseEther(expected) : expected;
  expect(actual).toBe(expectedValue);
}

/**
 * Assert that a balance is greater than a value
 */
export function assertBalanceGt(
  actual: bigint,
  minimum: bigint | string,
): void {
  const minValue =
    typeof minimum === 'string' ? ethers.parseEther(minimum) : minimum;
  expect(actual).toBeGreaterThan(minValue);
}

/**
 * Assert that a balance is greater than or equal to a value
 */
export function assertBalanceGte(
  actual: bigint,
  minimum: bigint | string,
): void {
  const minValue =
    typeof minimum === 'string' ? ethers.parseEther(minimum) : minimum;
  expect(actual).toBeGreaterThanOrEqual(minValue);
}

/**
 * Assert that a balance is less than a value
 */
export function assertBalanceLt(
  actual: bigint,
  maximum: bigint | string,
): void {
  const maxValue =
    typeof maximum === 'string' ? ethers.parseEther(maximum) : maximum;
  expect(actual).toBeLessThan(maxValue);
}

/**
 * Assert that a balance changed by a specific amount
 */
export function assertBalanceChange(
  before: bigint,
  after: bigint,
  expectedChange: bigint | string,
): void {
  const change =
    typeof expectedChange === 'string'
      ? ethers.parseEther(expectedChange)
      : expectedChange;
  expect(after - before).toBe(change);
}

/**
 * Assert that a balance is within a range (for gas estimation tolerance)
 */
export function assertBalanceInRange(
  actual: bigint,
  expected: bigint | string,
  tolerancePercent: number = 1,
): void {
  const expectedValue =
    typeof expected === 'string' ? ethers.parseEther(expected) : expected;
  const tolerance =
    (expectedValue * BigInt(Math.round(tolerancePercent * 100))) / 10000n;

  expect(actual).toBeGreaterThanOrEqual(expectedValue - tolerance);
  expect(actual).toBeLessThanOrEqual(expectedValue + tolerance);
}

// =============================================================================
// CONTRACT STATE ASSERTIONS
// =============================================================================

/**
 * Assert that a contract call reverts
 */
export async function assertReverts(
  call: Promise<any>,
  expectedError?: string | RegExp,
): Promise<void> {
  let reverted = false;
  let errorMessage = '';

  try {
    await call;
  } catch (error) {
    reverted = true;
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  expect(reverted).toBe(true);

  if (expectedError) {
    if (typeof expectedError === 'string') {
      expect(errorMessage).toContain(expectedError);
    } else {
      expect(errorMessage).toMatch(expectedError);
    }
  }
}

/**
 * Assert that a contract call succeeds
 */
export async function assertSucceeds(call: Promise<any>): Promise<any> {
  let error: Error | null = null;

  try {
    return await call;
  } catch (e) {
    error = e as Error;
  }

  expect(error).toBeNull();
}

/**
 * Assert that a value matches a contract enum
 */
export function assertEnum(actual: number | bigint, expected: number): void {
  expect(Number(actual)).toBe(expected);
}

// =============================================================================
// BYTES32 & ADDRESS ASSERTIONS
// =============================================================================

/**
 * Assert that a bytes32 value is not zero
 */
export function assertNonZeroBytes32(value: string): void {
  expect(value).not.toBe(ethers.ZeroHash);
}

/**
 * Assert that an address is not zero
 */
export function assertNonZeroAddress(address: string): void {
  expect(address).not.toBe(ethers.ZeroAddress);
}

/**
 * Assert that an address equals another
 */
export function assertAddress(actual: string, expected: string): void {
  expect(actual.toLowerCase()).toBe(expected.toLowerCase());
}

/**
 * Assert that two addresses are different
 */
export function assertDifferentAddresses(
  address1: string,
  address2: string,
): void {
  expect(address1.toLowerCase()).not.toBe(address2.toLowerCase());
}

// =============================================================================
// TIME ASSERTIONS
// =============================================================================

/**
 * Assert that a timestamp is in the future
 */
export function assertFutureTimestamp(timestamp: number | bigint): void {
  const now = Math.floor(Date.now() / 1000);
  expect(Number(timestamp)).toBeGreaterThan(now);
}

/**
 * Assert that a timestamp is in the past
 */
export function assertPastTimestamp(timestamp: number | bigint): void {
  const now = Math.floor(Date.now() / 1000);
  expect(Number(timestamp)).toBeLessThan(now);
}

/**
 * Assert that a timestamp is within a range of another
 */
export function assertTimestampNear(
  actual: number | bigint,
  expected: number | bigint,
  toleranceSeconds: number = 60,
): void {
  const actualNum = Number(actual);
  const expectedNum = Number(expected);
  expect(actualNum).toBeGreaterThanOrEqual(expectedNum - toleranceSeconds);
  expect(actualNum).toBeLessThanOrEqual(expectedNum + toleranceSeconds);
}

// =============================================================================
// ARRAY ASSERTIONS
// =============================================================================

/**
 * Assert that an array contains an item
 */
export function assertContains<T>(array: T[], item: T): void {
  expect(array).toContain(item);
}

/**
 * Assert that an array has a specific length
 */
export function assertLength<T>(array: T[], length: number): void {
  expect(array.length).toBe(length);
}

/**
 * Assert that an array is not empty
 */
export function assertNotEmpty<T>(array: T[]): void {
  expect(array.length).toBeGreaterThan(0);
}

/**
 * Assert that an array is empty
 */
export function assertEmpty<T>(array: T[]): void {
  expect(array.length).toBe(0);
}
