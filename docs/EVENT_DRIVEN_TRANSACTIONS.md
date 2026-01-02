# Event-Driven Transaction Handling

## Overview

All transactions use a generalized event-driven wrapper that automatically waits for indexed results via the Ponder indexer. This eliminates RPC rate limiting issues and standardizes transaction handling across the entire codebase.

## Why Event-Driven?

### Problems with `tx.wait()`
- **Rate Limiting**: RPC providers (like Infura) have rate limits that cause "Too Many Requests" errors
- **Inefficient**: Polling RPC providers is slow and expensive
- **Not Scalable**: Each transaction wait creates additional RPC load

### Benefits of Indexer Polling
- ✅ **No Rate Limits**: Indexer database queries are fast and unlimited
- ✅ **Faster**: Indexer is optimized for reads (PostgreSQL queries are milliseconds)
- ✅ **Event-Driven**: Aligns with your architecture (indexer already tracks all events)
- ✅ **Better UX**: Can show progress based on indexed state
- ✅ **Resilient**: Works even if RPC provider is temporarily unavailable
- ✅ **Standardized**: Single wrapper function for all transactions

## How It Works

The `sendContractTxAndWaitForIndexer()` wrapper:

1. **Sends Transaction** (via `sendContractTxWithReadEstimation` which always skips wait)
2. **Automatically Waits** for the indexed event/entity using metadata registry
3. **Returns Result** (extracted value or just confirmation)

## Implementation

### Generalized Wrapper

**File**: `infrastructure/shared/tx-with-indexer-wait.ts`

All transactions use a single wrapper function:

```typescript
const { result: nodeAddress } = await sendContractTxAndWaitForIndexer<string>(
  contract,
  'registerNode',
  [nodeData],
  'AurumNodeManager.registerNode', // Metadata key from registry
  { from: ownerAddress, gasHeadroomRatio: 1.2 },
);
```

### Metadata Registry

Transaction metadata is centralized in `TRANSACTION_METADATA`:

```typescript
{
  'AurumNodeManager.registerNode': {
    eventTable: 'node_registered_events',
    eventIdColumn: 'node_address',
    entityTable: 'nodes',
    entityIdColumn: 'id',
    // ... fallback query configuration
  },
  'Ausys.orderCreation': {
    eventTable: 'order_created_events',
    eventIdColumn: 'order_id',
    // ...
  },
  // ... more entries
}
```

### Examples

**Node Registration:**
```typescript
// Before (RPC Polling):
const tx = await contract.registerNode(nodeData);
const receipt = await tx.wait(); // ❌ Polls RPC
const event = parseEventFromReceipt(receipt);
return event.nodeAddress;

// After (Event-Driven):
const { result: nodeAddress } = await sendContractTxAndWaitForIndexer<string>(
  contract,
  'registerNode',
  [nodeData],
  'AurumNodeManager.registerNode',
);
return nodeAddress;
```

**Order Creation:**
```typescript
// Before:
const { receipt } = await sendContractTxWithReadEstimation(...);
const orderId = parseOrderIdFromReceipt(receipt);

// After:
const { result: orderId } = await sendContractTxAndWaitForIndexer<string>(
  contract,
  'orderCreation',
  [orderData],
  'Ausys.orderCreation',
);
```

**Confirmation-Only Transactions:**
```typescript
// For transactions that just need confirmation (no return value):
await sendContractTxAndWaitForIndexer(
  contract,
  'packageSign',
  [journeyId],
  'Ausys.packageSign', // waitForConfirmation: true in metadata
);
```

## Adding New Transactions

To add a new transaction to the system:

1. **Add metadata entry** to `TRANSACTION_METADATA` in `tx-with-indexer-wait.ts`:
   ```typescript
   'ContractName.methodName': {
     eventTable: 'event_table_name',
     eventIdColumn: 'id_column',
     entityTable: 'entity_table_name', // optional fallback
     waitForConfirmation: true, // if no return value needed
   },
   ```

2. **Use the wrapper** in your service/controller:
   ```typescript
   const { result } = await sendContractTxAndWaitForIndexer(
     contract,
     'methodName',
     [args],
     'ContractName.methodName',
   );
   ```

## Architecture

- **Transaction Helper** (`tx-helper.ts`): Always skips wait, returns `{ tx, receipt: null }`
- **Wrapper** (`tx-with-indexer-wait.ts`): Sends tx and waits for indexer
- **Metadata Registry**: Centralized configuration for all transactions
- **Indexer Database**: PostgreSQL database with all events/entities indexed

## Complexity Assessment

**Is this highly complex?** **No!**

- ✅ **Single wrapper function** for all transactions
- ✅ **Metadata-driven**: Add once to registry, use everywhere
- ✅ **Type-safe**: Generic return types
- ✅ **No receipt parsing**: Indexer has structured data
- ✅ **Standardized**: Same pattern everywhere

The complexity is **lower** than the previous approach:
- No individual wait functions needed
- No receipt parsing code
- No RPC error handling
- Centralized configuration

## Performance

- **RPC Polling**: ~2-5 seconds per transaction (network latency + block time)
- **Indexer Polling**: ~1-2 seconds (database query is instant, just waiting for indexer to process)

The indexer typically processes events within 1-2 seconds of block confirmation, so the total time is similar or better, but without the rate limiting issues.

