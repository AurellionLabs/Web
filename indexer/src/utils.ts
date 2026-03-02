// =============================================================================
// UTILITY FUNCTIONS FOR INDEXER
// =============================================================================

/**
 * Safe subtraction for bigint values - prevents underflow
 * Returns 0n if b > a instead of throwing or wrapping
 */
export function safeSub(a: bigint, b: bigint): bigint {
  return a >= b ? a - b : 0n;
}

/**
 * Safe subtraction for number values - prevents negative values
 */
export function safeSubNum(a: number, b: number): number {
  return a >= b ? a - b : 0;
}

/**
 * Safe JSON parse with fallback value
 * Returns fallback if parsing fails instead of throwing
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback: T,
): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safe BigInt conversion
 * Returns 0n if conversion fails
 */
export function safeBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string') {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

// =============================================================================
// LOGGING UTILITIES
// =============================================================================

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_COLORS = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m', // Green
  WARN: '\x1b[33m', // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m',
};

function formatLog(
  level: LogLevel,
  context: string,
  message: string,
  data?: unknown,
): string {
  const timestamp = new Date().toISOString();
  const color = LOG_COLORS[level];
  const reset = LOG_COLORS.RESET;
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
  return `${color}[${level}]${reset} ${timestamp} [${context}] ${message}${dataStr}`;
}

/**
 * Logger utility with context support
 * Usage: const log = logger('MyHandler'); log.info('message', { data });
 */
export function logger(context: string) {
  return {
    debug: (message: string, data?: unknown) => {
      if (process.env.LOG_LEVEL === 'DEBUG') {
        console.log(formatLog('DEBUG', context, message, data));
      }
    },
    info: (message: string, data?: unknown) => {
      console.log(formatLog('INFO', context, message, data));
    },
    warn: (message: string, data?: unknown) => {
      console.warn(formatLog('WARN', context, message, data));
    },
    error: (message: string, data?: unknown) => {
      console.error(formatLog('ERROR', context, message, data));
    },
  };
}

// =============================================================================
// ID GENERATION UTILITIES
// =============================================================================

/**
 * Generate event ID from transaction hash and log index
 */
export function eventId(txHash: `0x${string}`, logIndex: number): string {
  return `${txHash}-${logIndex}`;
}

/**
 * Generate balance ID from user address and token ID
 */
export function balanceId(user: `0x${string}`, tokenId: bigint): string {
  return `${user.toLowerCase()}-${tokenId.toString()}`;
}

/**
 * Generate stake ID from operation/opportunity ID and user address
 */
export function stakeId(
  operationId: `0x${string}`,
  user: `0x${string}`,
): string {
  return `${operationId}-${user.toLowerCase()}`;
}

/**
 * Generate liquidity position ID from pool ID and provider address
 */
export function positionId(
  poolId: `0x${string}`,
  provider: `0x${string}`,
): string {
  return `${poolId}-${provider.toLowerCase()}`;
}

/**
 * Generate node token balance ID
 */
export function nodeBalanceId(
  nodeHash: `0x${string}`,
  tokenId: bigint,
): string {
  return `${nodeHash}-${tokenId.toString()}`;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Check if address is zero address
 */
export function isZeroAddress(address: `0x${string}`): boolean {
  return address === '0x0000000000000000000000000000000000000000';
}

/**
 * Check if bytes32 is zero
 */
export function isZeroBytes32(value: `0x${string}`): boolean {
  return (
    value ===
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  );
}

// =============================================================================
// CONTRACT READ HELPERS
// =============================================================================

/**
 * Safely read from contract with error handling
 * Returns undefined if read fails
 */
export async function safeContractRead<T>(
  readFn: () => Promise<T>,
  context: string,
  identifier: string,
): Promise<T | undefined> {
  try {
    return await readFn();
  } catch (e) {
    const log = logger(context);
    log.warn(`Failed to read contract data for ${identifier}`, e);
    return undefined;
  }
}

// =============================================================================
// STATS UPDATE HELPERS
// =============================================================================

/**
 * Helper to safely increment a bigint stat field
 * Returns the new value after incrementing
 */
export function incrementStat(
  current: bigint | undefined | null,
  amount: bigint,
): bigint {
  return (current ?? 0n) + amount;
}

/**
 * Helper to safely decrement a bigint stat field with underflow protection
 * Returns the new value after decrementing (minimum 0n)
 */
export function decrementStat(
  current: bigint | undefined | null,
  amount: bigint,
): bigint {
  const currentValue = current ?? 0n;
  return currentValue >= amount ? currentValue - amount : 0n;
}

/**
 * Helper to safely increment a number stat field
 */
export function incrementStatNum(
  current: number | undefined | null,
  amount: number = 1,
): number {
  return (current ?? 0) + amount;
}

/**
 * Helper to safely decrement a number stat field with underflow protection
 */
export function decrementStatNum(
  current: number | undefined | null,
  amount: number = 1,
): number {
  const currentValue = current ?? 0;
  return currentValue >= amount ? currentValue - amount : 0;
}
