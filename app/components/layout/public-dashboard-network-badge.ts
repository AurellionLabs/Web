import {
  resolvePublicNodeChain,
  type SearchParamsLike,
} from '@/lib/public-node-chain';

type EnvironmentBadgeLabel = 'Mainnet' | 'Testnet';

export function isPublicNodeDashboardView(
  pathname: string,
  searchParams: SearchParamsLike,
): boolean {
  return (
    pathname === '/node/dashboard' && searchParams.get('view') === 'public'
  );
}

export function resolvePublicDashboardEnvironmentLabel({
  pathname,
  searchParams,
  walletChainId,
}: {
  pathname: string;
  searchParams: SearchParamsLike;
  walletChainId: number | null;
}): EnvironmentBadgeLabel | null {
  if (walletChainId !== null) {
    return null;
  }

  if (!isPublicNodeDashboardView(pathname, searchParams)) {
    return null;
  }

  const publicChain = resolvePublicNodeChain(searchParams);

  if (publicChain.chainId === 42161) {
    return 'Mainnet';
  }

  if (publicChain.chainId === 84532) {
    return 'Testnet';
  }

  return null;
}
