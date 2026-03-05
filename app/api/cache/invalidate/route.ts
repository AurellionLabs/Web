/**
 * Cache Invalidation API Endpoint
 *
 * Called by Ponder event handlers to invalidate cached data
 * when on-chain events change the state.
 *
 * POST /api/cache/invalidate
 * Body: { events: Array<{ type, chainId, id }> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { initCache, type InvalidationTarget } from '@/infrastructure/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body as { events: InvalidationTarget[] };

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid request: events must be an array' },
        { status: 400 },
      );
    }

    // Initialize cache connection
    const cache = await initCache().then(() =>
      require('@/infrastructure/cache').getCache(),
    );

    // Invalidate all specified keys
    await cache.invalidateBatch(events);

    return NextResponse.json({
      success: true,
      invalidated: events.length,
    });
  } catch (error) {
    console.error('[Cache Invalidate API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const cache = await initCache().then(() =>
      require('@/infrastructure/cache').getCache(),
    );
    const stats = await cache.getStats();

    return NextResponse.json({
      status: 'healthy',
      ...stats,
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: String(error) },
      { status: 500 },
    );
  }
}
