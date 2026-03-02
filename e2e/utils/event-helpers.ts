/**
 * Event Helpers - Utilities for event verification and waiting
 *
 * Provides helpers for working with blockchain events in tests.
 */

import { Contract, ContractTransactionReceipt, EventLog, Log } from 'ethers';

// =============================================================================
// TYPES
// =============================================================================

export interface ParsedEvent {
  name: string;
  args: any;
  log: Log | EventLog;
  index: number;
}

export interface EventFilter {
  name: string;
  args?: Record<string, any>;
}

// =============================================================================
// EVENT EXTRACTION
// =============================================================================

/**
 * Extract all events from a transaction receipt
 */
export function extractEvents(
  receipt: ContractTransactionReceipt,
  contract: Contract,
): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  receipt.logs.forEach((log, index) => {
    try {
      const parsed = contract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (parsed) {
        events.push({
          name: parsed.name,
          args: parsed.args,
          log,
          index,
        });
      }
    } catch {
      // Not a matching event from this contract
    }
  });

  return events;
}

/**
 * Extract events of a specific type
 */
export function extractEventsByName(
  receipt: ContractTransactionReceipt,
  contract: Contract,
  eventName: string,
): ParsedEvent[] {
  return extractEvents(receipt, contract).filter((e) => e.name === eventName);
}

/**
 * Extract the first event of a specific type
 */
export function extractFirstEvent(
  receipt: ContractTransactionReceipt,
  contract: Contract,
  eventName: string,
): ParsedEvent | null {
  const events = extractEventsByName(receipt, contract, eventName);
  return events.length > 0 ? events[0] : null;
}

/**
 * Extract event argument value
 */
export function extractEventArg(
  receipt: ContractTransactionReceipt,
  contract: Contract,
  eventName: string,
  argName: string,
): any {
  const event = extractFirstEvent(receipt, contract, eventName);
  if (!event) {
    throw new Error(`Event ${eventName} not found in receipt`);
  }
  return event.args[argName];
}

// =============================================================================
// EVENT WAITING
// =============================================================================

/**
 * Wait for an event to be emitted
 */
export async function waitForEvent(
  contract: Contract,
  eventName: string,
  filter?: any[],
  timeout: number = 30000,
): Promise<ParsedEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    const handler = (...args: any[]) => {
      cleanup();
      clearTimeout(timer);

      // The last argument is the event object
      const eventObj = args[args.length - 1];

      resolve({
        name: eventName,
        args: args.slice(0, -1),
        log: eventObj.log,
        index: 0,
      });
    };

    const cleanup = () => {
      if (filter) {
        contract.off(contract.filters[eventName](...filter), handler);
      } else {
        contract.off(eventName, handler);
      }
    };

    if (filter) {
      contract.on(contract.filters[eventName](...filter), handler);
    } else {
      contract.on(eventName, handler);
    }
  });
}

/**
 * Wait for multiple events
 */
export async function waitForEvents(
  contract: Contract,
  eventNames: string[],
  timeout: number = 30000,
): Promise<Map<string, ParsedEvent[]>> {
  const results = new Map<string, ParsedEvent[]>();
  const pending = new Set(eventNames);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timeout waiting for events: ${Array.from(pending).join(', ')}`,
        ),
      );
    }, timeout);

    const handlers = new Map<string, (...args: any[]) => void>();

    const cleanup = () => {
      for (const [name, handler] of handlers) {
        contract.off(name, handler);
      }
    };

    for (const eventName of eventNames) {
      results.set(eventName, []);

      const handler = (...args: any[]) => {
        const eventObj = args[args.length - 1];
        const events = results.get(eventName)!;

        events.push({
          name: eventName,
          args: args.slice(0, -1),
          log: eventObj.log,
          index: events.length,
        });

        pending.delete(eventName);

        if (pending.size === 0) {
          cleanup();
          clearTimeout(timer);
          resolve(results);
        }
      };

      handlers.set(eventName, handler);
      contract.on(eventName, handler);
    }
  });
}

// =============================================================================
// EVENT VERIFICATION
// =============================================================================

/**
 * Verify that an event was emitted with specific arguments
 */
export function verifyEvent(
  receipt: ContractTransactionReceipt,
  contract: Contract,
  eventName: string,
  expectedArgs: Record<string, any>,
): boolean {
  const events = extractEventsByName(receipt, contract, eventName);

  for (const event of events) {
    let matches = true;

    for (const [key, expectedValue] of Object.entries(expectedArgs)) {
      const actualValue = event.args[key];

      if (typeof expectedValue === 'bigint') {
        if (actualValue !== expectedValue) {
          matches = false;
          break;
        }
      } else if (
        typeof expectedValue === 'string' &&
        expectedValue.startsWith('0x')
      ) {
        // Address comparison (case-insensitive)
        if (actualValue.toLowerCase() !== expectedValue.toLowerCase()) {
          matches = false;
          break;
        }
      } else {
        if (actualValue !== expectedValue) {
          matches = false;
          break;
        }
      }
    }

    if (matches) {
      return true;
    }
  }

  return false;
}

/**
 * Count occurrences of an event
 */
export function countEvents(
  receipt: ContractTransactionReceipt,
  contract: Contract,
  eventName: string,
): number {
  return extractEventsByName(receipt, contract, eventName).length;
}

/**
 * Check if an event was emitted
 */
export function hasEvent(
  receipt: ContractTransactionReceipt,
  contract: Contract,
  eventName: string,
): boolean {
  return countEvents(receipt, contract, eventName) > 0;
}

// =============================================================================
// EVENT LOGGING
// =============================================================================

/**
 * Log all events from a receipt (for debugging)
 */
export function logEvents(
  receipt: ContractTransactionReceipt,
  contract: Contract,
): void {
  const events = extractEvents(receipt, contract);

  console.log(`\n📋 Events in transaction ${receipt.hash}:`);
  console.log('─'.repeat(60));

  if (events.length === 0) {
    console.log('   No events found');
  } else {
    for (const event of events) {
      console.log(`\n   📌 ${event.name}`);

      // Log named arguments
      const namedArgs = Object.entries(event.args)
        .filter(([key]) => isNaN(Number(key)))
        .map(([key, value]) => {
          if (typeof value === 'bigint') {
            return `      ${key}: ${value.toString()}`;
          }
          return `      ${key}: ${value}`;
        });

      for (const arg of namedArgs) {
        console.log(arg);
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
}

/**
 * Create a formatted event summary
 */
export function formatEventSummary(
  receipt: ContractTransactionReceipt,
  contract: Contract,
): string {
  const events = extractEvents(receipt, contract);

  if (events.length === 0) {
    return 'No events emitted';
  }

  const summary = events.map((e) => e.name).join(', ');
  return `Events: ${summary} (${events.length} total)`;
}
