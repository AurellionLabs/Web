import { NEXT_PUBLIC_DEFAULT_CHAIN_ID } from '@/chain-constants';
import { NETWORK_CONFIGS } from '@/config/network';
import {
  resolvePublicNodeChain,
  type SearchParamsLike,
} from '@/lib/public-node-chain';

export function getAppChainEnvironmentLabel(
  chainId: number | null,
  fallbackName: string | null,
): string | null {
  if (chainId === 42161) {
    return 'Mainnet';
  }

  if (chainId === 84532) {
    return 'Testnet';
  }

  return fallbackName;
}

export function isPublicNodeChainRoute(
  pathname: string,
  searchParams: SearchParamsLike,
): boolean {
  return (
    pathname === '/node/explorer' ||
    (pathname === '/node/dashboard' && searchParams.get('view') === 'public')
  );
}

export function resolveExpectedAppChain({
  pathname,
  searchParams,
}: {
  pathname: string;
  searchParams: SearchParamsLike;
}): {
  expectedChainId: number | null;
  expectedChainName: string | null;
  error: string | null;
} {
  if (isPublicNodeChainRoute(pathname, searchParams)) {
    const publicChain = resolvePublicNodeChain(searchParams);
    return {
      expectedChainId: publicChain.chainId,
      expectedChainName:
        publicChain.chainId !== null
          ? (NETWORK_CONFIGS[publicChain.chainId]?.name ??
            String(publicChain.chainId))
          : null,
      error: publicChain.error,
    };
  }

  return {
    expectedChainId: NEXT_PUBLIC_DEFAULT_CHAIN_ID,
    expectedChainName:
      NETWORK_CONFIGS[NEXT_PUBLIC_DEFAULT_CHAIN_ID]?.name ??
      String(NEXT_PUBLIC_DEFAULT_CHAIN_ID),
    error: null,
  };
}

export function resolveChainMismatch({
  pathname,
  searchParams,
  walletChainId,
}: {
  pathname: string;
  searchParams: SearchParamsLike;
  walletChainId: number | null;
}): {
  expectedChainId: number | null;
  expectedChainName: string | null;
  walletChainName: string | null;
  mismatch: boolean;
  error: string | null;
} {
  const expectedChain = resolveExpectedAppChain({ pathname, searchParams });

  return {
    ...expectedChain,
    walletChainName:
      walletChainId !== null
        ? (NETWORK_CONFIGS[walletChainId]?.name ?? String(walletChainId))
        : null,
    mismatch:
      walletChainId !== null &&
      expectedChain.expectedChainId !== null &&
      walletChainId !== expectedChain.expectedChainId,
  };
}
