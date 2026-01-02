'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Direction of price change
 */
export type PriceDirection = 'up' | 'down' | 'neutral';

/**
 * State returned by the price animation hook
 */
export interface PriceAnimationState {
  /** Current display price */
  displayPrice: number;
  /** Previous price value */
  previousPrice: number;
  /** Direction of the latest change */
  direction: PriceDirection;
  /** Whether the flash animation is active */
  isFlashing: boolean;
  /** CSS class for the flash animation */
  flashClass: string;
  /** CSS class for the text color */
  colorClass: string;
}

/**
 * Options for the price animation hook
 */
export interface UsePriceAnimationOptions {
  /** Duration of the flash animation in ms */
  flashDuration?: number;
  /** Whether to animate the number counting */
  animateValue?: boolean;
  /** Duration of value animation in ms */
  valueDuration?: number;
  /** Threshold for considering price change significant */
  changeThreshold?: number;
}

/**
 * usePriceAnimation - Hook for animating price changes
 *
 * Provides:
 * - Flash animation on price change
 * - Color classes based on direction
 * - Smooth value transitions
 * - Previous price tracking
 *
 * @param price - Current price value
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const {
 *   displayPrice,
 *   direction,
 *   flashClass,
 *   colorClass,
 * } = usePriceAnimation(currentPrice);
 *
 * return (
 *   <span className={`${flashClass} ${colorClass}`}>
 *     ${displayPrice.toFixed(2)}
 *   </span>
 * );
 * ```
 */
export function usePriceAnimation(
  price: number,
  options: UsePriceAnimationOptions = {},
): PriceAnimationState {
  const {
    flashDuration = 500,
    animateValue = false,
    valueDuration = 300,
    changeThreshold = 0,
  } = options;

  const [displayPrice, setDisplayPrice] = useState(price);
  const [previousPrice, setPreviousPrice] = useState(price);
  const [direction, setDirection] = useState<PriceDirection>('neutral');
  const [isFlashing, setIsFlashing] = useState(false);

  const previousPriceRef = useRef(price);
  const animationRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine direction and trigger flash
  useEffect(() => {
    const prevPrice = previousPriceRef.current;
    const change = price - prevPrice;

    if (Math.abs(change) > changeThreshold) {
      setPreviousPrice(prevPrice);
      setDirection(change > 0 ? 'up' : 'down');
      setIsFlashing(true);

      // Clear existing flash timeout
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }

      // End flash after duration
      flashTimeoutRef.current = setTimeout(() => {
        setIsFlashing(false);
      }, flashDuration);
    }

    previousPriceRef.current = price;

    // Animate value change
    if (animateValue && prevPrice !== price) {
      const startTime = Date.now();
      const startValue = displayPrice;
      const endValue = price;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / valueDuration, 1);

        // Ease out quad
        const eased = 1 - (1 - progress) * (1 - progress);
        const currentValue = startValue + (endValue - startValue) * eased;

        setDisplayPrice(currentValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setDisplayPrice(price);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, [price, flashDuration, animateValue, valueDuration, changeThreshold]);

  // Get flash animation class
  const flashClass = isFlashing
    ? direction === 'up'
      ? 'animate-flash-green'
      : direction === 'down'
        ? 'animate-flash-red'
        : ''
    : '';

  // Get color class based on direction
  const colorClass =
    direction === 'up'
      ? 'text-trading-buy'
      : direction === 'down'
        ? 'text-trading-sell'
        : 'text-foreground';

  return {
    displayPrice,
    previousPrice,
    direction,
    isFlashing,
    flashClass,
    colorClass,
  };
}

/**
 * Hook for tracking multiple prices with animations
 */
export function useMultiplePriceAnimations(
  prices: Record<string, number>,
  options: UsePriceAnimationOptions = {},
) {
  const [animations, setAnimations] = useState<
    Record<string, PriceAnimationState>
  >({});
  const previousPrices = useRef<Record<string, number>>({});
  const flashTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const { flashDuration = 500, changeThreshold = 0 } = options;

  useEffect(() => {
    const newAnimations: Record<string, PriceAnimationState> = {};

    Object.entries(prices).forEach(([id, price]) => {
      const prevPrice = previousPrices.current[id] ?? price;
      const change = price - prevPrice;
      const hasChange = Math.abs(change) > changeThreshold;

      let direction: PriceDirection = 'neutral';
      let isFlashing = false;

      if (hasChange) {
        direction = change > 0 ? 'up' : 'down';
        isFlashing = true;

        // Clear existing timeout
        if (flashTimeouts.current[id]) {
          clearTimeout(flashTimeouts.current[id]);
        }

        // Set timeout to clear flash
        flashTimeouts.current[id] = setTimeout(() => {
          setAnimations((prev) => ({
            ...prev,
            [id]: { ...prev[id], isFlashing: false, flashClass: '' },
          }));
        }, flashDuration);
      }

      const flashClass = isFlashing
        ? direction === 'up'
          ? 'animate-flash-green'
          : direction === 'down'
            ? 'animate-flash-red'
            : ''
        : '';

      const colorClass =
        direction === 'up'
          ? 'text-trading-buy'
          : direction === 'down'
            ? 'text-trading-sell'
            : 'text-foreground';

      newAnimations[id] = {
        displayPrice: price,
        previousPrice: prevPrice,
        direction,
        isFlashing,
        flashClass,
        colorClass,
      };

      previousPrices.current[id] = price;
    });

    setAnimations(newAnimations);

    return () => {
      Object.values(flashTimeouts.current).forEach(clearTimeout);
    };
  }, [prices, flashDuration, changeThreshold]);

  const getAnimation = useCallback(
    (id: string): PriceAnimationState => {
      return (
        animations[id] ?? {
          displayPrice: prices[id] ?? 0,
          previousPrice: prices[id] ?? 0,
          direction: 'neutral',
          isFlashing: false,
          flashClass: '',
          colorClass: 'text-foreground',
        }
      );
    },
    [animations, prices],
  );

  return { animations, getAnimation };
}

export default usePriceAnimation;
