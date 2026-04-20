import {
  getAddressExplorerHref,
  getTransactionExplorerHref,
  type GetExplorerHrefParams,
} from '@/lib/block-explorer';

interface GetNodeExplorerHrefAddressParams extends GetExplorerHrefParams {
  ownerAddress?: string | null;
}

interface GetNodeTransactionHrefParams extends GetExplorerHrefParams {
  transactionHash?: string | null;
}

export function getNodeExplorerHref({
  ownerAddress,
  walletChainId,
  publicChainId,
  viewMode,
}: GetNodeExplorerHrefAddressParams): string | null {
  return getAddressExplorerHref({
    ownerAddress,
    walletChainId,
    publicChainId,
    viewMode,
  });
}

export function getNodeTransactionHref({
  transactionHash,
  walletChainId,
  publicChainId,
  viewMode,
}: GetNodeTransactionHrefParams): string | null {
  return getTransactionExplorerHref({
    transactionHash,
    walletChainId,
    publicChainId,
    viewMode,
  });
}
