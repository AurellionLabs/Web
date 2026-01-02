import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/infrastructure/repositories/shared/ponder-db';
import type { IndexerWaitMetadata, WaitOptions } from '@/infrastructure/shared/tx-with-indexer-wait';

/**
 * API route for waiting for indexed entities (client-side support)
 * This allows client components to wait for indexer results without importing pg
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      transactionHash,
      metadata,
      txArgs = [],
      options = {},
    }: {
      transactionHash: string;
      metadata: IndexerWaitMetadata;
      txArgs?: unknown[];
      options?: WaitOptions;
    } = body;

    const {
      timeoutMs = 60000,
      pollIntervalMs = 1000,
      timeoutMessage = `Timeout waiting for entity (tx: ${transactionHash})`,
    } = options;

    const startTime = Date.now();
    const normalizedTxHash = transactionHash.toLowerCase();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // First, try event table
        const event = await queryOne<Record<string, any>>(
          `SELECT ${metadata.eventIdColumn} 
           FROM ${metadata.eventTable} 
           WHERE transaction_hash = $1 
           LIMIT 1`,
          [normalizedTxHash],
        );

        if (event && event[metadata.eventIdColumn]) {
          if (metadata.waitForConfirmation) {
            return NextResponse.json({ result: null });
          }
          const result = metadata.extractResult
            ? metadata.extractResult(event)
            : event[metadata.eventIdColumn];
          return NextResponse.json({ result });
        }

        // Fallback: try entity table if provided
        if (metadata.entityTable) {
          let query: string;
          let params: unknown[];

          if (metadata.fallbackQuery) {
            const fallbackParams = metadata.fallbackParams
              ? metadata.fallbackParams(txArgs)
              : [];
            query = metadata.fallbackQuery(normalizedTxHash, ...fallbackParams);
            params = [normalizedTxHash, ...fallbackParams];
          } else {
            const idColumn = metadata.entityIdColumn || 'id';
            query = `SELECT ${idColumn} 
                     FROM ${metadata.entityTable} 
                     WHERE transaction_hash = $1 
                     ORDER BY created_at DESC 
                     LIMIT 1`;
            params = [normalizedTxHash];
          }

          const entity = await queryOne<Record<string, any>>(query, params);

          if (entity) {
            if (metadata.waitForConfirmation) {
              return NextResponse.json({ result: null });
            }
            const idColumn = metadata.entityIdColumn || 'id';
            const result = entity[idColumn] || entity[metadata.eventIdColumn];
            if (result) {
              const extracted = metadata.extractResult
                ? metadata.extractResult(entity)
                : result;
              return NextResponse.json({ result: extracted });
            }
          }
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      } catch (error) {
        console.warn(
          `[waitForIndexedEntity API] Error polling indexer:`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    }

    return NextResponse.json(
      { error: timeoutMessage },
      { status: 408 }, // Request Timeout
    );
  } catch (error) {
    console.error('[waitForIndexedEntity API] Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to wait for indexed entity',
      },
      { status: 500 },
    );
  }
}

