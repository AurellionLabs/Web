import { Asset } from '@/domain/shared';
import { AssetIpfsRecord } from '@/domain/platform';
import {
  getIpfsGroupId,
  NEXT_PUBLIC_DEFAULT_CHAIN_ID,
} from '@/chain-constants';
import {
  getCache,
  initCache,
  type AssetMetadata,
} from '@/infrastructure/cache';
import { hashToAssets, tokenIdToAssets } from './ipfs';
import { PinataSDK } from 'pinata';

const PINATA_GATEWAY = 'orange-electronic-flyingfish-697.mypinata.cloud';
const CLASS_CACHE_PREFIX = 'platform:class:';
const HASH_CACHE_PREFIX = 'ipfs:hash:';

function normalizeTokenId(tokenId: string | number | bigint): string {
  try {
    return BigInt(tokenId).toString(10);
  } catch {
    return String(tokenId);
  }
}

function getTokenIdCandidates(tokenId: string | number | bigint): string[] {
  const raw = String(tokenId);
  const candidates = [raw];

  try {
    const asBigInt = BigInt(tokenId);
    const decimal = asBigInt.toString(10);
    const hex = `0x${asBigInt.toString(16)}`;

    if (!candidates.includes(decimal)) candidates.push(decimal);
    if (!candidates.includes(hex)) candidates.push(hex);
  } catch {
    // raw string is the only candidate
  }

  return candidates;
}

function mapAttributes(
  input:
    | Array<{ name?: string; values?: string[]; description?: string }>
    | { name?: string; values?: string[]; description?: string }
    | undefined,
): Asset['attributes'] {
  const values = Array.isArray(input)
    ? input
    : input && typeof input === 'object'
      ? [input]
      : [];

  return values
    .map((attribute) => ({
      name: attribute?.name ?? '',
      values: Array.isArray(attribute?.values) ? attribute.values : [],
      description: attribute?.description ?? '',
    }))
    .filter((attribute) => attribute.name.length > 0);
}

function mapJsonToAsset(
  json: Record<string, any>,
  fallbackClass?: string,
  fallbackTokenId?: string,
): Asset {
  const contractAsset = (json.asset ?? {}) as {
    id?: string | number | bigint;
    name?: string;
    attributes?:
      | Array<{ name?: string; values?: string[]; description?: string }>
      | { name?: string; values?: string[]; description?: string };
  };

  return {
    assetClass:
      (json.className as string) ||
      (json.class as string) ||
      fallbackClass ||
      'Unknown',
    tokenId: String(
      (json.tokenId as string | number | bigint | undefined) ??
        contractAsset.id ??
        fallbackTokenId ??
        0,
    ),
    name:
      (json.name as string | undefined) ||
      contractAsset.name ||
      'Unknown Asset',
    attributes: mapAttributes(contractAsset.attributes),
  };
}

function mapCachedMetadataToAsset(
  tokenId: string,
  metadata: AssetMetadata,
): Asset {
  return {
    assetClass: metadata.class || 'Unknown',
    tokenId,
    name: metadata.name || 'Unknown Asset',
    attributes: mapAttributes(
      Array.isArray(metadata.attributes) ? metadata.attributes : undefined,
    ),
  };
}

function createServerPinata(): PinataSDK | null {
  const pinataJwt =
    process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;

  if (!pinataJwt) {
    return null;
  }

  return new PinataSDK({
    pinataJwt,
    pinataGateway: PINATA_GATEWAY,
  });
}

async function getCacheSafely() {
  try {
    await initCache();
    return getCache();
  } catch (error) {
    console.warn(
      '[platform-metadata-server] Redis unavailable, continuing without cache',
      error,
    );
    return null;
  }
}

async function getCachedIpfsMetadata(tokenId: string) {
  const cache = await getCacheSafely();
  if (!cache) {
    return null;
  }

  try {
    return await cache.getIpfsMetadata(tokenId);
  } catch (error) {
    console.warn(
      '[platform-metadata-server] Failed reading token metadata cache',
      error,
    );
    return null;
  }
}

async function setCachedIpfsMetadata(tokenId: string, metadata: AssetMetadata) {
  const cache = await getCacheSafely();
  if (!cache) {
    return;
  }

  try {
    await cache.setIpfsMetadata(tokenId, metadata);
  } catch (error) {
    console.warn(
      '[platform-metadata-server] Failed writing token metadata cache',
      error,
    );
  }
}

async function getCachedCidContent(key: string) {
  const cache = await getCacheSafely();
  if (!cache) {
    return null;
  }

  try {
    return await cache.getCidContent(key);
  } catch (error) {
    console.warn(
      '[platform-metadata-server] Failed reading CID content cache',
      error,
    );
    return null;
  }
}

async function setCachedCidContent(
  key: string,
  content: Record<string, unknown>,
) {
  const cache = await getCacheSafely();
  if (!cache) {
    return;
  }

  try {
    await cache.setCidContent(key, content);
  } catch (error) {
    console.warn(
      '[platform-metadata-server] Failed writing CID content cache',
      error,
    );
  }
}

async function withPinataRetry<T>(
  operation: () => T | Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      const isRateLimited =
        message.includes('429') ||
        message.toLowerCase().includes('too many requests');

      if (!isRateLimited || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 300 * Math.pow(2, attempt - 1)),
      );
    }
  }

  throw lastError;
}

async function getGatewayPayload(
  pinata: PinataSDK,
  cid: string,
): Promise<Record<string, unknown>> {
  const response = await withPinataRetry(() => pinata.gateways.public.get(cid));
  const payload =
    response &&
    typeof response === 'object' &&
    'data' in response &&
    typeof response.data !== 'undefined'
      ? response.data
      : response;

  if (typeof payload === 'string') {
    return JSON.parse(payload) as Record<string, unknown>;
  }

  if (payload && typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }

  throw new Error(`Invalid Pinata gateway payload for CID ${cid}`);
}

export async function getAssetByTokenIdFromServerCache(
  tokenId: string | number | bigint,
): Promise<{ asset: Asset | null; cid: string | null }> {
  const normalizedTokenId = normalizeTokenId(tokenId);

  const cached = await getCachedIpfsMetadata(normalizedTokenId);

  if (cached) {
    return {
      asset: mapCachedMetadataToAsset(normalizedTokenId, cached),
      cid: typeof cached.cid === 'string' ? cached.cid : null,
    };
  }

  const pinata = createServerPinata();
  if (!pinata) {
    return { asset: null, cid: null };
  }

  const candidates = getTokenIdCandidates(tokenId);
  let list: Array<{ cid: string }> = [];

  for (const candidate of candidates) {
    list = await withPinataRetry(() =>
      pinata.files.public.list().keyvalues({ tokenId: candidate }).all(),
    );
    if (list.length > 0) break;
  }

  if (list.length === 0) {
    return { asset: null, cid: null };
  }

  const cid = list[0].cid;
  const json = await getGatewayPayload(pinata, cid);
  const asset = mapJsonToAsset(
    json as Record<string, any>,
    undefined,
    normalizedTokenId,
  );

  await setCachedIpfsMetadata(normalizedTokenId, {
    name: asset.name,
    class: asset.assetClass,
    cid,
    attributes: asset.attributes,
  });

  return { asset, cid };
}

export async function getClassAssetsFromServerCache(
  assetClass: string,
): Promise<Asset[]> {
  const normalizedClass = assetClass.trim();
  if (!normalizedClass) return [];

  const cacheKey = `${CLASS_CACHE_PREFIX}${normalizedClass.toLowerCase()}`;
  const cached = await getCachedCidContent(cacheKey);

  if (cached && Array.isArray(cached)) {
    return cached as Asset[];
  }

  const pinata = createServerPinata();
  if (!pinata) {
    return [];
  }

  const list = await withPinataRetry(() =>
    pinata.files.public.list().keyvalues({ className: normalizedClass }).all(),
  );

  if (!list.length) {
    return [];
  }

  const assets = (
    await Promise.all(
      list.map(async ({ cid }) => {
        try {
          const json = await getGatewayPayload(pinata, cid);
          return mapJsonToAsset(json as Record<string, any>, normalizedClass);
        } catch (error) {
          console.error(
            '[platform-metadata-server] class asset fetch failed',
            error,
          );
          return null;
        }
      }),
    )
  ).filter((asset): asset is Asset => asset !== null);

  if (assets.length > 0) {
    await setCachedCidContent(
      cacheKey,
      assets as unknown as Record<string, unknown>,
    );
  }

  return assets;
}

export async function getAssetsByTokenIdsFromServerCache(
  tokenIds: string[],
): Promise<Asset[]> {
  const results = await Promise.all(
    tokenIds.map(async (tokenId) => {
      const { asset } = await getAssetByTokenIdFromServerCache(tokenId);
      return asset;
    }),
  );

  return results.filter((asset): asset is Asset => asset !== null);
}

export async function getAssetRecordsByHashFromServerCache(
  hash: string,
): Promise<AssetIpfsRecord[]> {
  if (!hash) {
    return [];
  }

  const cacheKey = `${HASH_CACHE_PREFIX}${hash}`;
  const cached = await getCachedCidContent(cacheKey);
  if (cached && Array.isArray(cached)) {
    return cached as AssetIpfsRecord[];
  }

  const pinata = createServerPinata();
  if (!pinata) {
    return [];
  }

  const groupId = getIpfsGroupId(NEXT_PUBLIC_DEFAULT_CHAIN_ID);
  const byHash = await hashToAssets(hash, pinata, groupId);
  if (byHash.length > 0 || !/^(\d+)$/.test(hash)) {
    return byHash;
  }

  return tokenIdToAssets(hash, pinata, groupId);
}
