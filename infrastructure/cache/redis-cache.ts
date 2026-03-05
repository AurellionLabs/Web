/**
 * Redis Cache Implementation
 *
 * Three-tier caching strategy for Aurellion:
 *
 * Tier 1: PERMANENT (IPFS metadata - never invalidate)
 * - Keys: ipfs:metadata:{tokenId}, ipfs:cid:{cid}
 * - No TTL - immutable content
 *
 * Tier 2: EVENT-DRIVEN (state that changes on events)
 * - Keys: node:capacity:{chainId}:{nodeHash}, order:state:{chainId}:{orderId}
 * - No TTL - invalidated by Ponder event handlers
 *
 * Tier 3: TTL-BASED (frequently changing data)
 * - Keys: rpc:block:{chainId}, rpc:gas:{chainId}
 * - Short TTL - auto-expire
 */

import Redis, { RedisOptions } from 'ioredis';

// Cache key prefixes
const PREFIX = {
  IPFS_METADATA: 'ipfs:metadata:',
  IPFS_CID: 'ipfs:cid:',
  NODE_CAPACITY: 'node:capacity:',
  ORDER_STATE: 'order:state:',
  USER_BALANCES: 'user:balances:',
  BLOCK_NUMBER: 'rpc:block:',
  GAS_PRICE: 'rpc:gas:',
  INDEXER_HEALTH: 'health:indexer:',
};

// Default TTLs in seconds
const DEFAULT_TTL = {
  BLOCK_NUMBER: 60,
  GAS_PRICE: 30,
  INDEXER_HEALTH: 10,
};

// Type definitions
export interface AssetMetadata {
  name: string;
  class: string;
  attributes?: Array<{
    name: string;
    values: string[];
    description?: string;
  }>;
  cid?: string;
  [key: string]: unknown;
}

export interface OrderState {
  status: string;
  buyer?: string;
  seller?: string;
  tokenId?: string;
  quantity?: string;
  price?: string;
  [key: string]: unknown;
}

export interface UserBalances {
  [tokenId: string]: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  ratio: number;
  keyCount: number;
}

export interface InvalidationTarget {
  type: 'node:capacity' | 'order:state' | 'user:balances';
  chainId: number;
  id: string;
}

export class RedisCache {
  private client: Redis;
  private connected: boolean = false;
  private hits: number = 0;
  private misses: number = 0;

  constructor(url: string) {
    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    } as RedisOptions);

    this.client.on('error', (err) => {
      console.error('[RedisCache] Connection error:', err.message);
    });

    this.client.on('connect', () => {
      this.connected = true;
    });

    this.client.on('close', () => {
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connected) {
        await this.client.quit();
      }
    } catch {
      // Already disconnected
    }
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    return this.connected && this.client.status === 'ready';
  }

  async flushAll(): Promise<void> {
    await this.client.flushdb();
  }

  async getTtl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // ===========================================================================
  // Tier 1: PERMANENT CACHE (IPFS Metadata)
  // ===========================================================================

  async getIpfsMetadata(tokenId: string): Promise<AssetMetadata | null> {
    return this.getJson<AssetMetadata>(`${PREFIX.IPFS_METADATA}${tokenId}`);
  }

  async setIpfsMetadata(
    tokenId: string,
    metadata: AssetMetadata,
  ): Promise<void> {
    // No TTL - permanent cache
    await this.setJson(`${PREFIX.IPFS_METADATA}${tokenId}`, metadata);
  }

  async getCidContent(cid: string): Promise<Record<string, unknown> | null> {
    return this.getJson<Record<string, unknown>>(`${PREFIX.IPFS_CID}${cid}`);
  }

  async setCidContent(
    cid: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    // No TTL - permanent cache
    await this.setJson(`${PREFIX.IPFS_CID}${cid}`, content);
  }

  // ===========================================================================
  // Tier 2: EVENT-DRIVEN CACHE
  // ===========================================================================

  // Node Capacity
  async getNodeCapacity(
    chainId: number,
    nodeHash: string,
  ): Promise<string | null> {
    return this.getString(`${PREFIX.NODE_CAPACITY}${chainId}:${nodeHash}`);
  }

  async setNodeCapacity(
    chainId: number,
    nodeHash: string,
    capacity: string,
  ): Promise<void> {
    // No TTL - event-driven invalidation
    await this.client.set(
      `${PREFIX.NODE_CAPACITY}${chainId}:${nodeHash}`,
      capacity,
    );
  }

  async invalidateNodeCapacity(
    chainId: number,
    nodeHash: string,
  ): Promise<void> {
    await this.client.del(`${PREFIX.NODE_CAPACITY}${chainId}:${nodeHash}`);
  }

  // Order State
  async getOrderState(
    chainId: number,
    orderId: string,
  ): Promise<OrderState | null> {
    return this.getJson<OrderState>(
      `${PREFIX.ORDER_STATE}${chainId}:${orderId}`,
    );
  }

  async setOrderState(
    chainId: number,
    orderId: string,
    state: OrderState,
  ): Promise<void> {
    // No TTL - event-driven invalidation
    await this.setJson(`${PREFIX.ORDER_STATE}${chainId}:${orderId}`, state);
  }

  async invalidateOrderState(chainId: number, orderId: string): Promise<void> {
    await this.client.del(`${PREFIX.ORDER_STATE}${chainId}:${orderId}`);
  }

  // User Balances
  async getUserBalances(
    chainId: number,
    address: string,
  ): Promise<UserBalances | null> {
    return this.getJson<UserBalances>(
      `${PREFIX.USER_BALANCES}${chainId}:${address}`,
    );
  }

  async setUserBalances(
    chainId: number,
    address: string,
    balances: UserBalances,
  ): Promise<void> {
    // No TTL - event-driven invalidation
    await this.setJson(
      `${PREFIX.USER_BALANCES}${chainId}:${address}`,
      balances,
    );
  }

  async invalidateUserBalances(
    chainId: number,
    address: string,
  ): Promise<void> {
    await this.client.del(`${PREFIX.USER_BALANCES}${chainId}:${address}`);
  }

  async updateUserBalance(
    chainId: number,
    address: string,
    tokenId: string,
    amount: string,
  ): Promise<void> {
    const key = `${PREFIX.USER_BALANCES}${chainId}:${address}`;
    const existing = await this.getJson<UserBalances>(key);
    const updated = { ...existing, [tokenId]: amount };
    await this.setJson(key, updated);
  }

  // Batch Invalidation
  async invalidateBatch(targets: InvalidationTarget[]): Promise<void> {
    const keys = targets
      .map((t) => {
        switch (t.type) {
          case 'node:capacity':
            return `${PREFIX.NODE_CAPACITY}${t.chainId}:${t.id}`;
          case 'order:state':
            return `${PREFIX.ORDER_STATE}${t.chainId}:${t.id}`;
          case 'user:balances':
            return `${PREFIX.USER_BALANCES}${t.chainId}:${t.id}`;
          default:
            return '';
        }
      })
      .filter(Boolean);

    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // ===========================================================================
  // Tier 3: TTL-BASED CACHE
  // ===========================================================================

  // Block Number
  async getBlockNumber(chainId: number): Promise<number | null> {
    const result = await this.getString(`${PREFIX.BLOCK_NUMBER}${chainId}`);
    return result ? parseInt(result, 10) : null;
  }

  async setBlockNumber(
    chainId: number,
    blockNumber: number,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds ?? DEFAULT_TTL.BLOCK_NUMBER;
    await this.client.setex(
      `${PREFIX.BLOCK_NUMBER}${chainId}`,
      ttl,
      blockNumber.toString(),
    );
  }

  // Gas Price
  async getGasPrice(chainId: number): Promise<string | null> {
    return this.getString(`${PREFIX.GAS_PRICE}${chainId}`);
  }

  async setGasPrice(chainId: number, gasPrice: string): Promise<void> {
    await this.client.setex(
      `${PREFIX.GAS_PRICE}${chainId}`,
      DEFAULT_TTL.GAS_PRICE,
      gasPrice,
    );
  }

  // Indexer Health
  async getIndexerHealth(chainId: number): Promise<string | null> {
    return this.getString(`${PREFIX.INDEXER_HEALTH}${chainId}`);
  }

  async setIndexerHealth(chainId: number, status: string): Promise<void> {
    await this.client.setex(
      `${PREFIX.INDEXER_HEALTH}${chainId}`,
      DEFAULT_TTL.INDEXER_HEALTH,
      status,
    );
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  async getStats(): Promise<CacheStats> {
    let keyCount = 0;
    try {
      const info = await this.client.info('keyspace');
      const match = info.match(/keys=(\d+)/);
      keyCount = match ? parseInt(match[1], 10) : 0;
    } catch {
      // Ignore errors in stats
    }

    return {
      hits: this.hits,
      misses: this.misses,
      ratio:
        this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0,
      keyCount,
    };
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) {
        this.misses++;
        return null;
      }
      this.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn(`[RedisCache] Failed to get JSON for key ${key}:`, error);
      this.misses++;
      return null;
    }
  }

  private async setJson<T>(key: string, value: T): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[RedisCache] Failed to set JSON for key ${key}:`, error);
      throw error;
    }
  }

  private async getString(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key);
      if (!value) {
        this.misses++;
        return null;
      }
      this.hits++;
      return value;
    } catch (error) {
      console.warn(`[RedisCache] Failed to get string for key ${key}:`, error);
      this.misses++;
      return null;
    }
  }
}

// Singleton instance for app-wide use
let defaultCache: RedisCache | null = null;

export function getCache(): RedisCache {
  if (!defaultCache) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    defaultCache = new RedisCache(url);
  }
  return defaultCache;
}

export async function initCache(): Promise<void> {
  const cache = getCache();
  if (!(await cache.isConnected())) {
    await cache.connect();
  }
}
