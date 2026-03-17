import { ethers } from 'ethers';

export const ARBITRUM_ONE_CHAIN_ID = 42161;
export const ARBITRUM_ONE_USDC = ethers.getAddress(
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
);

const PRODUCTION_PAY_TOKENS: Readonly<Record<number, string>> = Object.freeze({
  [ARBITRUM_ONE_CHAIN_ID]: ARBITRUM_ONE_USDC,
});

export interface ResolveExpectedPayTokenOptions {
  chainId: number;
  fallbackTokenAddress?: string | null;
  explicitTokenAddress?: string | null;
}

function normalizeAddress(
  value: string | null | undefined,
  label: string,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed === ethers.ZeroAddress) {
    return null;
  }

  try {
    return ethers.getAddress(trimmed);
  } catch {
    throw new Error(`${label} is not a valid address: ${trimmed}`);
  }
}

export function getProductionPayToken(chainId: number): string | null {
  return PRODUCTION_PAY_TOKENS[chainId] || null;
}

export function isProductionPayTokenChain(chainId: number): boolean {
  return getProductionPayToken(chainId) !== null;
}

export function resolveExpectedPayToken(
  options: ResolveExpectedPayTokenOptions,
): string {
  const explicitTokenAddress = normalizeAddress(
    options.explicitTokenAddress,
    'Explicit pay token',
  );
  if (explicitTokenAddress) {
    return explicitTokenAddress;
  }

  const productionPayToken = getProductionPayToken(options.chainId);
  if (productionPayToken) {
    return productionPayToken;
  }

  const fallbackTokenAddress = normalizeAddress(
    options.fallbackTokenAddress,
    'Fallback pay token',
  );
  if (fallbackTokenAddress) {
    return fallbackTokenAddress;
  }

  throw new Error(
    `No pay token configured for chain ${options.chainId}. Provide --token or configure a fallback token address.`,
  );
}

export async function assertAddressHasContractCode(
  provider: ethers.Provider,
  address: string,
  label: string,
): Promise<void> {
  const code = await provider.getCode(address);

  if (!code || code === '0x') {
    throw new Error(
      `${label} ${address} has no contract code on the current network.`,
    );
  }
}
