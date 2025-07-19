import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert wei to ether string
 */
export function formatWeiToEther(wei: string): string {
  if (!wei || wei === '0') return '0';
  try {
    const weiValue = parseFloat(wei);
    return (weiValue / 1e18).toString();
  } catch (error) {
    console.error('Error converting wei to ether:', error);
    return '0';
  }
}

/**
 * Format ether value as currency with K/M suffixes
 */
export function formatCurrency(ether: string | number): string {
  const value = typeof ether === 'string' ? parseFloat(ether) : ether;
  if (isNaN(value)) return '$0.00';

  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

/**
 * Convert wei to formatted currency
 */
export function formatWeiToCurrency(wei: string): string {
  const ether = formatWeiToEther(wei);
  return formatCurrency(ether);
}

export const formatAddress = (address: string): string => {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
};
