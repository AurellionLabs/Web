'use client';

import React, { memo, useMemo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Asset } from '@/domain/shared';
import { FilterState, FilterValue } from '@/hooks/useAttributeFilters';
import { Filter, ChevronDown, ChevronUp, X, RotateCcw } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface AttributeFilterPanelProps {
  /** Assets to derive attributes from */
  assets: Asset[];
  /** Current filter state */
  filters: FilterState;
  /** Called when filters change */
  onFiltersChange: (filters: FilterState) => void;
  /** Additional className */
  className?: string;
  /** Test ID for E2E */
  testId?: string;
}

interface ExtractedAttribute {
  name: string;
  type: 'select' | 'range' | 'boolean';
  values: string[];
  min?: number;
  max?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract unique attributes from assets
 */
function extractAttributesFromAssets(assets: Asset[]): ExtractedAttribute[] {
  const attributeMap = new Map<
    string,
    { values: Set<string>; numericValues: number[] }
  >();

  assets.forEach((asset) => {
    if (!asset.attributes) return;

    asset.attributes.forEach((attr) => {
      if (!attr.name) return;

      const existing = attributeMap.get(attr.name) || {
        values: new Set<string>(),
        numericValues: [],
      };

      // Add all values
      attr.values.forEach((v) => {
        existing.values.add(v);
        const num = parseFloat(v);
        if (!isNaN(num)) {
          existing.numericValues.push(num);
        }
      });

      attributeMap.set(attr.name, existing);
    });
  });

  // Convert to ExtractedAttribute array
  return Array.from(attributeMap.entries()).map(([name, data]) => {
    const values = Array.from(data.values);
    const isNumeric =
      data.numericValues.length > 0 &&
      data.numericValues.length === values.length;
    const isBoolean =
      values.length === 2 &&
      values.every((v) =>
        ['true', 'false', 'yes', 'no', '0', '1'].includes(v.toLowerCase()),
      );

    if (isNumeric && data.numericValues.length > 2) {
      return {
        name,
        type: 'range' as const,
        values,
        min: Math.min(...data.numericValues),
        max: Math.max(...data.numericValues),
      };
    }

    if (isBoolean) {
      return {
        name,
        type: 'boolean' as const,
        values,
      };
    }

    return {
      name,
      type: 'select' as const,
      values: values.sort(),
    };
  });
}

// =============================================================================
// FILTER SECTION COMPONENT
// =============================================================================

interface FilterSectionProps {
  attribute: ExtractedAttribute;
  value: FilterValue | undefined;
  onChange: (value: FilterValue | null) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const FilterSection = memo<FilterSectionProps>(function FilterSection({
  attribute,
  value,
  onChange,
  isExpanded,
  onToggle,
}) {
  const hasValue = value !== undefined;

  return (
    <div className="border-b border-glass-border last:border-0">
      {/* Section header */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full px-4 py-3',
          'flex items-center justify-between',
          'text-sm font-medium',
          'hover:bg-surface-overlay/30 transition-colors',
          hasValue ? 'text-accent' : 'text-foreground',
        )}
      >
        <span className="capitalize">{attribute.name}</span>
        <div className="flex items-center gap-2">
          {hasValue && <span className="w-2 h-2 rounded-full bg-accent" />}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Section content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {attribute.type === 'select' && (
            <div className="space-y-1">
              {attribute.values.map((v) => {
                const isSelected = value?.selected === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      onChange(isSelected ? null : { selected: v })
                    }
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left text-sm',
                      'transition-colors',
                      isSelected
                        ? 'bg-accent/20 text-accent'
                        : 'hover:bg-surface-overlay/50 text-foreground',
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          )}

          {attribute.type === 'range' && attribute.min !== undefined && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="number"
                  placeholder="Min"
                  value={value?.range?.[0] ?? ''}
                  onChange={(e) => {
                    const min = e.target.value
                      ? parseFloat(e.target.value)
                      : attribute.min!;
                    const max = value?.range?.[1] ?? attribute.max!;
                    onChange({ range: [min, max] });
                  }}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg',
                    'bg-surface-overlay border border-glass-border',
                    'text-foreground text-sm',
                    'focus:outline-none focus:border-accent/50',
                  )}
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={value?.range?.[1] ?? ''}
                  onChange={(e) => {
                    const min = value?.range?.[0] ?? attribute.min!;
                    const max = e.target.value
                      ? parseFloat(e.target.value)
                      : attribute.max!;
                    onChange({ range: [min, max] });
                  }}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg',
                    'bg-surface-overlay border border-glass-border',
                    'text-foreground text-sm',
                    'focus:outline-none focus:border-accent/50',
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Range: {attribute.min} - {attribute.max}
              </p>
            </div>
          )}

          {attribute.type === 'boolean' && (
            <div className="flex gap-2">
              {[true, false].map((bool) => {
                const isSelected = value?.enabled === bool;
                return (
                  <button
                    key={String(bool)}
                    type="button"
                    onClick={() =>
                      onChange(isSelected ? null : { enabled: bool })
                    }
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm',
                      'transition-colors',
                      isSelected
                        ? 'bg-accent/20 text-accent'
                        : 'bg-surface-overlay hover:bg-surface-overlay/70 text-foreground',
                    )}
                  >
                    {bool ? 'Yes' : 'No'}
                  </button>
                );
              })}
            </div>
          )}

          {/* Clear button */}
          {hasValue && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className={cn(
                'mt-2 w-full py-1.5 rounded-lg',
                'text-xs text-muted-foreground',
                'hover:text-foreground hover:bg-surface-overlay/50',
                'transition-colors flex items-center justify-center gap-1',
              )}
            >
              <X className="w-3 h-3" />
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * AttributeFilterPanel - Dynamic attribute filter panel for assets
 *
 * Features:
 * - Extracts attributes from asset list dynamically
 * - Supports select, range, and boolean filter types
 * - Collapsible filter sections
 * - Clear individual and all filters
 *
 * @example
 * ```tsx
 * <AttributeFilterPanel
 *   assets={classAssets}
 *   filters={filters}
 *   onFiltersChange={setFilters}
 * />
 * ```
 */
export const AttributeFilterPanel = memo<AttributeFilterPanelProps>(
  function AttributeFilterPanel({
    assets,
    filters,
    onFiltersChange,
    className,
    testId,
  }) {
    // State for expanded sections
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
      new Set(),
    );

    // Extract attributes from assets
    const attributes = useMemo(
      () => extractAttributesFromAssets(assets),
      [assets],
    );

    // Count active filters
    const activeFilterCount = Object.keys(filters).length;

    // Handle section toggle
    const handleToggleSection = useCallback((name: string) => {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
        } else {
          next.add(name);
        }
        return next;
      });
    }, []);

    // Handle filter change
    const handleFilterChange = useCallback(
      (attrName: string, value: FilterValue | null) => {
        const newFilters = { ...filters };
        if (value === null) {
          delete newFilters[attrName];
        } else {
          newFilters[attrName] = value;
        }
        onFiltersChange(newFilters);
      },
      [filters, onFiltersChange],
    );

    // Handle clear all
    const handleClearAll = useCallback(() => {
      onFiltersChange({});
    }, [onFiltersChange]);

    if (attributes.length === 0) {
      return (
        <div
          className={cn(
            'p-4 rounded-xl',
            'bg-glass-bg border border-glass-border',
            'text-center text-muted-foreground text-sm',
            className,
          )}
        >
          No filterable attributes found
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs">
                  {activeFilterCount}
                </span>
              )}
            </h3>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className={cn(
                  'text-xs text-muted-foreground',
                  'hover:text-foreground transition-colors',
                  'flex items-center gap-1',
                )}
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter sections */}
        <div className="max-h-[500px] overflow-y-auto">
          {attributes.map((attr) => (
            <FilterSection
              key={attr.name}
              attribute={attr}
              value={filters[attr.name]}
              onChange={(value) => handleFilterChange(attr.name, value)}
              isExpanded={expandedSections.has(attr.name)}
              onToggle={() => handleToggleSection(attr.name)}
            />
          ))}
        </div>
      </div>
    );
  },
);

export default AttributeFilterPanel;
