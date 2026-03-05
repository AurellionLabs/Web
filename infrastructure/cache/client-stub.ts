/**
 * Client-safe cache stub - no Redis/ioredis (uses Node.js 'net' module).
 * Used when building for the browser to avoid "Module not found: Can't resolve 'net'".
 * Server builds use redis-cache.ts instead (via webpack alias).
 */

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

class NoOpCache {
  async getCidContent(_key: string): Promise<Record<string, unknown> | null> {
    return null;
  }
  async setCidContent(
    _key: string,
    _content: Record<string, unknown>,
  ): Promise<void> {}
  async getIpfsMetadata(_tokenId: string): Promise<AssetMetadata | null> {
    return null;
  }
  async setIpfsMetadata(
    _tokenId: string,
    _metadata: AssetMetadata,
  ): Promise<void> {}
  async getNodeCapacity(
    _chainId: number,
    _nodeHash: string,
  ): Promise<string | null> {
    return null;
  }
  async setNodeCapacity(
    _chainId: number,
    _nodeHash: string,
    _capacity: string,
  ): Promise<void> {}
  async invalidateNodeCapacity(
    _chainId: number,
    _nodeHash: string,
  ): Promise<void> {}
  async getOrderState(
    _chainId: number,
    _orderId: string,
  ): Promise<OrderState | null> {
    return null;
  }
  async setOrderState(
    _chainId: number,
    _orderId: string,
    _state: OrderState,
  ): Promise<void> {}
  async invalidateOrderState(
    _chainId: number,
    _orderId: string,
  ): Promise<void> {}
  async getUserBalances(
    _chainId: number,
    _address: string,
  ): Promise<UserBalances | null> {
    return null;
  }
  async setUserBalances(
    _chainId: number,
    _address: string,
    _balances: UserBalances,
  ): Promise<void> {}
  async invalidateUserBalances(
    _chainId: number,
    _address: string,
  ): Promise<void> {}
  async invalidate(_target: InvalidationTarget): Promise<void> {}
  async getStats(): Promise<CacheStats> {
    return { hits: 0, misses: 0, ratio: 0, keyCount: 0 };
  }
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async isConnected(): Promise<boolean> {
    return false;
  }
}

const stubCache = new NoOpCache();

// Alias for compatibility with cache index re-exports
export { NoOpCache as RedisCache };

export function getCache(): NoOpCache {
  return stubCache;
}

export async function initCache(): Promise<void> {
  // No-op for client
}
