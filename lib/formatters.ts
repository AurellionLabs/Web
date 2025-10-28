import { formatUnits, parseUnits } from 'ethers';

/**
 * Convert contract units to human-readable display value
 *
 * @param value - Value from contract (wei/token units)
 * @param decimals - Token decimals (0 for raw, 6 for USDT/USDC, 18 for AURA)
 * @param displayDecimals - How many decimals to show (default: 2)
 * @returns Formatted string like "2.00"
 *
 * @example
 * formatTokenAmount("2000000", 6)           // "2.00" (USDT)
 * formatTokenAmount("2000000000000000000", 18)  // "2.00" (AURA)
 * formatTokenAmount("2500000", 6, 1)        // "2.5" (USDT, 1 decimal)
 */
export function formatTokenAmount(
  value: string | bigint | number,
  decimals: number,
  displayDecimals: number = 2,
): string {
  if (!value || value === '0' || value === 0n) {
    return '0.00';
  }

  try {
    // Raw values (decimals = 0) don't need conversion
    if (decimals === 0) {
      const num =
        typeof value === 'bigint' ? Number(value) : parseFloat(String(value));
      return num.toFixed(displayDecimals);
    }

    // Use ethers for proper BigInt handling to convert wei/token units to human-readable
    const valueString =
      typeof value === 'bigint' ? value.toString() : String(value);
    const formatted = formatUnits(valueString, decimals);

    // Parse to number and format with desired decimals
    const num = parseFloat(formatted);
    return num.toFixed(displayDecimals);
  } catch (error) {
    console.error('Error formatting token amount:', error, {
      value,
      decimals,
      displayDecimals,
    });
    return '0.00';
  }
}

/**
 * Convert human input to contract units
 *
 * @param value - Human-readable value like "2.00"
 * @param decimals - Token decimals (0 for raw, 6 for USDT/USDC, 18 for AURA)
 * @returns BigInt for contract
 *
 * @example
 * parseTokenAmount("2.00", 6)  // 2000000n (USDT)
 * parseTokenAmount("2.00", 18)  // 2000000000000000000n (AURA)
 * parseTokenAmount("2.50", 6)  // 2500000n (USDT)
 */
export function parseTokenAmount(
  value: string | number,
  decimals: number,
): bigint {
  try {
    if (!value) return 0n;

    const valueString = typeof value === 'number' ? value.toString() : value;

    // Raw values (decimals = 0) don't need conversion
    if (decimals === 0) {
      const num = parseFloat(valueString);
      if (isNaN(num)) return 0n;
      return BigInt(Math.floor(num));
    }

    // Use ethers for proper BigInt handling with decimals
    return parseUnits(valueString, decimals);
  } catch (error) {
    console.error('Error parsing token amount:', error, {
      value,
      decimals,
    });
    return 0n;
  }
}
