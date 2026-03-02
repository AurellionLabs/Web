/**
 * Shared Handler Utilities for Ponder Indexer
 *
 * Provides common functions used across all event handlers.
 */

// Context type was removed in Ponder 0.16 — no import needed

/**
 * Generate a unique event ID from transaction hash and log index
 */
export function eventId(txHash: string, logIndex: number): string {
  return `${txHash}-${logIndex}`;
}

/**
 * Safely subtract two BigInt values, preventing underflow
 * Returns 0 if the result would be negative
 */
export function safeSubtract(a: bigint, b: bigint): bigint {
  return a >= b ? a - b : 0n;
}

/**
 * Safely add two BigInt values
 */
export function safeAdd(a: bigint, b: bigint): bigint {
  return a + b;
}

/**
 * Normalize address to lowercase
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Generate balance ID from user address and token ID
 */
export function balanceId(
  userAddress: string,
  tokenId: string | bigint,
): string {
  return `${normalizeAddress(userAddress)}-${tokenId.toString()}`;
}

/**
 * Generate node balance ID from node hash and token ID
 */
export function nodeBalanceId(
  nodeHash: string,
  tokenId: string | bigint,
): string {
  return `${normalizeAddress(nodeHash)}-${tokenId.toString()}`;
}

/**
 * Generate node asset ID from node address, token address, and token ID
 */
export function nodeAssetId(
  nodeAddress: string,
  tokenAddress: string,
  tokenId: string | bigint,
): string {
  return `${normalizeAddress(nodeAddress)}-${normalizeAddress(tokenAddress)}-${tokenId.toString()}`;
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Convert BigInt to string for JSON serialization
 */
export function bigIntToString(value: bigint): string {
  return value.toString();
}

/**
 * Convert string to BigInt with validation
 */
export function stringToBigInt(value: string, fallback: bigint = 0n): bigint {
  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
}

/**
 * Format timestamp for logging
 */
export function formatTimestamp(timestamp: bigint | number): string {
  return new Date(Number(timestamp) * 1000).toISOString();
}

/**
 * Check if address is zero address
 */
export function isZeroAddress(address: string): boolean {
  return address.toLowerCase() === '0x0000000000000000000000000000000000000000';
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Upsert an entity - insert if not exists, update if exists
 * Uses onConflictDoUpdate for idempotent updates
 */
export async function upsertEntity<T extends { id: string }>(
  db: any,
  table: {
    insert: (values: T) => any;
    update: (where: { id: string }, set: Partial<T>) => any;
  },
  entity: T,
): Promise<void> {
  await db
    .insert(table as any)
    .values(entity as any)
    .onConflictDoUpdate({
      conflictColumns: ['id'],
      set: entity as any,
    });
}

/**
 * Get or create an entity
 */
export async function getOrCreate<T extends { id: string }>(
  db: any,
  table: { find: (where: { id: string }) => any; insert: (values: T) => any },
  entity: T,
): Promise<T> {
  const existing = await db.find(table as any, { id: entity.id });
  if (existing) {
    return existing as T;
  }
  await db.insert(table as any).values(entity as any);
  return entity;
}

/**
 * Format event args for logging
 */
export function formatEventArgs(
  args: Record<string, unknown>,
): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'bigint') {
      formatted[key] = value.toString();
    } else if (typeof value === 'object') {
      formatted[key] = JSON.stringify(value);
    } else {
      formatted[key] = String(value);
    }
  }
  return formatted;
}
