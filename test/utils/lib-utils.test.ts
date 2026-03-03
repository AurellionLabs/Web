/**
 * @file test/utils/lib-utils.test.ts
 * @description Tests for lib/utils.ts functions
 */

import { describe, it, expect } from 'vitest';
import { formatWeiToEther, formatWeiToCurrency, cn } from '@/lib/utils';

describe('formatWeiToEther', () => {
  it('should format zero wei to 0.00', () => {
    expect(formatWeiToEther('0')).toBe('0.00');
    expect(formatWeiToEther(0n)).toBe('0.00');
  });

  it('should format string wei to ether', () => {
    // 1 ETH = 1000000000000000000 wei - ethers.formatUnits handles this
    const result1 = formatWeiToEther('1000000000000000000');
    expect(parseFloat(result1)).toBe(1);

    const result2 = formatWeiToEther('500000000000000000');
    expect(parseFloat(result2)).toBe(0.5);

    const result3 = formatWeiToEther('250000000000000000');
    expect(parseFloat(result3)).toBe(0.25);
  });

  it('should format bigint wei to ether', () => {
    // ethers.formatUnits returns various formats, just check it's numeric
    expect(formatWeiToEther(1000000000000000000n)).toMatch(/^1\.?0*$/);
    expect(formatWeiToEther(10000000000000000n)).toMatch(/^0\.?0*1$/);
  });

  it('should handle large values', () => {
    // 100 ETH - check value is correct (formatting may vary)
    expect(parseFloat(formatWeiToEther('100000000000000000000'))).toBe(100);
    // 1000 ETH
    expect(parseFloat(formatWeiToEther('1000000000000000000000'))).toBe(1000);
  });

  it('should handle null/undefined gracefully', () => {
    expect(formatWeiToEther('')).toBe('0.00');
    expect(formatWeiToEther(null as any)).toBe('0.00');
  });
});

describe('formatWeiToCurrency', () => {
  it('should format wei to USD currency', () => {
    expect(formatWeiToCurrency('1000000000000000000')).toBe('$1.00');
    expect(formatWeiToCurrency('500000000000000000')).toBe('$0.50');
  });

  it('should format large values with commas', () => {
    expect(formatWeiToCurrency('100000000000000000000')).toBe('$100.00');
    expect(formatWeiToCurrency('1000000000000000000000')).toBe('$1,000.00');
  });

  it('should handle zero and small values', () => {
    expect(formatWeiToCurrency('0')).toBe('$0.00');
    expect(formatWeiToCurrency('1000000000000000')).toBe('$0.00'); // 0.001 ETH
  });

  it('should handle invalid input', () => {
    expect(formatWeiToCurrency('')).toBe('$0.00');
    expect(formatWeiToCurrency('invalid' as any)).toBe('$0.00');
  });
});

describe('cn (classnames merge)', () => {
  it('should merge class names', () => {
    const result = cn('foo', 'bar');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('should handle conditional classes', () => {
    const condition = true;
    const result = cn('foo', condition && 'bar', 'baz');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
    expect(result).toContain('baz');
  });

  it('should handle falsy values', () => {
    const result = cn('foo', false && 'bar', null, undefined, 0);
    expect(result).toContain('foo');
    expect(result).not.toContain('bar');
  });

  it('should handle arrays', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
    expect(result).toContain('baz');
  });

  it('should handle objects', () => {
    const result = cn('foo', { bar: true, baz: false });
    expect(result).toContain('foo');
    expect(result).toContain('bar');
    expect(result).not.toContain('baz');
  });
});
