import { ethers } from 'ethers';
import fs from 'node:fs';

interface ResolveDiamondAddressOptions {
  explicitAddress?: string;
  manifestDiamondAddress?: string | null;
  chainConstantsDiamondAddress?: string | null;
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

export function loadDiamondAddressFromChainConstants(
  content: string,
): string | null {
  const match = content.match(
    /export const NEXT_PUBLIC_DIAMOND_ADDRESS\s*=\s*(?:['"]([^'"]+)['"]|[^;]*\|\|\s*['"]([^'"]+)['"])/,
  );

  return normalizeAddress(match?.[1] || match?.[2] || null);
}

export function readDiamondAddressFromChainConstants(
  filePath: string,
): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return loadDiamondAddressFromChainConstants(
    fs.readFileSync(filePath, 'utf-8'),
  );
}

export function resolveDiamondAddress(
  options: ResolveDiamondAddressOptions,
): string {
  const env = options.env || process.env;
  const resolved =
    normalizeAddress(options.explicitAddress) ||
    normalizeAddress(env.DIAMOND_ADDRESS) ||
    normalizeAddress(env.NEXT_PUBLIC_DIAMOND_ADDRESS) ||
    normalizeAddress(options.chainConstantsDiamondAddress) ||
    normalizeAddress(options.manifestDiamondAddress);

  if (!resolved) {
    throw new Error(
      'Diamond address not found. Pass --diamond or set DIAMOND_ADDRESS.',
    );
  }

  return resolved;
}
