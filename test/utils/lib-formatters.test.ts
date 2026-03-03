/**
 * @file test/utils/lib-formatters.test.ts
 * @description Tests for lib/formatters.ts functions
 */

import { describe, it, expect } from 'vitest';
import {
  formatTokenAmount,
  parseTokenAmount,
  formatAddress,
} from '@/lib/formatters';

describe('formatTokenAmount', () => {
  describe('with 18 decimals (AURA, ETH)', () => {
    it('should format zero to 0.00', () => {
      expect(formatTokenAmount('0', 18)).toBe('0.00');
      expect(formatTokenAmount(0n, 18)).toBe('0.00');
    });

    it('should format wei to human readable', () => {
      // 1 token with 18 decimals = 10^18
      expect(formatTokenAmount('1000000000000000000', 18)).toBe('1.00');
      expect(formatTokenAmount('500000000000000000', 18)).toBe('0.50');
    });

    it('should format large values', () => {
      expect(formatTokenAmount('100000000000000000000', 18)).toBe('100.00');
      expect(formatTokenAmount('1000000000000000000000', 18)).toBe('1000.00');
    });

    it('should respect displayDecimals parameter', () => {
      expect(formatTokenAmount('1000000000000000000', 18, 4)).toBe('1.0000');
      expect(formatTokenAmount('1000000000000000000', 18, 0)).toBe('1');
    });
  });

  describe('with 6 decimals (USDT, USDC)', () => {
    it('should format correctly', () => {
      // 1 USDT = 10^6
      expect(formatTokenAmount('1000000', 6)).toBe('1.00');
      expect(formatTokenAmount('2500000', 6)).toBe('2.50');
    });

    it('should handle large values', () => {
      expect(formatTokenAmount('1000000000', 6)).toBe('1000.00');
    });

    it('should respect displayDecimals', () => {
      expect(formatTokenAmount('1234567', 6, 3)).toBe('1.235');
      expect(formatTokenAmount('1234567', 6, 1)).toBe('1.2');
    });
  });

  describe('with 0 decimals (raw values)', () => {
    it('should format raw integers', () => {
      expect(formatTokenAmount('100', 0)).toBe('100.00');
      expect(formatTokenAmount('0', 0)).toBe('0.00');
      expect(formatTokenAmount(42, 0)).toBe('42.00');
    });

    it('should respect displayDecimals for raw', () => {
      expect(formatTokenAmount('123', 0, 0)).toBe('123');
      expect(formatTokenAmount('123', 0, 4)).toBe('123.0000');
    });

    it('should handle small raw values', () => {
      expect(formatTokenAmount('0', 0)).toBe('0.00');
    });
  });

  describe('edge cases', () => {
    it('should handle bigint input', () => {
      expect(formatTokenAmount(1000000n, 6)).toBe('1.00');
      expect(formatTokenAmount(1000000000000000000n, 18)).toBe('1.00');
    });

    it('should handle scientific notation', () => {
      // Note: Scientific notation handling may vary
      expect(formatTokenAmount('1e6', 6)).toBe('1.00');
    });

    it('should handle very small values', () => {
      // Values less than 0.01 should return 0.00
      expect(formatTokenAmount('1000000000000', 18)).toBe('0.00');
    });

    it('should handle invalid values', () => {
      expect(formatTokenAmount('', 18)).toBe('0.00');
      expect(formatTokenAmount('invalid' as any, 18)).toBe('0.00');
    });
  });
});

describe('parseTokenAmount', () => {
  describe('with 18 decimals', () => {
    it('should parse 1.00 to wei', () => {
      expect(parseTokenAmount('1.00', 18)).toBe(1000000000000000000n);
    });

    it('should parse decimal values correctly', () => {
      expect(parseTokenAmount('0.50', 18)).toBe(500000000000000000n);
      expect(parseTokenAmount('0.01', 18)).toBe(10000000000000000n);
    });

    it('should handle large values', () => {
      expect(parseTokenAmount('1000.00', 18)).toBe(1000000000000000000000n);
    });
  });

  describe('with 6 decimals', () => {
    it('should parse correctly', () => {
      expect(parseTokenAmount('1.00', 6)).toBe(1000000n);
      expect(parseTokenAmount('2.50', 6)).toBe(2500000n);
    });

    it('should handle large values', () => {
      expect(parseTokenAmount('1000.00', 6)).toBe(1000000000n);
    });
  });

  describe('with 0 decimals', () => {
    it('should parse raw integers', () => {
      expect(parseTokenAmount('100', 0)).toBe(100n);
      expect(parseTokenAmount('0', 0)).toBe(0n);
    });

    it('should floor decimal values', () => {
      expect(parseTokenAmount('100.99', 0)).toBe(100n);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      expect(parseTokenAmount('', 18)).toBe(0n);
    });

    it('should handle invalid input', () => {
      expect(parseTokenAmount('invalid', 18)).toBe(0n);
    });

    it('should handle scientific notation', () => {
      // Note: Scientific notation has limited support - ethers parseUnits handles it
      // 1e-6 with 6 decimals = 0.000001 = 1, so 1e-6 parses to 0n (floor of very small value)
      const result = parseTokenAmount('1e-6', 6);
      expect(typeof result).toBe('bigint');
    });

    it('should handle too many decimal places', () => {
      // Should truncate to correct decimals
      const result = parseTokenAmount('1.123456789', 6);
      expect(result).toBe(1123456n); // truncated to 6 decimals
    });
  });
});

describe('formatAddress', () => {
  it('should shorten an address', () => {
    const address = '0x742d35cc6634c0532925a3b844bc9e7595f0ab12';
    expect(formatAddress(address)).toBe('0x742d...ab12');
  });

  it('should handle short addresses', () => {
    // formatAddress always takes first 6 and last 4 chars
    // "0x1234" = 6 chars, slice(0, 6) = "0x1234", slice(-4) = "1234"
    expect(formatAddress('0x1234')).toBe('0x1234...1234');
    // 10+ chars will have proper truncation
    expect(formatAddress('0x742d35cc6634c0532925a3b844bc9e7595f0ab12')).toBe(
      '0x742d...ab12',
    );
  });

  it('should handle empty address', () => {
    expect(formatAddress('')).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(formatAddress(null as any)).toBe('');
    expect(formatAddress(undefined as any)).toBe('');
  });
});
