import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePriceAnimation } from '@/hooks/usePriceAnimation';

describe('usePriceAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns neutral direction and no flash on initial render', () => {
    const { result } = renderHook(() => usePriceAnimation(100));

    expect(result.current.direction).toBe('neutral');
    expect(result.current.isFlashing).toBe(false);
    expect(result.current.displayPrice).toBe(100);
    expect(result.current.previousPrice).toBe(100);
    expect(result.current.flashClass).toBe('');
    expect(result.current.colorClass).toBe('text-foreground');
  });

  it('detects price increase: direction=up, isFlashing=true', () => {
    const { result, rerender } = renderHook(
      ({ price }) => usePriceAnimation(price),
      { initialProps: { price: 100 } },
    );

    rerender({ price: 110 });

    expect(result.current.direction).toBe('up');
    expect(result.current.isFlashing).toBe(true);
    expect(result.current.displayPrice).toBe(110);
    expect(result.current.previousPrice).toBe(100);
  });

  it('detects price decrease: direction=down, isFlashing=true', () => {
    const { result, rerender } = renderHook(
      ({ price }) => usePriceAnimation(price),
      { initialProps: { price: 100 } },
    );

    rerender({ price: 90 });

    expect(result.current.direction).toBe('down');
    expect(result.current.isFlashing).toBe(true);
    expect(result.current.displayPrice).toBe(90);
    expect(result.current.previousPrice).toBe(100);
  });

  it('applies correct flash CSS class for price up', () => {
    const { result, rerender } = renderHook(
      ({ price }) => usePriceAnimation(price),
      { initialProps: { price: 100 } },
    );

    rerender({ price: 110 });

    expect(result.current.flashClass).toBe('animate-flash-green');
    expect(result.current.colorClass).toBe('text-trading-buy');
  });

  it('applies correct flash CSS class for price down', () => {
    const { result, rerender } = renderHook(
      ({ price }) => usePriceAnimation(price),
      { initialProps: { price: 100 } },
    );

    rerender({ price: 90 });

    expect(result.current.flashClass).toBe('animate-flash-red');
    expect(result.current.colorClass).toBe('text-trading-sell');
  });

  it('clears flash after default flashDuration (500ms)', () => {
    const { result, rerender } = renderHook(
      ({ price }) => usePriceAnimation(price),
      { initialProps: { price: 100 } },
    );

    rerender({ price: 110 });
    expect(result.current.isFlashing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.isFlashing).toBe(false);
    expect(result.current.flashClass).toBe('');
    // Direction remains even after flash ends
    expect(result.current.direction).toBe('up');
  });

  it('respects custom flashDuration', () => {
    const { result, rerender } = renderHook(
      ({ price }) => usePriceAnimation(price, { flashDuration: 2000 }),
      { initialProps: { price: 100 } },
    );

    rerender({ price: 110 });
    expect(result.current.isFlashing).toBe(true);

    // Not yet expired
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isFlashing).toBe(true);

    // Now expired
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isFlashing).toBe(false);
  });

  it('respects changeThreshold — ignores small changes', () => {
    const { result, rerender } = renderHook(
      ({ price }) => usePriceAnimation(price, { changeThreshold: 5 }),
      { initialProps: { price: 100 } },
    );

    // Small change within threshold
    rerender({ price: 103 });
    expect(result.current.direction).toBe('neutral');
    expect(result.current.isFlashing).toBe(false);

    // Change above threshold
    rerender({ price: 110 });
    expect(result.current.direction).toBe('up');
    expect(result.current.isFlashing).toBe(true);
  });

  it('handles multiple rapid price changes, resetting flash timer', () => {
    const { result, rerender } = renderHook(
      ({ price }) => usePriceAnimation(price),
      { initialProps: { price: 100 } },
    );

    rerender({ price: 110 });
    expect(result.current.isFlashing).toBe(true);

    // Advance partially
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isFlashing).toBe(true);

    // Another price change resets the flash timer
    rerender({ price: 120 });
    expect(result.current.isFlashing).toBe(true);

    // Original timeout would have expired, but we reset
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isFlashing).toBe(true);

    // Now advance past the new timeout
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.isFlashing).toBe(false);
  });

  it('tracks previousPrice correctly across multiple changes', () => {
    const { result, rerender } = renderHook(
      ({ price }) => usePriceAnimation(price),
      { initialProps: { price: 100 } },
    );

    rerender({ price: 110 });
    expect(result.current.previousPrice).toBe(100);

    rerender({ price: 105 });
    expect(result.current.previousPrice).toBe(110);
    expect(result.current.direction).toBe('down');
  });
});
