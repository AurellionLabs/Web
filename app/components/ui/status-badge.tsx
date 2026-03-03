'use client';

import { cn } from '@/lib/utils';
import React from 'react';

interface StatusBadgeProps {
  status:
    | 'live'
    | 'connected'
    | 'disconnected'
    | 'warning'
    | 'pending'
    | 'success'
    | 'error'
    | 'info'
    | 'neutral'
    | 'Live'
    | 'Connected'
    | 'Disconnected'
    | 'Warning'
    | 'Pending'
    | 'Success'
    | 'Error'
    | 'Info'
    | 'Neutral';
  label?: string;
  className?: string;
  pulse?: boolean;
  showPulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  string,
  {
    text: string;
    bgColor: string;
    textColor: string;
    dotColor: string;
    pulseColor: string;
  }
> = {
  live: {
    text: 'Live',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    dotColor: 'bg-green-500',
    pulseColor: 'bg-green-400',
  },
  connected: {
    text: 'Connected',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    dotColor: 'bg-green-500',
    pulseColor: 'bg-green-400',
  },
  disconnected: {
    text: 'Disconnected',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
    pulseColor: 'bg-red-400',
  },
  warning: {
    text: 'Warning',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-500',
    pulseColor: 'bg-amber-400',
  },
  pending: {
    text: 'Pending',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-500',
    pulseColor: 'bg-amber-400',
  },
  success: {
    text: 'Success',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    dotColor: 'bg-green-500',
    pulseColor: 'bg-green-400',
  },
  error: {
    text: 'Error',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
    pulseColor: 'bg-red-400',
  },
  info: {
    text: 'Info',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    dotColor: 'bg-blue-500',
    pulseColor: 'bg-blue-400',
  },
  neutral: {
    text: 'Neutral',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-white/80',
    dotColor: 'bg-gray-500',
    pulseColor: 'bg-gray-400',
  },
  // Uppercase variants for backwards compatibility
  Live: {
    text: 'Live',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    dotColor: 'bg-green-500',
    pulseColor: 'bg-green-400',
  },
  Connected: {
    text: 'Connected',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    dotColor: 'bg-green-500',
    pulseColor: 'bg-green-400',
  },
  Disconnected: {
    text: 'Disconnected',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
    pulseColor: 'bg-red-400',
  },
  Warning: {
    text: 'Warning',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-500',
    pulseColor: 'bg-amber-400',
  },
  Pending: {
    text: 'Pending',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-500',
    pulseColor: 'bg-amber-400',
  },
  Success: {
    text: 'Success',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    dotColor: 'bg-green-500',
    pulseColor: 'bg-green-400',
  },
  Error: {
    text: 'Error',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
    pulseColor: 'bg-red-400',
  },
  Info: {
    text: 'Info',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    dotColor: 'bg-blue-500',
    pulseColor: 'bg-blue-400',
  },
  Neutral: {
    text: 'Neutral',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-white/80',
    dotColor: 'bg-gray-500',
    pulseColor: 'bg-gray-400',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
};

export function StatusBadge({
  status,
  label,
  className,
  pulse = true,
  showPulse,
  size = 'md',
}: StatusBadgeProps) {
  // Normalize status to lowercase for lookup
  const normalizedStatus = status.toLowerCase();
  const config =
    statusConfig[normalizedStatus] ||
    statusConfig[status] ||
    statusConfig.neutral;
  const shouldPulse = showPulse !== undefined ? showPulse : pulse;
  const displayText = label || config.text;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full font-medium',
        sizeClasses[size],
        config.bgColor,
        config.textColor,
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        {shouldPulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              config.pulseColor,
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            config.dotColor,
          )}
        />
      </span>
      {displayText}
    </span>
  );
}
