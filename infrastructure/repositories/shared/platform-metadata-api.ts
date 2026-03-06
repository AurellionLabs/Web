import { Asset } from '@/domain/shared';
import { AssetIpfsRecord } from '@/domain/platform';

interface AssetLookupResponse {
  asset: Asset | null;
  cid?: string | null;
}

interface ClassLookupResponse {
  assets: Asset[];
}

interface HashLookupResponse {
  records: AssetIpfsRecord[];
}

interface BatchAssetLookupResponse {
  assets: Asset[];
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function fetchAssetByTokenIdFromMetadataApi(
  tokenId: string,
): Promise<AssetLookupResponse> {
  try {
    const response = await fetch(
      `/api/platform/metadata?tokenId=${encodeURIComponent(tokenId)}`,
    );
    const body = await parseJsonResponse<AssetLookupResponse>(response);
    return body ?? { asset: null, cid: null };
  } catch (error) {
    console.error('[platform-metadata-api] token lookup failed', error);
    return { asset: null, cid: null };
  }
}

export async function fetchClassAssetsFromMetadataApi(
  assetClass: string,
): Promise<Asset[]> {
  try {
    const response = await fetch(
      `/api/platform/metadata?className=${encodeURIComponent(assetClass)}`,
    );
    const body = await parseJsonResponse<ClassLookupResponse>(response);
    return body?.assets ?? [];
  } catch (error) {
    console.error('[platform-metadata-api] class lookup failed', error);
    return [];
  }
}

export async function fetchAssetsByTokenIdsFromMetadataApi(
  tokenIds: string[],
): Promise<Asset[]> {
  if (tokenIds.length === 0) {
    return [];
  }

  try {
    const response = await fetch(
      `/api/platform/metadata?tokenIds=${encodeURIComponent(tokenIds.join(','))}`,
    );
    const body = await parseJsonResponse<BatchAssetLookupResponse>(response);
    return body?.assets ?? [];
  } catch (error) {
    console.error('[platform-metadata-api] batch token lookup failed', error);
    return [];
  }
}

export async function fetchAssetRecordsByHashFromMetadataApi(
  hash: string,
): Promise<AssetIpfsRecord[]> {
  try {
    const response = await fetch(
      `/api/platform/metadata?hash=${encodeURIComponent(hash)}`,
    );
    const body = await parseJsonResponse<HashLookupResponse>(response);
    return body?.records ?? [];
  } catch (error) {
    console.error('[platform-metadata-api] hash lookup failed', error);
    return [];
  }
}
