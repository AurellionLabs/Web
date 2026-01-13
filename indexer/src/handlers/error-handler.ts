/**
 * Error Handler Wrapper
 *
 * Wraps event handlers to catch and log errors instead of failing silently.
 * This helps identify when handlers are missing or broken.
 */

import { ponder } from '@/generated';
import { trackEventHandled, logMissingHandler } from './validation';

/**
 * Wrap an event handler to add error handling and validation
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  eventName: string,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      // Track that this event is being handled
      trackEventHandled(eventName);

      // Call the original handler
      await handler(...args);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error(`[error-handler] ❌ ERROR in handler for "${eventName}":`, {
        error: errorMessage,
        stack: errorStack,
        eventName,
      });

      // Re-throw to let Ponder handle it (it will retry)
      throw error;
    }
  }) as T;
}

/**
 * Create a placeholder handler that logs a warning
 * Use this for events that should have handlers but don't yet
 */
export function createPlaceholderHandler(eventName: string) {
  return async (...args: any[]) => {
    logMissingHandler(eventName);
    console.warn(
      `[error-handler] ⚠️  Placeholder handler called for "${eventName}". ` +
        `No data will be indexed. Frontend queries will return empty results.`,
    );
  };
}
