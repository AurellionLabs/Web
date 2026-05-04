import { NETWORK_CONFIGS } from '@/config/network';

export interface GetExplorerHrefParams {
  walletChainId?: number | null;
  publicChainId?: number | null;
  viewMode?: string | null;
}

export interface GetAddressExplorerHrefParams extends GetExplorerHrefParams {
  ownerAddress?: string | null;
}

export interface GetTransactionExplorerHrefParams
  extends GetExplorerHrefParams {
  transactionHash?: string | null;
}

export function getExplorerBaseUrl({
  walletChainId,
  publicChainId,
  viewMode,
}: GetExplorerHrefParams): string | null {
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

export function getAddressExplorerHref({
  ownerAddress,
  walletChainId,
  publicChainId,
  viewMode,
}: GetAddressExplorerHrefParams): string | null {
  if (!ownerAddress) {
    return null;
  }

  const baseUrl = getExplorerBaseUrl({
    walletChainId,
    publicChainId,
    viewMode,
  });

  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/address/${ownerAddress}`;
}

export function getTransactionExplorerHref({
  transactionHash,
  walletChainId,
  publicChainId,
  viewMode,
}: GetTransactionExplorerHrefParams): string | null {
  if (!transactionHash) {
    return null;
  }

  const baseUrl = getExplorerBaseUrl({
    walletChainId,
    publicChainId,
    viewMode,
  });

  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/tx/${transactionHash}`;
}
