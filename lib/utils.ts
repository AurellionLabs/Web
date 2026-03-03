import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatUnits, parseUnits, parseEther } from 'ethers';

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

/**
 * Format ERC20 token balance with dynamic decimals
 */
export function formatErc20Balance(balance: string | bigint, decimals: number): string {
  try {
    if (!balance || balance === '0' || balance === 0n) {
      return '0.00';
    }
    const balanceString = typeof balance === 'bigint' ? balance.toString() : String(balance);
    return formatUnits(balanceString, decimals);
  } catch (error) {
    console.error('Error formatting ERC20 balance:', error);
    return '0.00';
  }
}

/**
 * Parse ether string to wei (18 decimals)
 */
export function parseEth(etherString: string): bigint {
  try {
    return parseEther(etherString);
  } catch (error) {
    console.error('Error parsing ether:', error);
    return 0n;
  }
}

/**
 * Parse token amount string to wei with specified decimals
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  try {
    return parseUnits(amount, decimals);
  } catch (error) {
    console.error('Error parsing token amount:', error);
    return 0n;
  }
}
