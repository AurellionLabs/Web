/**
 * @file test/utils/app-helpers.test.ts
 * @description Vitest unit tests for app/utils/helpers.ts
 *
 * Covers:
 *  - getOrderStatus mapping for all valid status codes
 *  - getOrderStatus default case for unknown status
 */

import { describe, it, expect } from 'vitest';
import { OrderStatus } from '@/domain/orders/order';
import { getOrderStatus } from '@/app/utils/helpers';

describe('app/utils/helpers', () => {
  describe('getOrderStatus', () => {
    it('should map status 0 to OrderStatus.CREATED', () => {
      expect(getOrderStatus(0n)).toBe(OrderStatus.CREATED);
      expect(getOrderStatus(0)).toBe(OrderStatus.CREATED);
    });

    it('should map status 1 to OrderStatus.PROCESSING', () => {
      expect(getOrderStatus(1n)).toBe(OrderStatus.PROCESSING);
      expect(getOrderStatus(1)).toBe(OrderStatus.PROCESSING);
    });

    it('should map status 2 to OrderStatus.SETTLED', () => {
      expect(getOrderStatus(2n)).toBe(OrderStatus.SETTLED);
      expect(getOrderStatus(2)).toBe(OrderStatus.SETTLED);
    });

    it('should map status 3 to OrderStatus.CANCELLED', () => {
      expect(getOrderStatus(3n)).toBe(OrderStatus.CANCELLED);
      expect(getOrderStatus(3)).toBe(OrderStatus.CANCELLED);
    });

    it('should return CREATED for unknown status codes (default case)', () => {
      // Test various unknown status codes
      expect(getOrderStatus(4n)).toBe(OrderStatus.CREATED);
      expect(getOrderStatus(99n)).toBe(OrderStatus.CREATED);
      expect(getOrderStatus(100n)).toBe(OrderStatus.CREATED);
      expect(getOrderStatus(999n)).toBe(OrderStatus.CREATED);

      // Also test as number
      expect(getOrderStatus(4)).toBe(OrderStatus.CREATED);
      expect(getOrderStatus(99)).toBe(OrderStatus.CREATED);
    });

    it('should handle edge case of very large status values', () => {
      expect(getOrderStatus(BigInt(Number.MAX_SAFE_INTEGER))).toBe(
        OrderStatus.CREATED,
      );
    });

    it('should handle negative bigint by converting to number first', () => {
      // -1n will become -1 when converted via Number(), which is an unknown status
      expect(getOrderStatus(-1n)).toBe(OrderStatus.CREATED);
    });
  });
});
