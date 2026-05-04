/**
 * Redis Cache Tests (TDD)
 *
 * Tests for the three-tier caching strategy:
 * - Tier 1: PERMANENT (IPFS metadata - never invalidate)
 * - Tier 2: EVENT-DRIVEN (node capacity, order state - invalidate on events)
 * - Tier 3: TTL-BASED (block number, gas price - auto-expire)
 *
 * NOTE: These tests require a running Redis server.
 * Set REDIS_URL env var or use localhost:6379.
 * Tests are skipped in CI environments (CI=true) since Redis isn't available.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedisCache } from '@/infrastructure/cache/redis-cache';

// Test Redis URL - separate database for tests
const TEST_REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/15';

// Skip unless Redis-backed integration tests are explicitly enabled.
// This avoids failing the unit matrix when no external Redis service is running.
const shouldRunTests =
  !process.env.CI &&
  process.env.SKIP_REDIS_TESTS !== 'true' &&
  (Boolean(process.env.REDIS_URL) || process.env.RUN_REDIS_TESTS === 'true');

describe.skipIf(!shouldRunTests)('RedisCache', () => {
  let cache: RedisCache;

  beforeEach(async () => {
    cache = new RedisCache(TEST_REDIS_URL);
    await cache.connect();
    // Flush test database before each test
    await cache.flushAll();
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  describe('Connection', () => {
    it('should connect to Redis successfully', async () => {
      const newCache = new RedisCache(TEST_REDIS_URL);
      await newCache.connect();
      expect(await newCache.isConnected()).toBe(true);
      await newCache.disconnect();
    });

    it('should handle connection errors gracefully', async () => {
      const badCache = new RedisCache('redis://localhost:9999');
      await expect(badCache.connect()).rejects.toThrow();
    });
  });

  describe('Tier 1: Permanent Cache (IPFS Metadata)', () => {
    const tokenId = '12345';
    const metadata = {
      name: 'Test Asset',
      class: 'GOAT',
      attributes: [
        { name: 'weight', values: ['50kg'], description: 'Animal weight' },
      ],
      cid: 'QmTestCid123',
    };

    it('should store and retrieve IPFS metadata', async () => {
      await cache.setIpfsMetadata(tokenId, metadata);
      const result = await cache.getIpfsMetadata(tokenId);
      expect(result).toEqual(metadata);
    });

    it('should return null for non-existent metadata', async () => {
      const result = await cache.getIpfsMetadata('nonexistent');
      expect(result).toBeNull();
    });

    it('should overwrite metadata on re-set (idempotent)', async () => {
      await cache.setIpfsMetadata(tokenId, metadata);
      const updated = { ...metadata, name: 'Updated Name' };
      await cache.setIpfsMetadata(tokenId, updated);
      const result = await cache.getIpfsMetadata(tokenId);
      expect(result?.name).toBe('Updated Name');
    });

    it('should persist metadata (no TTL)', async () => {
      await cache.setIpfsMetadata(tokenId, metadata);
      const ttl = await cache.getTtl(`ipfs:metadata:${tokenId}`);
      expect(ttl).toBe(-1); // -1 means no expiry in Redis
    });

    it('should store raw CID content', async () => {
      const cid = 'QmTestCid456';
      const content = { raw: 'data', nested: { value: 123 } };
      await cache.setCidContent(cid, content);
      const result = await cache.getCidContent(cid);
      expect(result).toEqual(content);
    });
  });

  describe('Tier 2: Event-Driven Cache', () => {
    const chainId = 84532;
    const nodeHash = '0x' + 'a'.repeat(64);

    describe('Node Capacity', () => {
      it('should store and retrieve node capacity', async () => {
        await cache.setNodeCapacity(chainId, nodeHash, '1000');
        const result = await cache.getNodeCapacity(chainId, nodeHash);
        expect(result).toBe('1000');
      });

      it('should return null for non-existent capacity', async () => {
        const result = await cache.getNodeCapacity(chainId, '0xnonexistent');
        expect(result).toBeNull();
      });

      it('should invalidate node capacity', async () => {
        await cache.setNodeCapacity(chainId, nodeHash, '1000');
        await cache.invalidateNodeCapacity(chainId, nodeHash);
        const result = await cache.getNodeCapacity(chainId, nodeHash);
        expect(result).toBeNull();
      });

      it('should have no TTL (event-driven)', async () => {
        await cache.setNodeCapacity(chainId, nodeHash, '1000');
        const ttl = await cache.getTtl(`node:capacity:${chainId}:${nodeHash}`);
        expect(ttl).toBe(-1);
      });
    });

    describe('Order State', () => {
      const orderId = 'order-123';
      const orderState = {
        status: 'created',
        buyer: '0xbuyer',
        seller: '0xseller',
        tokenId: '456',
        quantity: '10',
        price: '1000000',
      };

      it('should store and retrieve order state', async () => {
        await cache.setOrderState(chainId, orderId, orderState);
        const result = await cache.getOrderState(chainId, orderId);
        expect(result).toEqual(orderState);
      });

      it('should invalidate order state', async () => {
        await cache.setOrderState(chainId, orderId, orderState);
        await cache.invalidateOrderState(chainId, orderId);
        const result = await cache.getOrderState(chainId, orderId);
        expect(result).toBeNull();
      });
    });

    describe('User Balances', () => {
      const address = '0xuser123';
      const balances = {
        '123': '100',
        '456': '50',
      };

      it('should store and retrieve user balances', async () => {
        await cache.setUserBalances(chainId, address, balances);
        const result = await cache.getUserBalances(chainId, address);
        expect(result).toEqual(balances);
      });

      it('should invalidate user balances', async () => {
        await cache.setUserBalances(chainId, address, balances);
        await cache.invalidateUserBalances(chainId, address);
        const result = await cache.getUserBalances(chainId, address);
        expect(result).toBeNull();
      });

      it('should support partial balance updates', async () => {
        await cache.setUserBalances(chainId, address, balances);
        await cache.updateUserBalance(chainId, address, '789', '25');
        const result = await cache.getUserBalances(chainId, address);
        expect(result).toEqual({ ...balances, '789': '25' });
      });
    });

    describe('Batch Invalidation', () => {
      it('should invalidate multiple keys at once', async () => {
        await cache.setNodeCapacity(chainId, nodeHash, '1000');
        await cache.setNodeCapacity(chainId, '0xother', '500');
        await cache.setOrderState(chainId, 'order-1', { status: 'created' });

        await cache.invalidateBatch([
          { type: 'node:capacity', chainId, id: nodeHash },
          { type: 'order:state', chainId, id: 'order-1' },
        ]);

        expect(await cache.getNodeCapacity(chainId, nodeHash)).toBeNull();
        expect(await cache.getNodeCapacity(chainId, '0xother')).toBe('500');
        expect(await cache.getOrderState(chainId, 'order-1')).toBeNull();
      });
    });
  });

  describe('Tier 3: TTL-Based Cache', () => {
    const chainId = 84532;

    describe('Block Number', () => {
      it('should store and retrieve block number', async () => {
        await cache.setBlockNumber(chainId, 12345);
        const result = await cache.getBlockNumber(chainId);
        expect(result).toBe(12345);
      });

      it('should have TTL of 60 seconds', async () => {
        await cache.setBlockNumber(chainId, 12345);
        const ttl = await cache.getTtl(`rpc:block:${chainId}`);
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(60);
      });

      it('should return null after TTL expires', async () => {
        // Set with 1 second TTL
        await cache.setBlockNumber(chainId, 12345, 1);
        // Wait for TTL to expire
        await new Promise((resolve) => setTimeout(resolve, 1100));
        const result = await cache.getBlockNumber(chainId);
        expect(result).toBeNull();
      });
    });

    describe('Gas Price', () => {
      it('should store and retrieve gas price', async () => {
        await cache.setGasPrice(chainId, '1000000000');
        const result = await cache.getGasPrice(chainId);
        expect(result).toBe('1000000000');
      });

      it('should have TTL of 30 seconds', async () => {
        await cache.setGasPrice(chainId, '1000000000');
        const ttl = await cache.getTtl(`rpc:gas:${chainId}`);
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(30);
      });
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit/miss ratio', async () => {
      await cache.setIpfsMetadata('token1', { name: 'Test' });

      // Hit
      await cache.getIpfsMetadata('token1');
      // Miss
      await cache.getIpfsMetadata('token2');

      const stats = await cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.ratio).toBe(0.5);
    });

    it('should track key count', async () => {
      await cache.setIpfsMetadata('token1', { name: 'Test' });
      await cache.setIpfsMetadata('token2', { name: 'Test2' });
      await cache.setNodeCapacity(84532, '0xnode', '1000');

      const stats = await cache.getStats();
      // Key count may vary based on Redis INFO format, just verify it's >= 3
      expect(stats.keyCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      // Manually set invalid JSON
      await cache['client'].set('ipfs:metadata:bad', 'not json');
      const result = await cache.getIpfsMetadata('bad');
      expect(result).toBeNull();
    });

    it('should handle Redis connection loss gracefully', async () => {
      await cache.setIpfsMetadata('token1', { name: 'Test' });
      // Disconnect the client directly
      await cache['client'].quit();
      cache['connected'] = false;

      // Should not throw, return null instead
      const result = await cache.getIpfsMetadata('token1');
      expect(result).toBeNull();
      // Prevent afterEach from trying to disconnect again
      cache['connected'] = false;
    });
  });
});
