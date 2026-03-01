/**
 * Pure functions for P2P offer filtering.
 * Extracted for testability — no React dependencies.
 */
import type { Asset } from '@/domain/shared';
import { P2POfferStatus } from './p2p';
import type { P2POffer } from './p2p';

/**
 * Build a lookup map from tokenId -> assetClass using supported assets.
 * Handles both hex and decimal tokenId formats via BigInt normalization.
 */
export function buildTokenIdToClassMap(
  supportedAssets: Asset[],
): Map<string, string> {
  const map = new Map<string, string>();
  supportedAssets.forEach((a) => {
    if (a.tokenId && a.assetClass) {
      map.set(a.tokenId, a.assetClass);
      try {
        const normalized = BigInt(a.tokenId).toString(10);
        if (normalized !== a.tokenId) {
          map.set(normalized, a.assetClass);
        }
      } catch {
        /* ignore */
      }
    }
  });
  return map;
}

/**
 * Check if a tokenId belongs to a given asset class.
 * Checks tokenIdToClass first, then falls back to assetMetadataMap.
 */
export function isTokenInClass(
  tokenId: string,
  className: string,
  tokenIdToClass: Map<string, string>,
  assetMetadataMap: Map<string, Asset>,
): boolean {
  const directClass = tokenIdToClass.get(tokenId);
  if (directClass) {
    return directClass.toLowerCase() === className.toLowerCase();
  }
  try {
    const normalized = BigInt(tokenId).toString(10);
    const normalizedClass = tokenIdToClass.get(normalized);
    if (normalizedClass) {
      return normalizedClass.toLowerCase() === className.toLowerCase();
    }
  } catch {
    /* ignore */
  }
  const meta = assetMetadataMap.get(tokenId);
  if (meta?.assetClass) {
    return meta.assetClass.toLowerCase() === className.toLowerCase();
  }
  return false;
}

/**
 * Filter P2P offers for a specific market class.
 */
export function filterOffersForMarket(
  offers: P2POffer[],
  className: string,
  tokenIdToClass: Map<string, string>,
  assetMetadataMap: Map<string, Asset>,
  filterType: 'all' | 'buy' | 'sell' = 'all',
  nowSec?: number,
): P2POffer[] {
  const now = nowSec ?? Math.floor(Date.now() / 1000);
  return offers.filter((offer) => {
    const isLocallyExpired = offer.expiresAt > 0 && offer.expiresAt <= now;
    if (
      offer.status === P2POfferStatus.EXPIRED ||
      offer.status === P2POfferStatus.SETTLED ||
      offer.status === P2POfferStatus.CANCELLED ||
      isLocallyExpired
    ) {
      return false;
    }

    if (
      !isTokenInClass(
        offer.tokenId,
        className,
        tokenIdToClass,
        assetMetadataMap,
      )
    ) {
      return false;
    }

    if (filterType === 'buy') return !offer.isSellerInitiated;
    if (filterType === 'sell') return offer.isSellerInitiated;
    return true;
  });
}
