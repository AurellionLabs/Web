import { NETWORK_CONFIGS } from '@/config/network';

interface GetNodeExplorerHrefParams {
  ownerAddress?: string | null;
  walletChainId?: number | null;
  publicChainId?: number | null;
  viewMode?: string | null;
}

export function getNodeExplorerHref({
  ownerAddress,
  walletChainId,
  publicChainId,
  viewMode,
}: GetNodeExplorerHrefParams): string | null {
  if (!ownerAddress) {
    return null;
  }

  const resolvedChainId =
    viewMode === 'public' &&
    publicChainId !== null &&
    publicChainId !== undefined
      ? publicChainId
      : walletChainId;

  if (!resolvedChainId || !NETWORK_CONFIGS[resolvedChainId]) {
    return null;
  }

  return `${NETWORK_CONFIGS[resolvedChainId].blockExplorer}/address/${ownerAddress}`;
}
