'use client';

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface TradingSearchProps {
  /** Placeholder text */
  placeholder?: string;
  /** Current search value */
  value: string;
  /** Called when search value changes (debounced) */
  onChange: (value: string) => void;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Additional className */
  className?: string;
  /** Test ID for E2E */
  testId?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * TradingSearch - Debounced search input for trading pages
 *
 * Features:
 * - Debounced onChange for performance
 * - Clear button
 * - Glass-morphism styling
 * - Focus ring on interaction
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 *
 * <TradingSearch
 *   placeholder="Search asset classes..."
 *   value={query}
 *   onChange={setQuery}
 *   debounceMs={300}
 * />
 * ```
 */
export const TradingSearch = memo<TradingSearchProps>(function TradingSearch({
  placeholder = 'Search...',
  value,
  onChange,
  debounceMs = 300,
  className,
  testId,
  autoFocus = false,
}) {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle input change with debounce
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs],
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('relative', className)} data-testid={testId}>
      {/* Search icon */}
      <Search
        className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2',
          'w-5 h-5 text-muted-foreground',
          'pointer-events-none',
        )}
      />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'w-full pl-12 pr-10 py-3',
          'bg-glass-bg backdrop-blur-md',
          'border border-glass-border rounded-xl',
          'text-foreground placeholder:text-muted-foreground',
          'transition-all duration-200',
          'focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20',
          'hover:border-glass-border-hover',
        )}
      />

      {/* Clear button */}
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2',
            'p-1 rounded-md',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-muted/20',
            'transition-colors',
          )}
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

export default TradingSearch;
