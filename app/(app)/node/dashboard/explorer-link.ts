import { NETWORK_CONFIGS } from '@/config/network';

interface GetNodeExplorerHrefParams {
  walletChainId?: number | null;
  publicChainId?: number | null;
  viewMode?: string | null;
}

interface GetNodeExplorerHrefAddressParams extends GetNodeExplorerHrefParams {
  ownerAddress?: string | null;
}

interface GetNodeTransactionHrefParams extends GetNodeExplorerHrefParams {
  transactionHash?: string | null;
}

function resolveExplorerBaseUrl({
  walletChainId,
  publicChainId,
  viewMode,
}: GetNodeExplorerHrefParams): string | null {
  const resolvedChainId =
    viewMode === 'public' &&
    publicChainId !== null &&
    publicChainId !== undefined
      ? publicChainId
      : walletChainId;

  if (!resolvedChainId || !NETWORK_CONFIGS[resolvedChainId]) {
    return null;
  }

  return NETWORK_CONFIGS[resolvedChainId].blockExplorer;
}

export function getNodeExplorerHref({
  ownerAddress,
  walletChainId,
  publicChainId,
  viewMode,
}: GetNodeExplorerHrefAddressParams): string | null {
  if (!ownerAddress) {
    return null;
  }

  const baseUrl = resolveExplorerBaseUrl({
    walletChainId,
    publicChainId,
    viewMode,
  });

  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/address/${ownerAddress}`;
}

export function getNodeTransactionHref({
  transactionHash,
  walletChainId,
  publicChainId,
  viewMode,
}: GetNodeTransactionHrefParams): string | null {
  if (!transactionHash) {
    return null;
  }

  const baseUrl = resolveExplorerBaseUrl({
    walletChainId,
    publicChainId,
    viewMode,
  });

  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/tx/${transactionHash}`;
}
