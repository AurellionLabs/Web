'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { GlowButton } from '@/app/components/ui/glow-button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Fallback UI to render when an error occurs */
  fallback?: ReactNode;
  /** Custom error handler */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Title for the default error UI */
  errorTitle?: string;
  /** Description for the default error UI */
  errorDescription?: string;
  /** Whether to show retry button */
  showRetry?: boolean;
  /** Additional className for the error container */
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ErrorBoundary - React error boundary with retry functionality
 *
 * Features:
 * - Catches JavaScript errors in child component tree
 * - Displays fallback UI with error information
 * - Optional retry functionality
 * - Error logging
 * - Glass-morphism styled error UI
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorBoundary>
 *   <TradingPage />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary
 *   fallback={<CustomErrorUI />}
 *   onError={(error) => logToService(error)}
 * >
 *   <TradingPage />
 * </ErrorBoundary>
 *
 * // With retry
 * <ErrorBoundary
 *   errorTitle="Trading Error"
 *   errorDescription="Something went wrong loading the trading interface."
 *   showRetry
 * >
 *   <TradingPage />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console with context
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const {
      children,
      fallback,
      errorTitle = 'Something went wrong',
      errorDescription = 'An unexpected error occurred. Please try again.',
      showRetry = true,
      className,
    } = this.props;

    if (this.state.hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center',
            'min-h-[400px] py-16 px-6',
            'bg-glass-bg backdrop-blur-md',
            'border border-glass-border rounded-xl',
            'text-center',
            className,
          )}
        >
          {/* Icon */}
          <div
            className={cn(
              'w-16 h-16 rounded-full',
              'flex items-center justify-center mb-4',
              'bg-trading-sell/10',
            )}
          >
            <AlertTriangle className="w-8 h-8 text-trading-sell" />
          </div>

          {/* Title */}
          <h3 className="text-xl font-display font-semibold text-foreground mb-2">
            {errorTitle}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground max-w-md mb-4">
            {errorDescription}
          </p>

          {/* Error details (development only) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div
              className={cn(
                'mt-4 p-4 rounded-lg',
                'bg-surface-overlay text-left',
                'max-w-lg w-full overflow-auto',
              )}
            >
              <p className="text-xs font-mono text-trading-sell mb-2">
                {this.state.error.name}: {this.state.error.message}
              </p>
              {this.state.error.stack && (
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                  {this.state.error.stack.split('\n').slice(1, 5).join('\n')}
                </pre>
              )}
            </div>
          )}

          {/* Retry button */}
          {showRetry && (
            <GlowButton
              variant="secondary"
              onClick={this.handleRetry}
              className="mt-6"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </GlowButton>
          )}
        </div>
      );
    }

    return children;
  }
}

// =============================================================================
// TRADING-SPECIFIC ERROR BOUNDARY
// =============================================================================

export interface TradingErrorBoundaryProps {
  children: ReactNode;
  className?: string;
}

/**
 * TradingErrorBoundary - Pre-configured error boundary for trading pages
 */
export function TradingErrorBoundary({
  children,
  className,
}: TradingErrorBoundaryProps): ReactNode {
  return (
    <ErrorBoundary
      errorTitle="Trading Error"
      errorDescription="Something went wrong with the trading interface. Please try refreshing the page."
      showRetry
      className={className}
      onError={(error) => {
        console.error('[Trading] Error caught by boundary:', error.message);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
