'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { AssetClass } from '@/domain/platform';
import { AssetClassCard } from './asset-class-card';

// =============================================================================
// TYPES
// =============================================================================

export interface ClassGridProps {
  /** Array of asset classes to display */
  classes: AssetClass[];
  /** Optional additional className */
  className?: string;
  /** Optional test ID for E2E testing */
  testId?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ClassGrid - Responsive grid of asset class cards
 *
 * Features:
 * - Responsive grid layout (2-4 columns)
 * - Memoized for performance
 * - Passes testId to children for E2E testing
 *
 * @example
 * ```tsx
 * <ClassGrid classes={assetClasses} />
 * ```
 */
export const ClassGrid = memo<ClassGridProps>(function ClassGrid({
  classes,
  className,
  testId,
}) {
  if (classes.length === 0) {
    return null;
  }

  return (
    <div
      data-testid={testId}
      className={cn(
        'grid gap-6',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {classes.map((assetClass) => (
        <AssetClassCard
          key={assetClass.name}
          assetClass={assetClass}
          testId={`class-card-${assetClass.name.toLowerCase().replace(/\s+/g, '-')}`}
        />
      ))}
    </div>
  );
});

export default ClassGrid;
