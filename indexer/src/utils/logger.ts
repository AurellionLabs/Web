/**
 * Structured Logger for Ponder Indexer Handlers
 *
 * Provides consistent logging across all handlers with structured output.
 * Supports different log levels and includes context information.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  handler: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Create a logger instance for a specific handler domain
 */
export function createLogger(handler: string) {
  const formatEntry = (entry: LogEntry): string => {
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    const errorStr = entry.error
      ? ` Error: ${entry.error.name} - ${entry.error.message}`
      : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${handler}] ${entry.message}${dataStr}${errorStr}`;
  };

  return {
    /**
     * Log informational messages
     */
    info: (message: string, data?: Record<string, unknown>) => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        handler,
        message,
        data,
      };
      console.log(formatEntry(entry));
    },

    /**
     * Log warnings - something unexpected but not critical
     */
    warn: (message: string, data?: Record<string, unknown>) => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'warn',
        handler,
        message,
        data,
      };
      console.warn(formatEntry(entry));
    },

    /**
     * Log errors - something failed and needs attention
     */
    error: (message: string, error: unknown) => {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        handler,
        message,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : { name: 'Unknown', message: String(error) },
      };
      console.error(formatEntry(entry));
    },

    /**
     * Log debug messages - detailed information for debugging
     */
    debug: (message: string, data?: Record<string, unknown>) => {
      if (process.env.NODE_ENV === 'development') {
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level: 'debug',
          handler,
          message,
          data,
        };
        console.debug(formatEntry(entry));
      }
    },
  };
}

/**
 * Helper to log event processing start
 */
export function logEventStart(
  logger: ReturnType<typeof createLogger>,
  eventName: string,
  eventId: string,
) {
  logger.debug(`Processing ${eventName}`, { eventId });
}

/**
 * Helper to log event processing completion
 */
export function logEventComplete(
  logger: ReturnType<typeof createLogger>,
  eventName: string,
  eventId: string,
) {
  logger.debug(`Completed ${eventName}`, { eventId });
}

/**
 * Helper to log entity creation
 */
export function logEntityCreate(
  logger: ReturnType<typeof createLogger>,
  entityType: string,
  entityId: string,
) {
  logger.info(`Created ${entityType}`, { id: entityId });
}

/**
 * Helper to log entity update
 */
export function logEntityUpdate(
  logger: ReturnType<typeof createLogger>,
  entityType: string,
  entityId: string,
  changes?: Record<string, unknown>,
) {
  logger.info(`Updated ${entityType}`, { id: entityId, changes });
}
