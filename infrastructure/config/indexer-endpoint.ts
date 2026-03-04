/**
 * Reactive indexer endpoint resolver.
 *
 * Tracks the user's connected chainId and returns the correct
 * indexer URL. Updated by useWallet / provider layer when chain changes.
 */

import { getIndexerUrl } from '@/chain-constants';

let _currentChainId: number | null = null;

/** Called by the wallet/provider layer when chainId changes */
export function setCurrentChainId(chainId: number | null): void {
  _currentChainId = chainId;
}

/** Get the current connected chainId (null if not connected) */
export function getCurrentChainId(): number | null {
  return _currentChainId;
}

/**
 * Get the indexer GraphQL endpoint for the currently connected chain.
 * Optionally override with an explicit chainId.
 */
export function getCurrentIndexerUrl(chainId?: number | null): string {
  return getIndexerUrl(chainId ?? _currentChainId);
}
