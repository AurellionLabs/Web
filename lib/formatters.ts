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
      let num: number;
      if (typeof value === 'bigint') {
        num = Number(value);
      } else {
        const strValue = String(value);
        // Handle scientific notation
        if (strValue.includes('e') || strValue.includes('E')) {
          num = parseFloat(strValue);
        } else {
          num = parseFloat(strValue);
        }
      }

      // Handle very small or invalid numbers
      if (isNaN(num) || !isFinite(num)) {
        return '0.00';
      }

      // If number is extremely small (< 0.01), just show 0.00
      if (Math.abs(num) < 0.01 && num !== 0) {
        return '0.00';
      }

      return num.toFixed(displayDecimals);
    }

    // Use ethers for proper BigInt handling to convert wei/token units to human-readable
    let valueString =
      typeof value === 'bigint' ? value.toString() : String(value);

    // Handle scientific notation - convert to fixed notation first
    if (valueString.includes('e') || valueString.includes('E')) {
      const num = parseFloat(valueString);
      if (isNaN(num) || !isFinite(num) || num <= 0) {
        return '0.00';
      }
      // For very small numbers, just return 0
      if (num < 1) {
        return '0.00';
      }
      // Convert to integer string (no decimals) for formatUnits
      valueString = Math.floor(num).toString();
    }

    const formatted = formatUnits(valueString, decimals);

    // Parse to number and format with desired decimals
    const num = parseFloat(formatted);

    // Handle very small numbers
    if (isNaN(num) || !isFinite(num)) {
      return '0.00';
    }

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

    let valueString = typeof value === 'number' ? value.toString() : value;

    // Handle scientific notation (e.g., "1.515e-16") - parseUnits can't handle this
    if (valueString.includes('e') || valueString.includes('E')) {
      const num = parseFloat(valueString);
      if (isNaN(num) || num <= 0 || !isFinite(num)) return 0n;
      // Convert to fixed notation with enough precision
      valueString = num.toFixed(Math.max(decimals, 18));
    }

    // Raw values (decimals = 0) don't need conversion
    if (decimals === 0) {
      const num = parseFloat(valueString);
      if (isNaN(num)) return 0n;
      return BigInt(Math.floor(num));
    }

    // Trim trailing zeros and ensure valid format for parseUnits
    // parseUnits doesn't like too many decimal places
    const parts = valueString.split('.');
    if (parts.length === 2 && parts[1].length > decimals) {
      valueString = parts[0] + '.' + parts[1].slice(0, decimals);
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

/**
 * Format Ethereum address to shortened format
 * @param address - Full Ethereum address
 * @returns Shortened address like "0x1234...5678"
 */
export const formatAddress = (address: string): string => {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
};
