import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatUnits } from 'ethers';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert wei (18 decimals) to ether format
 */
export function formatWeiToEther(wei: string | bigint): string {
  try {
    if (!wei || wei === '0' || wei === 0n) {
      return '0.00';
    }
    const weiString = typeof wei === 'bigint' ? wei.toString() : String(wei);
    return formatUnits(weiString, 18);
  } catch (error) {
    console.error('Error formatting wei to ether:', error);
    return '0.00';
  }
}

/**
 * Convert wei (18 decimals) to formatted currency string
 */
export function formatWeiToCurrency(wei: string | bigint): string {
  try {
    const etherValue = formatWeiToEther(wei);
    const value = parseFloat(etherValue);

    if (isNaN(value)) return '$0.00';

    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (error) {
    console.error('Error formatting wei to currency:', error);
    return '$0.00';
  }
}
