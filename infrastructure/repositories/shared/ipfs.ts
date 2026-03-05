import { AssetIpfsRecord } from '@/domain/platform';
import { PinataSDK } from 'pinata';
import { getCache, type AssetMetadata } from '@/infrastructure/cache';

/**
 * Fetch assets from IPFS by hash
 * Uses Redis cache to avoid rate limiting on Pinata
 */
export const hashToAssets = async (
  hash: string,
  pinata: PinataSDK,
): Promise<AssetIpfsRecord[]> => {
  const cache = getCache();
  const cacheKey = `ipfs:hash:${hash}`;

  try {
    // Check cache first
    const cached = await cache.getCidContent(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached as AssetIpfsRecord[];
    }

    // Fetch from Pinata
    const list = await pinata.files.public
      .list()
      .keyvalues({ hash: hash })
      .all();

    const items: any[] = Array.isArray(list)
      ? list
      : Object.values(list as any);

    const results = await Promise.all(
      items.map(async (item: any) => {
        const cid: string | undefined =
          item?.cid || item?.ipfs_pin_hash || item?.id || item?.cidv1;
        if (!cid) return null;
        const { data } = await pinata.gateways.public.get(`${cid}`);
        return data as unknown as AssetIpfsRecord;
      }),
    );

    const filtered = results.filter((v): v is AssetIpfsRecord => Boolean(v));

    // Cache the result permanently (immutable)
    if (filtered.length > 0) {
      await cache.setCidContent(
        cacheKey,
        filtered as unknown as Record<string, unknown>,
      );
    }

    return filtered;
  } catch (e) {
    console.error('hashToAssets: error when trying to find asset', e);
    return [];
  }
};

/**
 * Fetch assets from IPFS by tokenId
 * Uses Redis cache to avoid rate limiting on Pinata
 */
export const tokenIdToAssets = async (
  tokenId: string,
  pinata: PinataSDK,
): Promise<AssetIpfsRecord[]> => {
  const cache = getCache();

  try {
    // Check cache first (permanent cache for immutable metadata)
    const cached = await cache.getIpfsMetadata(tokenId);
    if (cached) {
      // Return as array for backward compatibility
      return [cached as unknown as AssetIpfsRecord];
    }

    // Fetch from Pinata
    const list = await pinata.files.public
      .list()
      .keyvalues({ tokenId: tokenId })
      .all();

    const items: any[] = Array.isArray(list)
      ? list
      : Object.values(list as any);

    const results = await Promise.all(
      items.map(async (item: any) => {
        const cid: string | undefined =
          item?.cid || item?.ipfs_pin_hash || item?.id || item?.cidv1;
        if (!cid) return null;
        const { data } = await pinata.gateways.public.get(`${cid}`);
        return data as unknown as AssetIpfsRecord;
      }),
    );

    const filtered = results.filter((v): v is AssetIpfsRecord => Boolean(v));

    // Cache the first result permanently (immutable)
    // Most tokenIds have one metadata entry
    if (filtered.length > 0) {
      const metadata = filtered[0] as unknown as AssetMetadata;
      await cache.setIpfsMetadata(tokenId, metadata);
    }

    return filtered;
  } catch (e) {
    console.error('tokenIdToAssets: error when trying to find asset', e);
    return [];
  }
};
