# Error Handling in Indexer Handlers

## Overview

All handlers now include comprehensive error handling to prevent silent failures. When handlers are missing or fail, errors are logged clearly instead of failing silently.

## Error Handling Features

### 1. Try-Catch Blocks

All event handlers are wrapped in try-catch blocks that:

- Log errors with full context (event name, parameters, stack trace)
- Re-throw errors so Ponder can retry
- Prevent silent failures

### 2. Missing Data Warnings

Handlers log warnings when expected data is not available:

- `[orders] ⚠️  Order created with minimal data. Missing: token, tokenId, location data...`
- Frontend queries requiring missing fields will return incomplete data

### 3. Startup Validation

On indexer startup:

- Validates that all expected handlers are loaded
- Logs error if handler count doesn't match expected count
- Lists all loaded handlers for verification

### 4. Handler Tracking

- Tracks which events have handlers
- Can identify events that are emitted but not handled
- Logs warnings for unexpected events

## Error Messages

### Handler Missing

```
[validation] ❌ ERROR: Event "EventName" was emitted but not handled!
Expected handler: handler-file.ts.
This will cause silent failures in frontend queries.
```

### Handler Error

```
[handler-name] ❌ ERROR handling EventName event for [id]: [error message]
[handler-name] Stack trace: [full stack trace]
```

### Missing Data Warning

```
[handler-name] ⚠️  [Entity] created with minimal data.
Missing: [field1], [field2], [field3].
Frontend queries requiring these fields may return incomplete data.
```

## Best Practices

1. **Always wrap handlers in try-catch** - Prevents silent failures
2. **Log warnings for missing data** - Helps identify incomplete records
3. **Re-throw errors** - Allows Ponder to retry failed events
4. **Use descriptive error messages** - Include event name and relevant IDs
5. **Validate on startup** - Catch missing handlers before events are processed

## Monitoring

Monitor indexer logs for:

- `❌ ERROR` - Handler failures that need attention
- `⚠️  WARNING` - Missing data that may affect frontend queries
- `[validation]` - Handler validation messages

## Example Error Flow

1. Event emitted: `Diamond:OrderCreated`
2. Handler catches event
3. Handler tries to read contract data
4. Contract read fails → Warning logged
5. Handler creates order with minimal data → Warning logged
6. Frontend queries order → Returns incomplete data
7. Frontend logs show missing fields

This is better than silent failure because:

- ✅ We know the handler is working
- ✅ We know what data is missing
- ✅ We can fix the data source or update the handler
- ✅ Frontend can handle incomplete data gracefully
