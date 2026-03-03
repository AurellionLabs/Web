'use client';

import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import React from 'react';

interface PriceChangeProps {
  change?: number;
  value?: number; // Alias for change
  percentage?: number;
  className?: string;
  fixed?: number;
  suffix?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceChange({
  change,
  value,
  percentage,
  className,
  fixed = 2,
  suffix = '%',
  showIcon = true,
  size = 'sm',
}: PriceChangeProps) {
  // Support both 'change' and 'value' props
  const changeValue = change ?? value ?? 0;
  const isPositive = changeValue > 0;
  const isNegative = changeValue < 0;
  const isNeutral = changeValue === 0;

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
      : 'text-white/80';

  const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;
  const displayValue =
    percentage !== undefined ? Math.abs(percentage) : Math.abs(changeValue);

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
