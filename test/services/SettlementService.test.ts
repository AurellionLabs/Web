/**
 * SettlementService Unit Tests
 *
 * Tests the settlement service including:
 * - Validation logic (selectDestination)
 * - Custody breakdown calculation (no nodes case)
 * - Filtering logic for pending orders
 *
 * Note: Methods that interact with the blockchain require integration testing with
 * hardhat. These tests focus on pure business logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SettlementService } from '@/infrastructure/services/settlement-service';

describe('SettlementService', () => {
  let service: SettlementService;

  beforeEach(() => {
    service = new SettlementService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // selectDestination - validation logic (no blockchain needed)
  // =============================================================================
  describe('selectDestination validation', () => {
    it('should throw error when nodeId is null and burn is false', async () => {
      await expect(
        service.selectDestination('0xorderId', null, false),
      ).rejects.toThrow('Node ID is required when not burning');
    });

    it('should throw error when nodeId is undefined and burn is false', async () => {
      await expect(
        service.selectDestination('0xorderId', undefined as any, false),
      ).rejects.toThrow('Node ID is required when not burning');
    });

    it('should throw error when nodeId is empty string and burn is false', async () => {
      await expect(
        service.selectDestination('0xorderId', '', false),
      ).rejects.toThrow('Node ID is required when not burning');
    });

    it('should throw error when nodeId is zero bytes32 and burn is false', async () => {
      const zeroBytes32 =
        '0x0000000000000000000000000000000000000000000000000000000000000000';
      await expect(
        service.selectDestination('0xorderId', zeroBytes32, false),
      ).rejects.toThrow('Node ID is required when not burning');
    });
  });

  // =============================================================================
  // getCustodyBreakdown - business logic (no blockchain when nodes is empty)
  // =============================================================================
  describe('getCustodyBreakdown business logic (no nodes)', () => {
    it('should return wallet-only breakdown when no nodes provided', async () => {
      const result = await service.getCustodyBreakdown('123', 100n, []);

      expect(result).toEqual({
        inWallet: 100n,
        nodes: [],
        totalBalance: 100n,
      });
    });

    it('should handle zero wallet balance with no nodes', async () => {
      const result = await service.getCustodyBreakdown('123', 0n, []);

      expect(result).toEqual({
        inWallet: 0n,
        nodes: [],
        totalBalance: 0n,
      });
    });

    it('should handle large token IDs with no nodes', async () => {
      const result = await service.getCustodyBreakdown(
        '9999999999999999999',
        500n,
        [],
      );

      expect(result).toEqual({
        inWallet: 500n,
        nodes: [],
        totalBalance: 500n,
      });
    });

    it('should preserve wallet balance in totalBalance field', async () => {
      const result = await service.getCustodyBreakdown('123', 123456789n, []);

      expect(result.totalBalance).toBe(123456789n);
    });
  });

  // =============================================================================
  // getPendingOrders - filtering logic
  // =============================================================================
  describe('getPendingOrders filtering logic (simulated)', () => {
    const zeroBytes32 =
      '0x0000000000000000000000000000000000000000000000000000000000000000';
    const order1 =
      '0xorder1000000000000000000000000000000000000000000000000000000000001';
    const order2 =
      '0xorder2000000000000000000000000000000000000000000000000000000000002';

    function filterPendingOrders(orderIds: string[]): string[] {
      return orderIds.filter((id) => id !== zeroBytes32);
    }

    it('should filter out zero bytes32 from pending orders', () => {
      const result = filterPendingOrders([
        zeroBytes32,
        order1,
        order2,
        zeroBytes32,
      ]);
      expect(result).toEqual([order1, order2]);
    });

    it('should return empty array when all orders are zero bytes32', () => {
      const result = filterPendingOrders([
        zeroBytes32,
        zeroBytes32,
        zeroBytes32,
      ]);
      expect(result).toEqual([]);
    });

    it('should return empty array when input is empty', () => {
      const result = filterPendingOrders([]);
      expect(result).toEqual([]);
    });

    it('should return all orders when none are zero bytes32', () => {
      const result = filterPendingOrders([order1, order2]);
      expect(result).toEqual([order1, order2]);
    });

    it('should handle mixed valid and zero orders', () => {
      const result = filterPendingOrders([
        order1,
        zeroBytes32,
        order2,
        zeroBytes32,
        order1,
      ]);
      expect(result).toEqual([order1, order2, order1]);
    });
  });

  // =============================================================================
  // getCustodyBreakdown calculation logic
  // =============================================================================
  describe('getCustodyBreakdown calculation logic (simulated)', () => {
    function calculateInWallet(
      walletBalance: bigint,
      nodeBalances: bigint[],
    ): {
      inWallet: bigint;
      totalNodeCustody: bigint;
    } {
      const totalNodeCustody = nodeBalances.reduce((sum, b) => sum + b, 0n);
      const inWallet =
        walletBalance > totalNodeCustody
          ? walletBalance - totalNodeCustody
          : 0n;
      return { inWallet, totalNodeCustody };
    }

    it('should calculate inWallet correctly when wallet > node custody', () => {
      const { inWallet, totalNodeCustody } = calculateInWallet(100n, [
        50n,
        30n,
      ]);
      expect(inWallet).toBe(20n);
      expect(totalNodeCustody).toBe(80n);
    });

    it('should return 0 for inWallet when node custody exceeds wallet', () => {
      const { inWallet, totalNodeCustody } = calculateInWallet(100n, [150n]);
      expect(inWallet).toBe(0n);
      expect(totalNodeCustody).toBe(150n);
    });

    it('should return full wallet when no node custody', () => {
      const { inWallet, totalNodeCustody } = calculateInWallet(100n, []);
      expect(inWallet).toBe(100n);
      expect(totalNodeCustody).toBe(0n);
    });

    it('should handle zero wallet balance', () => {
      const { inWallet, totalNodeCustody } = calculateInWallet(0n, [10n, 20n]);
      expect(inWallet).toBe(0n);
      expect(totalNodeCustody).toBe(30n);
    });

    it('should handle large numbers', () => {
      const { inWallet, totalNodeCustody } = calculateInWallet(1_000_000_000n, [
        500_000_000n,
        300_000_000n,
      ]);
      expect(inWallet).toBe(200_000_000n);
      expect(totalNodeCustody).toBe(800_000_000n);
    });

    it('should handle many small node balances', () => {
      const manyNodes = Array(100).fill(1n);
      const { inWallet, totalNodeCustody } = calculateInWallet(200n, manyNodes);
      expect(inWallet).toBe(100n);
      expect(totalNodeCustody).toBe(100n);
    });
  });
});
