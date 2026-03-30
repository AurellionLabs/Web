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

function buildMetadataApiUrl(
  params: Record<string, string | number | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }

  return `/api/platform/metadata?${searchParams.toString()}`;
}

export async function fetchAssetByTokenIdFromMetadataApi(
  tokenId: string,
  chainId?: number,
): Promise<AssetLookupResponse> {
  try {
    const response = await fetch(buildMetadataApiUrl({ tokenId, chainId }));
    const body = await parseJsonResponse<AssetLookupResponse>(response);
    return body ?? { asset: null, cid: null };
  } catch (error) {
    console.error('[platform-metadata-api] token lookup failed', error);
    return { asset: null, cid: null };
  }
}

export async function fetchClassAssetsFromMetadataApi(
  assetClass: string,
  chainId?: number,
): Promise<Asset[]> {
  try {
    const response = await fetch(
      buildMetadataApiUrl({ className: assetClass, chainId }),
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
  chainId?: number,
): Promise<Asset[]> {
  if (tokenIds.length === 0) {
    return [];
  }

  try {
    const response = await fetch(
      buildMetadataApiUrl({ tokenIds: tokenIds.join(','), chainId }),
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
  chainId?: number,
): Promise<AssetIpfsRecord[]> {
  try {
    const response = await fetch(buildMetadataApiUrl({ hash, chainId }));
    const body = await parseJsonResponse<HashLookupResponse>(response);
    return body?.records ?? [];
  } catch (error) {
    console.error('[platform-metadata-api] hash lookup failed', error);
    return [];
  }
}
