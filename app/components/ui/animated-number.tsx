'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  fixed?: number;
  precision?: number; // Alias for fixed
  className?: string;
  duration?: number;
  size?: 'sm' | 'md' | 'lg'; // Size prop for convenience
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  fixed,
  precision,
  className,
  duration = 500,
  size = 'md',
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef<number>();

  // Use precision as alias for fixed if fixed is not provided
  const decimalPlaces = fixed ?? precision ?? 0;

  const sizeClasses = {
    sm: 'text-lg font-medium',
    md: 'text-xl font-semibold',
    lg: 'text-2xl font-bold',
  };

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * easeOut;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue =
    decimalPlaces !== undefined && decimalPlaces >= 0
      ? displayValue.toLocaleString(undefined, {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        })
      : displayValue.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <span
      className={cn('tabular-nums text-white', sizeClasses[size], className)}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}
