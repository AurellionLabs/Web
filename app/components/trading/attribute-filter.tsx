'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../ui/glass-card';
import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useAttributeFilters,
  FilterableAttribute,
  FilterValue,
  FilterState,
} from '@/hooks/useAttributeFilters';

/**
 * Props for the AttributeFilter component
 */
export interface AttributeFilterProps {
  /** Current asset class */
  assetClass: string;
  /** Current filter state */
  filters: FilterState;
  /** Callback when filters change */
  onFilterChange: (filters: FilterState) => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * RangeFilter - Slider for numeric range filtering
 */
interface RangeFilterProps {
  attribute: FilterableAttribute;
  value?: [number, number];
  onChange: (value: [number, number]) => void;
}

const RangeFilter: React.FC<RangeFilterProps> = ({
  attribute,
  value,
  onChange,
}) => {
  const min = attribute.min ?? 0;
  const max = attribute.max ?? 100;
  const currentMin = value?.[0] ?? min;
  const currentMax = value?.[1] ?? max;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {currentMin}
          {attribute.unit && ` ${attribute.unit}`}
        </span>
        <span>
          {currentMax}
          {attribute.unit && ` ${attribute.unit}`}
        </span>
      </div>
      <div className="relative h-2">
        {/* Track */}
        <div className="absolute inset-0 bg-surface-overlay rounded-full" />
        {/* Active range */}
        <div
          className="absolute h-full bg-accent rounded-full"
          style={{
            left: `${((currentMin - min) / (max - min)) * 100}%`,
            right: `${100 - ((currentMax - min) / (max - min)) * 100}%`,
          }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={currentMin}
          onChange={(e) => {
            const newMin = Math.min(Number(e.target.value), currentMax - 1);
            onChange([newMin, currentMax]);
          }}
          className="absolute w-full h-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface-base [&::-webkit-slider-thumb]:cursor-pointer"
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={currentMax}
          onChange={(e) => {
            const newMax = Math.max(Number(e.target.value), currentMin + 1);
            onChange([currentMin, newMax]);
          }}
          className="absolute w-full h-2 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface-base [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );
};

/**
 * SelectFilter - Dropdown for single selection
 */
interface SelectFilterProps {
  attribute: FilterableAttribute;
  value?: string;
  onChange: (value: string) => void;
}

const SelectFilter: React.FC<SelectFilterProps> = ({
  attribute,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm',
          'bg-surface-overlay border border-glass-border',
          'hover:border-accent/30 transition-colors',
          value && 'border-accent/30',
        )}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value || 'Select...'}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 py-1 bg-surface-overlay border border-glass-border rounded-lg shadow-lg">
          {attribute.options?.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-glass-hover transition-colors',
                value === option && 'text-accent bg-accent/10',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * MultiSelectFilter - Checkbox list for multiple selection
 */
interface MultiSelectFilterProps {
  attribute: FilterableAttribute;
  value?: string[];
  onChange: (value: string[]) => void;
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  attribute,
  value = [],
  onChange,
}) => {
  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {attribute.options?.map((option) => (
        <label
          key={option}
          className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors"
        >
          <input
            type="checkbox"
            checked={value.includes(option)}
            onChange={() => toggleOption(option)}
            className="w-4 h-4 rounded border-glass-border bg-surface-overlay text-accent focus:ring-accent/50"
          />
          <span className="text-sm text-muted-foreground">{option}</span>
        </label>
      ))}
    </div>
  );
};

/**
 * BooleanFilter - Toggle switch
 */
interface BooleanFilterProps {
  attribute: FilterableAttribute;
  value?: boolean;
  onChange: (value: boolean) => void;
}

const BooleanFilter: React.FC<BooleanFilterProps> = ({
  attribute,
  value,
  onChange,
}) => {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-12 h-6 rounded-full transition-colors',
        value ? 'bg-accent' : 'bg-surface-overlay',
      )}
    >
      <span
        className={cn(
          'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
          value && 'translate-x-6',
        )}
      />
    </button>
  );
};

/**
 * FilterItem - Individual filter control wrapper
 */
interface FilterItemProps {
  attribute: FilterableAttribute;
  value?: FilterValue;
  onChange: (value: FilterValue) => void;
  onClear: () => void;
  isActive: boolean;
}

const FilterItem: React.FC<FilterItemProps> = ({
  attribute,
  value,
  onChange,
  onClear,
  isActive,
}) => {
  const [isExpanded, setIsExpanded] = useState(isActive);

  return (
    <div className="border-b border-glass-border last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 text-sm font-medium hover:text-foreground transition-colors"
      >
        <span className={isActive ? 'text-accent' : 'text-muted-foreground'}>
          {attribute.name}
        </span>
        <div className="flex items-center gap-2">
          {isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 hover:bg-glass-hover rounded"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="pb-4">
          {attribute.type === 'range' && (
            <RangeFilter
              attribute={attribute}
              value={value?.range}
              onChange={(range) => onChange({ range })}
            />
          )}
          {attribute.type === 'select' && (
            <SelectFilter
              attribute={attribute}
              value={value?.selected}
              onChange={(selected) => onChange({ selected })}
            />
          )}
          {attribute.type === 'multiSelect' && (
            <MultiSelectFilter
              attribute={attribute}
              value={value?.multiSelected}
              onChange={(multiSelected) => onChange({ multiSelected })}
            />
          )}
          {attribute.type === 'boolean' && (
            <BooleanFilter
              attribute={attribute}
              value={value?.enabled}
              onChange={(enabled) => onChange({ enabled })}
            />
          )}
        </div>
      )}
    </div>
  );
};

/**
 * ActiveFilterChips - Display active filters as removable chips
 */
interface ActiveFilterChipsProps {
  chips: Array<{ id: string; name: string; value: string }>;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  chips,
  onRemove,
  onClearAll,
}) => {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 text-accent text-xs"
        >
          <span className="font-medium">{chip.name}:</span>
          <span>{chip.value}</span>
          <button
            onClick={() => onRemove(chip.id)}
            className="p-0.5 hover:bg-accent/20 rounded-full"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Clear all
      </button>
    </div>
  );
};

/**
 * AttributeFilter - Dynamic filter panel based on asset class
 *
 * Features:
 * - Dynamic filter generation based on asset class attributes
 * - Range sliders for numeric attributes
 * - Multi-select for categorical attributes
 * - Clear filters button
 * - Active filter chips display
 *
 * @example
 * ```tsx
 * <AttributeFilter
 *   assetClass="commodities"
 *   filters={filters}
 *   onFilterChange={setFilters}
 * />
 * ```
 */
export const AttributeFilter: React.FC<AttributeFilterProps> = ({
  assetClass,
  filters,
  onFilterChange,
  className,
}) => {
  const {
    attributes,
    setFilter,
    clearFilter,
    clearAllFilters,
    activeFilterChips,
    isFilterActive,
    getFilterValue,
  } = useAttributeFilters(assetClass, {
    initialFilters: filters,
    onFilterChange,
  });

  return (
    <GlassCard className={cn('', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        </div>
        {activeFilterChips.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {activeFilterChips.length} active
          </span>
        )}
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips
        chips={activeFilterChips}
        onRemove={clearFilter}
        onClearAll={clearAllFilters}
      />

      {/* Filter controls */}
      <div className="space-y-0">
        {attributes.map((attribute) => (
          <FilterItem
            key={attribute.id}
            attribute={attribute}
            value={getFilterValue(attribute.id)}
            onChange={(value) => setFilter(attribute.id, value)}
            onClear={() => clearFilter(attribute.id)}
            isActive={isFilterActive(attribute.id)}
          />
        ))}
      </div>

      {attributes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No filters available for this asset class
        </p>
      )}
    </GlassCard>
  );
};

export default AttributeFilter;
