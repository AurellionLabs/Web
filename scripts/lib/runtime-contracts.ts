import { ethers } from 'ethers';

interface ResolveDiamondAddressOptions {
  explicitAddress?: string;
  manifestDiamondAddress?: string | null;
  env?: Record<string, string | undefined>;
}

function normalizeAddress(value?: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized === ethers.ZeroAddress) {
    return null;
  }

  return normalized;
}

export function resolveDiamondAddress(
  options: ResolveDiamondAddressOptions,
): string {
  const env = options.env || process.env;
  const resolved =
    normalizeAddress(options.explicitAddress) ||
    normalizeAddress(env.DIAMOND_ADDRESS) ||
    normalizeAddress(env.NEXT_PUBLIC_DIAMOND_ADDRESS) ||
    normalizeAddress(options.manifestDiamondAddress);

  if (!resolved) {
    throw new Error(
      'Diamond address not found. Pass --diamond or set DIAMOND_ADDRESS.',
    );
  }

  return resolved;
}
