/**
 * Event-Driven Transaction Wrapper
 * 
 * Generalized wrapper for sending contract transactions and waiting for indexed results
 * via the Ponder indexer. This eliminates RPC rate limiting issues and standardizes
 * transaction handling across the codebase.
 * 
 * Usage:
 *   const { result: nodeAddress } = await sendContractTxAndWaitForIndexer(
 *     contract,
 *     'registerNode',
 *     [nodeData],
 *     'AurumNodeManager.registerNode'
 *   );
 */

import { Contract } from 'ethers';
import { sendContractTxWithReadEstimation, SendTxOptions } from './tx-helper';

// Note: Database imports are done dynamically in waitForIndexedEntity
// to avoid bundling pg (PostgreSQL client) in client-side code

/**
 * Metadata defining how to wait for an indexed entity after a transaction
 */
export interface IndexerWaitMetadata {
  /** Event table name (e.g., 'node_registered_events') */
  eventTable: string;
  /** ID column in event table (e.g., 'node_address', 'order_id') */
  eventIdColumn: string;
  /** Optional entity table for fallback (e.g., 'nodes', 'orders') */
  entityTable?: string;
  /** ID column in entity table (default: 'id') */
  entityIdColumn?: string;
  /** Function to extract fallback query parameters from transaction args */
  fallbackParams?: (txArgs: unknown[]) => unknown[];
  /** Optional custom SQL for fallback query */
  fallbackQuery?: (txHash: string, ...params: unknown[]) => string;
  /** Extract result from row (default: uses eventIdColumn or entityIdColumn) */
  extractResult?: (row: any) => any;
  /** If true, just wait for confirmation (entity exists), don't extract value */
  waitForConfirmation?: boolean;
}

export interface WaitOptions {
  /** Maximum time to wait in milliseconds (default: 60000 = 1 minute) */
  timeoutMs?: number;
  /** Polling interval in milliseconds (default: 1000 = 1 second) */
  pollIntervalMs?: number;
  /** Custom error message if timeout occurs */
  timeoutMessage?: string;
}

/**
 * Generic function to wait for any indexed entity by transaction hash
 * Works on both server-side (direct DB) and client-side (via API route)
 */
async function waitForIndexedEntity<T = string>(
  transactionHash: string,
  metadata: IndexerWaitMetadata,
  txArgs: unknown[] = [],
  options: WaitOptions = {},
): Promise<T | null> {
  const isBrowser = typeof window !== 'undefined';

  // Client-side: use API route
  if (isBrowser) {
    return waitForIndexedEntityViaAPI<T>(
      transactionHash,
      metadata,
      txArgs,
      options,
    );
  }

  // Server-side: use direct database access
  const {
    timeoutMs = 60000,
    pollIntervalMs = 1000,
    timeoutMessage = `Timeout waiting for entity (tx: ${transactionHash})`,
  } = options;

  const startTime = Date.now();
  const normalizedTxHash = transactionHash.toLowerCase();

  // Dynamically import on server-side to avoid bundling pg in client
  const { queryOne: serverQueryOne } = await import(
    '@/infrastructure/repositories/shared/ponder-db'
  );

  while (Date.now() - startTime < timeoutMs) {
    try {
      // First, try event table
      const event = await serverQueryOne<Record<string, any>>(
        `SELECT ${metadata.eventIdColumn} 
         FROM ${metadata.eventTable} 
         WHERE transaction_hash = $1 
         LIMIT 1`,
        [normalizedTxHash],
      );

      if (event && event[metadata.eventIdColumn]) {
        if (metadata.waitForConfirmation) {
          return null as T; // Just confirm existence
        }
        return metadata.extractResult
          ? metadata.extractResult(event)
          : (event[metadata.eventIdColumn] as T);
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

        const entity = await serverQueryOne<Record<string, any>>(query, params);

        if (entity) {
          if (metadata.waitForConfirmation) {
            return null as T; // Just confirm existence
          }
          const idColumn = metadata.entityIdColumn || 'id';
          const result = entity[idColumn] || entity[metadata.eventIdColumn];
          if (result) {
            return metadata.extractResult
              ? metadata.extractResult(entity)
              : (result as T);
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      console.warn(
        `[waitForIndexedEntity] Error polling indexer:`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error(timeoutMessage);
}

/**
 * Client-side version that uses API route
 */
async function waitForIndexedEntityViaAPI<T = string>(
  transactionHash: string,
  metadata: IndexerWaitMetadata,
  txArgs: unknown[] = [],
  options: WaitOptions = {},
): Promise<T | null> {
  const {
    timeoutMs = 60000,
    pollIntervalMs = 1000,
    timeoutMessage = `Timeout waiting for entity (tx: ${transactionHash})`,
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch('/api/wait-for-indexer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionHash,
          metadata,
          txArgs,
          options: {
            timeoutMs: pollIntervalMs + 1000, // Short timeout for each API call
            pollIntervalMs: 100, // Fast polling for API calls
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result !== undefined) {
          return data.result as T;
        }
      } else if (response.status === 408) {
        // Timeout from API - continue polling
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      } else {
        // Error from API
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to wait for indexed entity');
      }
    } catch (error) {
      // Network errors - continue polling
      if (
        error instanceof TypeError ||
        (error instanceof Error && error.message.includes('fetch'))
      ) {
        console.warn(
          `[waitForIndexedEntity API] Network error, retrying:`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(timeoutMessage);
}

/**
 * Registry of transaction metadata for automatic indexer waiting
 * Add entries here as you add new transactions
 */
export const TRANSACTION_METADATA: Record<
  string,
  IndexerWaitMetadata
> = {
  // ============================================================================
  // AURUM NODE MANAGER OPERATIONS
  // ============================================================================
  
  'AurumNodeManager.registerNode': {
    eventTable: 'node_registered_events',
    eventIdColumn: 'node_address',
    entityTable: 'nodes',
    entityIdColumn: 'id',
    fallbackParams: (args) => {
      const nodeData = args[0] as any;
      return [nodeData?.owner?.toLowerCase() || ''];
    },
    fallbackQuery: (txHash, owner) => {
      return `SELECT id FROM nodes 
              WHERE owner = $2 
                AND transaction_hash = $1 
              ORDER BY created_at DESC 
              LIMIT 1`;
    },
  },

  'AurumNodeManager.updateStatus': {
    eventTable: 'node_status_updated_events',
    eventIdColumn: 'node_address',
    waitForConfirmation: true,
  },

  'AurumNodeManager.updateLocation': {
    eventTable: 'node_location_updated_events',
    eventIdColumn: 'node_address',
    waitForConfirmation: true,
  },

  'AurumNodeManager.addSupportedAsset': {
    eventTable: 'supported_asset_added_events',
    eventIdColumn: 'node_address',
    waitForConfirmation: true,
  },

  'AurumNodeManager.updateSupportedAssets': {
    eventTable: 'node_assets',
    eventIdColumn: 'node',
    waitForConfirmation: true,
    fallbackParams: (args) => {
      return [args[0]?.toString().toLowerCase() || ''];
    },
    fallbackQuery: (txHash, nodeAddress) => {
      return `SELECT node FROM node_assets 
              WHERE node = $2 
                AND transaction_hash = $1 
              LIMIT 1`;
    },
  },

  'AurumNodeManager.updateOwner': {
    eventTable: 'node_ownership_transferred_events',
    eventIdColumn: 'node_address',
    waitForConfirmation: true,
  },

  // ============================================================================
  // AUSYS OPERATIONS
  // ============================================================================

  'Ausys.orderCreation': {
    eventTable: 'order_created_events',
    eventIdColumn: 'order_id',
    entityTable: 'orders',
    entityIdColumn: 'id',
    fallbackParams: (args) => {
      const orderData = args[0] as any;
      return [orderData?.buyer?.toLowerCase() || ''];
    },
    fallbackQuery: (txHash, buyer) => {
      return `SELECT id FROM orders 
              WHERE buyer = $2 
                AND transaction_hash = $1 
              ORDER BY created_at DESC 
              LIMIT 1`;
    },
  },

  'Ausys.journeyCreation': {
    eventTable: 'journey_created_events',
    eventIdColumn: 'journey_id',
    entityTable: 'journeys',
    entityIdColumn: 'id',
    fallbackParams: (args) => {
      // First arg is sender address
      return [args[0]?.toString().toLowerCase() || ''];
    },
    fallbackQuery: (txHash, sender) => {
      return `SELECT id FROM journeys 
              WHERE sender = $2 
                AND transaction_hash = $1 
              ORDER BY created_at DESC 
              LIMIT 1`;
    },
  },

  'Ausys.orderJourneyCreation': {
    eventTable: 'journey_created_events',
    eventIdColumn: 'journey_id',
    entityTable: 'journeys',
    entityIdColumn: 'id',
    fallbackParams: (args) => {
      // Second arg is senderNodeAddress
      return [args[1]?.toString().toLowerCase() || ''];
    },
    fallbackQuery: (txHash, sender) => {
      return `SELECT id FROM journeys 
              WHERE sender = $2 
                AND transaction_hash = $1 
              ORDER BY created_at DESC 
              LIMIT 1`;
    },
  },

  'Ausys.packageSign': {
    eventTable: 'package_signatures',
    eventIdColumn: 'journey_id',
    waitForConfirmation: true,
  },

  'Ausys.handOff': {
    eventTable: 'journey_status_updates',
    eventIdColumn: 'journey_id',
    waitForConfirmation: true,
  },

  'Ausys.orderSettlement': {
    eventTable: 'order_settled_events',
    eventIdColumn: 'order_id',
    waitForConfirmation: true,
  },

  'Ausys.driverAssignment': {
    eventTable: 'driver_assignments',
    eventIdColumn: 'journey_id',
    waitForConfirmation: true,
  },

  'Ausys.assignDriverToJourneyId': {
    eventTable: 'driver_assignments',
    eventIdColumn: 'journey_id',
    waitForConfirmation: true,
  },

  'Ausys.handOn': {
    eventTable: 'package_signatures',
    eventIdColumn: 'journey_id',
    waitForConfirmation: true,
  },

  // ============================================================================
  // AUSTAKE OPERATIONS
  // ============================================================================

  'AuStake.createPool': {
    eventTable: 'operation_created_events',
    eventIdColumn: 'op_created_operation_id',
    entityTable: 'operations',
    entityIdColumn: 'id',
    fallbackParams: (args) => {
      // First arg might be pool creator address
      return [args[0]?.toString().toLowerCase() || ''];
    },
  },

  'AuStake.stake': {
    eventTable: 'staked_events',
    eventIdColumn: 'user',
    waitForConfirmation: true,
  },

  'AuStake.unstake': {
    eventTable: 'unstaked_events',
    eventIdColumn: 'user',
    waitForConfirmation: true,
  },

  'AuStake.unlockReward': {
    eventTable: 'reward_paid_events',
    eventIdColumn: 'user',
    waitForConfirmation: true,
  },

  'AuStake.claimReward': {
    eventTable: 'reward_paid_events',
    eventIdColumn: 'user',
    waitForConfirmation: true,
  },

  // ============================================================================
  // AURA ASSET OPERATIONS
  // ============================================================================

  'AuraAsset.addItem': {
    eventTable: 'minted_asset_events',
    eventIdColumn: 'token_id',
    waitForConfirmation: true,
  },
};

/**
 * Send a contract transaction and automatically wait for the indexed result
 * 
 * @param contract The contract instance
 * @param method The method name
 * @param args Method arguments
 * @param metadataOrKey Either IndexerWaitMetadata or a key from TRANSACTION_METADATA
 * @param txOptions Transaction options
 * @param waitOptions Wait options
 * @returns Transaction and extracted result (or just tx for confirmation-only)
 */
export async function sendContractTxAndWaitForIndexer<T = string>(
  contract: Contract,
  method: string,
  args: unknown[],
  metadataOrKey: IndexerWaitMetadata | string,
  txOptions: SendTxOptions = {},
  waitOptions: WaitOptions = {},
): Promise<{ tx: any; result?: T }> {
  // Get metadata
  let metadata: IndexerWaitMetadata | undefined;

  if (typeof metadataOrKey === 'string') {
    // Try multiple key formats
    const contractAddress = await contract.getAddress();
    const possibleKeys = [
      metadataOrKey,
      `${contractAddress}.${method}`,
      method,
    ];
    
    for (const key of possibleKeys) {
      if (TRANSACTION_METADATA[key]) {
        metadata = TRANSACTION_METADATA[key];
        break;
      }
    }
  } else {
    metadata = metadataOrKey;
  }

  if (!metadata) {
    throw new Error(
      `No indexer metadata found for ${method}. Add to TRANSACTION_METADATA or provide metadata directly.`,
    );
  }

  // Send transaction (always skip wait since we use indexer)
  const { tx } = await sendContractTxWithReadEstimation(
    contract,
    method,
    args,
    txOptions,
  );

  const transactionHash = tx.hash;
  console.log(
    `[sendContractTxAndWaitForIndexer] Transaction sent: ${transactionHash}, waiting for indexer...`,
  );

  // Wait for indexer
  const result = await waitForIndexedEntity<T>(
    transactionHash,
    metadata,
    args,
    waitOptions,
  );

  if (metadata.waitForConfirmation) {
    // Just confirm existence, don't return result
    console.log(
      `[sendContractTxAndWaitForIndexer] Transaction confirmed via indexer: ${transactionHash}`,
    );
    return { tx };
  }

  if (result === null || result === undefined) {
    throw new Error(
      `Failed to extract result from indexer for transaction ${transactionHash}`,
    );
  }

  console.log(
    `[sendContractTxAndWaitForIndexer] Transaction completed, result: ${result}`,
  );
  return { tx, result };
}

