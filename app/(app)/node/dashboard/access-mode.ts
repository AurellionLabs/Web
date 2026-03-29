export function isNodeDashboardReadOnly({
  viewMode,
  diamondIsReadOnly,
  walletAddress,
  ownerAddress,
}: {
  viewMode: string | null;
  diamondIsReadOnly: boolean;
  walletAddress?: string | null;
  ownerAddress?: string | null;
}) {
  if (viewMode === 'public' || diamondIsReadOnly) {
    return true;
  }

  if (!walletAddress || !ownerAddress) {
    return true;
  }

  return walletAddress.toLowerCase() !== ownerAddress.toLowerCase();
}
