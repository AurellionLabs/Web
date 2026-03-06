import { AssetIpfsRecord } from '@/domain/platform';
import { PinataSDK } from 'pinata';
import { getCache, type AssetMetadata } from '@/infrastructure/cache';

async function readCidContentSafely(key: string) {
  try {
    return await getCache().getCidContent(key);
  } catch (error) {
    console.warn('[ipfs] Failed reading CID cache', error);
    return null;
  }
}

async function writeCidContentSafely(
  key: string,
  content: Record<string, unknown>,
) {
  try {
    await getCache().setCidContent(key, content);
  } catch (error) {
    console.warn('[ipfs] Failed writing CID cache', error);
  }
}

async function readIpfsMetadataSafely(tokenId: string) {
  try {
    return await getCache().getIpfsMetadata(tokenId);
  } catch (error) {
    console.warn('[ipfs] Failed reading metadata cache', error);
    return null;
  }
}

async function writeIpfsMetadataSafely(
  tokenId: string,
  metadata: AssetMetadata,
) {
  try {
    await getCache().setIpfsMetadata(tokenId, metadata);
  } catch (error) {
    console.warn('[ipfs] Failed writing metadata cache', error);
  }
}

/**
 * Fetch assets from IPFS by hash
 * Uses Redis cache to avoid rate limiting on Pinata
 */
export const hashToAssets = async (
  hash: string,
  pinata: PinataSDK,
  groupId: string,
): Promise<AssetIpfsRecord[]> => {
  const cacheKey = `ipfs:hash:${hash}`;

  try {
    // Check cache first
    const cached = await readCidContentSafely(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached as AssetIpfsRecord[];
    }

    // Fetch from Pinata with group filter
    const list = await pinata.files.public
      .list()
      .group(groupId)
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
      await writeCidContentSafely(
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
  groupId: string,
): Promise<AssetIpfsRecord[]> => {
  try {
    // Check cache first (permanent cache for immutable metadata)
    const cached = await readIpfsMetadataSafely(tokenId);
    if (cached) {
      // Return as array for backward compatibility
      return [cached as unknown as AssetIpfsRecord];
    }

    // Fetch from Pinata with group filter
    const list = await pinata.files.public
      .list()
      .group(groupId)
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
      await writeIpfsMetadataSafely(tokenId, metadata);
    }

    return filtered;
  } catch (e) {
    console.error('tokenIdToAssets: error when trying to find asset', e);
    return [];
  }
};
