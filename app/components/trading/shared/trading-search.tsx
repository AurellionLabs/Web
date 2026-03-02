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
 * - EVA design system styling with sharp corners and clip-path
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
    <div className={cn('relative group', className)} data-testid={testId}>
      {/* Left accent bar */}
      <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-gold/20 group-focus-within:bg-gold/60 transition-colors z-10" />

      {/* Search icon */}
      <Search
        className={cn(
          'absolute left-5 top-1/2 -translate-y-1/2',
          'w-5 h-5 text-foreground/35',
          'pointer-events-none z-10',
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
          'w-full pl-13 pr-10 py-3',
          'bg-background/80',
          'border border-border/40',
          'font-mono text-sm tracking-[0.05em] uppercase',
          'text-foreground/80 placeholder:text-foreground/25',
          'transition-all duration-200',
          'focus:outline-none focus:border-gold/50',
        )}
        style={{
          clipPath:
            'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        }}
      />

      {/* Clear button */}
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 z-10',
            'p-1',
            'text-foreground/35 hover:text-gold',
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
