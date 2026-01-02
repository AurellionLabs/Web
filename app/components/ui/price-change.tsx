'use client';

import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import React from 'react';

interface PriceChangeProps {
  change: number;
  percentage?: number;
  className?: string;
  fixed?: number;
  suffix?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceChange({
  change,
  percentage,
  className,
  fixed = 2,
  suffix = '%',
  showIcon = true,
  size = 'sm',
}: PriceChangeProps) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const colorClass = isPositive
    ? 'text-green-400'
    : isNegative
      ? 'text-red-400'
      : 'text-neutral-400';

  const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;
  const displayValue =
    percentage !== undefined ? Math.abs(percentage) : Math.abs(change);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-mono tabular-nums',
        sizeClasses[size],
        colorClass,
        className,
      )}
    >
      {showIcon && !isNeutral && <Icon className={iconSizes[size]} />}
      {isPositive && !showIcon && '+'}
      {displayValue.toFixed(fixed)}
      {suffix}
    </span>
  );
}
