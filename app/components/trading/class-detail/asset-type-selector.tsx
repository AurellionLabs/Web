'use client';

import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Asset } from '@/domain/shared';
import { Check, ChevronDown, Package } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface AssetTypeSelectorProps {
  /** Array of assets to derive types from */
  assets: Asset[];
  /** Currently selected asset type (name) */
  selectedType: string | null;
  /** Called when an asset type is selected */
  onSelect: (type: string | null) => void;
  /** Whether selector is disabled */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Test ID for E2E */
  testId?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get unique asset types with counts from assets array
 */
function getAssetTypesWithCounts(assets: Asset[]): Array<{
  name: string;
  count: number;
}> {
  const countMap = new Map<string, number>();

  assets.forEach((asset) => {
    const count = countMap.get(asset.name) || 0;
    countMap.set(asset.name, count + 1);
  });

  return Array.from(countMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * AssetTypeSelector - Dropdown/list selector for asset types within a class
 *
 * Features:
 * - Displays unique asset types (names) from the asset list
 * - Shows count of assets per type
 * - Keyboard accessible
 * - Glass-morphism styling
 *
 * @example
 * ```tsx
 * <AssetTypeSelector
 *   assets={classAssets}
 *   selectedType={selectedType}
 *   onSelect={setSelectedType}
 * />
 * ```
 */
export const AssetTypeSelector = memo<AssetTypeSelectorProps>(
  function AssetTypeSelector({
    assets,
    selectedType,
    onSelect,
    disabled = false,
    className,
    testId,
  }) {
    const assetTypes = getAssetTypesWithCounts(assets);

    // Handle type selection
    const handleSelect = useCallback(
      (type: string) => {
        if (disabled) return;
        // Toggle off if already selected
        onSelect(selectedType === type ? null : type);
      },
      [disabled, selectedType, onSelect],
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent, type: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect(type);
        }
      },
      [handleSelect],
    );

    if (assetTypes.length === 0) {
      return (
        <div
          className={cn(
            'p-4 rounded-xl',
            'bg-glass-bg border border-glass-border',
            'text-center text-muted-foreground text-sm',
            className,
          )}
        >
          No asset types available
        </div>
      );
    }

    return (
      <div
        data-testid={testId}
        className={cn(
          'bg-glass-bg backdrop-blur-md',
          'border border-glass-border rounded-xl',
          'overflow-hidden',
          className,
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-glass-border bg-surface-overlay/50">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Package className="w-4 h-4" />
            Asset Types
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select an asset type to view trading data
          </p>
        </div>

        {/* Type list */}
        <div className="max-h-[400px] overflow-y-auto">
          {assetTypes.map(({ name, count }) => {
            const isSelected = selectedType === name;

            return (
              <button
                key={name}
                type="button"
                onClick={() => handleSelect(name)}
                onKeyDown={(e) => handleKeyDown(e, name)}
                disabled={disabled}
                className={cn(
                  'w-full px-4 py-3',
                  'flex items-center justify-between',
                  'text-left transition-colors',
                  'border-b border-glass-border last:border-0',
                  'focus:outline-none focus:bg-accent/5',
                  isSelected
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-surface-overlay/50',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Selection indicator */}
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      'transition-colors',
                      isSelected
                        ? 'border-accent bg-accent'
                        : 'border-muted-foreground/30',
                    )}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-background" />
                    )}
                  </div>

                  {/* Type name */}
                  <span className="font-medium">{name}</span>
                </div>

                {/* Count badge */}
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs',
                    'bg-surface-overlay',
                    isSelected ? 'text-accent' : 'text-muted-foreground',
                  )}
                >
                  {count} {count === 1 ? 'asset' : 'assets'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Clear selection button */}
        {selectedType && (
          <div className="px-4 py-3 border-t border-glass-border">
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={cn(
                'w-full py-2 px-4 rounded-lg',
                'text-sm text-muted-foreground',
                'hover:text-foreground hover:bg-surface-overlay/50',
                'transition-colors',
              )}
            >
              Clear selection
            </button>
          </div>
        )}
      </div>
    );
  },
);

export default AssetTypeSelector;
