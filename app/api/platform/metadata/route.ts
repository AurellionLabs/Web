import { NextRequest, NextResponse } from 'next/server';
import {
  getAssetByTokenIdFromServerCache,
  getAssetsByTokenIdsFromServerCache,
  getAssetRecordsByHashFromServerCache,
  getClassAssetsFromServerCache,
} from '@/infrastructure/repositories/shared/platform-metadata-server';

export async function GET(request: NextRequest) {
  try {
    const tokenId = request.nextUrl.searchParams.get('tokenId');
    if (tokenId) {
      const result = await getAssetByTokenIdFromServerCache(tokenId);
      return NextResponse.json(result);
    }

    const tokenIds = request.nextUrl.searchParams.get('tokenIds');
    if (tokenIds) {
      const assets = await getAssetsByTokenIdsFromServerCache(
        tokenIds
          .split(',')
          .map((tokenId) => tokenId.trim())
          .filter(Boolean),
      );
      return NextResponse.json({ assets });
    }

    const className = request.nextUrl.searchParams.get('className');
    if (className) {
      const assets = await getClassAssetsFromServerCache(className);
      return NextResponse.json({ assets });
    }

    const hash = request.nextUrl.searchParams.get('hash');
    if (hash) {
      const records = await getAssetRecordsByHashFromServerCache(hash);
      return NextResponse.json({ records });
    }

    return NextResponse.json(
      { error: 'Expected one of tokenId, className, or hash' },
      { status: 400 },
    );
  } catch (error) {
    console.error('[Platform Metadata API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform metadata' },
      { status: 500 },
    );
  }
}
