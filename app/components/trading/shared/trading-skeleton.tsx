'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// BASE SKELETON
// =============================================================================

export interface SkeletonProps {
  className?: string;
}

export const Skeleton = memo<SkeletonProps>(function Skeleton({ className }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted/50', className)} />
  );
});

// =============================================================================
// CLASS CARD SKELETON
// =============================================================================

export interface ClassCardSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader for AssetClassCard
 */
export const ClassCardSkeleton = memo<ClassCardSkeletonProps>(
  function ClassCardSkeleton({ className }) {
    return (
      <div
        className={cn(
          'bg-glass-bg backdrop-blur-md',
          'border border-glass-border',
          'rounded-xl p-6',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="w-14 h-14 rounded-xl" />
          <Skeleton className="w-16 h-6 rounded-full" />
        </div>

        {/* Name */}
        <Skeleton className="h-7 w-32 mb-3" />

        {/* Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    );
  },
);

// =============================================================================
// CLASS GRID SKELETON
// =============================================================================

export interface ClassGridSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number;
  className?: string;
}

/**
 * Skeleton loader for ClassGrid
 */
export const ClassGridSkeleton = memo<ClassGridSkeletonProps>(
  function ClassGridSkeleton({ count = 8, className }) {
    return (
      <div
        className={cn(
          'grid gap-6',
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          className,
        )}
      >
        {Array.from({ length: count }).map((_, i) => (
          <ClassCardSkeleton key={i} />
        ))}
      </div>
    );
  },
);

// =============================================================================
// ASSET TABLE SKELETON
// =============================================================================

export interface AssetTableSkeletonProps {
  /** Number of rows to show */
  rows?: number;
  className?: string;
}

/**
 * Skeleton loader for asset table
 */
export const AssetTableSkeleton = memo<AssetTableSkeletonProps>(
  function AssetTableSkeleton({ rows = 5, className }) {
    return (
      <div
        className={cn(
          'bg-glass-bg backdrop-blur-md',
          'border border-glass-border',
          'rounded-xl overflow-hidden',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-glass-border bg-surface-overlay/50">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b border-glass-border last:border-0"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
    );
  },
);

// =============================================================================
// CHART SKELETON
// =============================================================================

export interface ChartSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader for price chart
 */
export const ChartSkeleton = memo<ChartSkeletonProps>(function ChartSkeleton({
  className,
}) {
  return (
    <div
      className={cn(
        'bg-glass-bg backdrop-blur-md',
        'border border-glass-border',
        'rounded-xl p-6',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-10 rounded-md" />
          ))}
        </div>
      </div>

      {/* Chart area */}
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  );
});

export default Skeleton;
