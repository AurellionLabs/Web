# Generative Indexer: Add Aggregate Tables to Generator

## Overview

The `generate-indexer.ts` script currently only generates **raw event tables** (dumb indexer pattern). The frontend queries expect **aggregate tables** (`assets`, `orders`, `journeys`) which must be manually created - breaking the generative pipeline.

**Goal:** Update `scripts/generate-indexer.ts` to automatically generate aggregate tables and their corresponding handlers, so that running `npm run generate:indexer` produces a complete, query-ready schema.

## Current State

```
generate-indexer.ts
├── generateEventTable()     → Creates raw event tables ✅
├── generateEntityTables()   → Returns EMPTY array ❌
├── generateHandlerStub()    → Only inserts to event tables ❌
└── generateSchema()         → Only outputs event tables ❌
```

**Result:** Frontend gets `GRAPHQL_VALIDATION_FAILED` errors because `assetss`, `orderss`, `journeyss` tables don't exist.

## Target State

```
generate-indexer.ts
├── generateEventTable()           → Creates raw event tables ✅
├── generateAggregateTables()      → Creates assets, orders, journeys tables ✅ NEW
├── generateAggregateHandlers()    → Creates handlers that upsert to aggregates ✅ NEW
├── generateSchema()               → Outputs event + aggregate tables ✅
└── EVENT_TO_AGGREGATE_MAPPING     → Config mapping events → aggregate updates ✅ NEW
```

**Result:** Running `npm run generate:indexer` produces complete schema with aggregate tables.

## Architecture

### Aggregate Table Definitions (Config-Driven)

```typescript
const AGGREGATE_TABLES = {
  assets: {
    columns: { id, hash, token_id, name, asset_class, class_name, account, ... },
    indexes: ['token_id', 'account', ['asset_class', 'class_name']],
  },
  orders: {
    columns: { id, buyer, seller, token, token_id, price, current_status, ... },
    indexes: ['buyer', 'seller', 'current_status'],
  },
  journeys: {
    columns: { id, sender, receiver, driver, current_status, bounty, order_id, ... },
    indexes: ['sender', 'receiver', 'driver', 'current_status', 'order_id'],
  },
};
```

### Event-to-Aggregate Mapping (Config-Driven)

```typescript
const EVENT_TO_AGGREGATE_MAPPING = {
  'UnifiedOrderCreated': {
    table: 'orders',
    action: 'upsert',
    mapping: { id: 'unified_order_id', buyer: 'buyer', seller: 'seller', ... },
  },
  'JourneyStatusUpdated': {
    table: 'journeys',
    action: 'update',
    mapping: { id: 'journey_id', current_status: 'phase', ... },
  },
  // ... etc
};
```

## Reference Files

- Generator script: `scripts/generate-indexer.ts`
- Current schema output: `indexer/generated-schema.ts`
- Frontend query types: `infrastructure/repositories/orders-repository.ts`
- Existing smoke tests: `indexer/test/smoke/aura-asset-smoke.test.ts`

---

## Tasks

### Phase 1: Define Aggregate Table Configuration

- [ ] US-001: Add AGGREGATE_TABLES config to scripts/generate-indexer.ts. Define 'assets' table with columns: id (text PK), hash (hex), token_id (bigint indexed), name (text), asset_class (text), class_name (text), account (hex indexed), created_at (bigint), updated_at (bigint), block_number (bigint), transaction_hash (hex). Add composite index on (asset_class, class_name). Place config near top of file after FACETS_TO_INDEX. Verify: npx ts-node scripts/generate-indexer.ts --help (should not error)

- [ ] US-002: Add 'orders' table to AGGREGATE_TABLES config. Columns: id (text PK), buyer (hex indexed), seller (hex indexed), token (hex), token_id (bigint), token_quantity (bigint), requested_token_quantity (bigint), price (bigint), tx_fee (bigint), current_status (integer indexed), start_location_lat (text), start_location_lng (text), end_location_lat (text), end_location_lng (text), start_name (text), end_name (text), nodes (text), created_at (bigint), updated_at (bigint), block_number (bigint), transaction_hash (hex). Indexes on buyer, seller, current_status. Verify: npx ts-node scripts/generate-indexer.ts --help

- [ ] US-003: Add 'journeys' table to AGGREGATE_TABLES config. Columns: id (text PK), sender (hex indexed), receiver (hex indexed), driver (hex indexed), current_status (integer indexed), bounty (bigint), journey_start (bigint), journey_end (bigint), eta (bigint), start_location_lat (text), start_location_lng (text), end_location_lat (text), end_location_lng (text), start_name (text), end_name (text), order_id (hex indexed), created_at (bigint), updated_at (bigint), block_number (bigint), transaction_hash (hex). Add composite index on (current_status, created_at). Verify: npx ts-node scripts/generate-indexer.ts --help

### Phase 2: Implement Aggregate Table Generation

- [ ] US-004: Implement generateAggregateTables() function in scripts/generate-indexer.ts. Function reads AGGREGATE_TABLES config and returns SchemaTable[] array. Each table has columns with proper Ponder types (t.text(), t.hex(), t.bigint(), t.integer()). All columns use snake_case. Function handles composite indexes. Replace empty generateEntityTables() with call to generateAggregateTables(). Verify: npm run generate:indexer && grep -q "assets" indexer/generated-schema.ts

- [ ] US-005: Verify aggregate tables appear in generated-schema.ts after running generator. Run: npm run generate:indexer. Check indexer/generated-schema.ts contains 'assets', 'orders', 'journeys' table definitions. Check tables are exported in the 'tables' object. Verify: cd indexer && npx tsc --noEmit

### Phase 3: Define Event-to-Aggregate Mapping

- [ ] US-006: Add EVENT_TO_AGGREGATE_MAPPING config to scripts/generate-indexer.ts. Map 'UnifiedOrderCreated' (from unifiedOrderCreatedC8b6Events) to orders table insert with fields: id=unified_order_id, buyer, seller, token, token_id, token_quantity=quantity, price, current_status=0, created_at=block_timestamp. Map 'OrderSettled' to orders update: current_status=4. Map 'BridgeOrderCancelled' to orders update: current_status=5. Verify: npx ts-node scripts/generate-indexer.ts --help

- [ ] US-007: Add journey event mappings to EVENT_TO_AGGREGATE_MAPPING. Map 'LogisticsOrderCreated' (from logisticsOrderCreated_9c83Events) to journeys table insert with fields: id=journey_ids, bounty, order_id=unified_order_id, current_status=0, created_at=block_timestamp. Map 'JourneyStatusUpdated' to journeys update: id=journey_id, current_status=phase, updated_at=block_timestamp. Verify: npx ts-node scripts/generate-indexer.ts --help

- [ ] US-008: Add asset event mappings to EVENT_TO_AGGREGATE_MAPPING. Map AuraAsset 'TransferSingle' (where from=0x0, indicating mint) to assets table upsert with fields: id=hash of (token+tokenId), token_id=id from event, account=to, created_at=block_timestamp. Note: name/asset_class/class_name may need placeholder values or separate enrichment. Verify: npx ts-node scripts/generate-indexer.ts --help

### Phase 4: Generate Aggregate Handlers

- [ ] US-009: Implement generateAggregateHandlers() function in scripts/generate-indexer.ts. Function reads EVENT_TO_AGGREGATE_MAPPING and generates handler code that: 1) Inserts to raw event table (existing behavior), 2) Upserts to aggregate table based on mapping. Use context.db.<table>.upsert() pattern. Generate as separate file: indexer/src/handlers/aggregates.generated.ts. Verify: npm run generate:indexer && test -f indexer/src/handlers/aggregates.generated.ts

- [ ] US-010: Update generateHandlers() to call generateAggregateHandlers() and include aggregates.generated.ts in the handler index. Update indexer/src/handlers/index.ts to import aggregates.generated. Verify: npm run generate:indexer && grep -q "aggregates.generated" indexer/src/handlers/index.ts

### Phase 5: Smoke Tests

- [ ] US-011: Create indexer/test/smoke/aggregates-query.test.ts smoke test. Test queries: 1) assetss(limit:10) - verify response shape, 2) orderss(limit:10) and orderss(where:{buyer:addr}), 3) journeyss(limit:10) and journeyss(where:{current_status:0}). Skip gracefully if indexer unreachable. Verify fields match AGGREGATE_TABLES config. Run: cd indexer && npm test -- --grep aggregates-query

- [ ] US-012: Run full generation and validation. Steps: 1) npm run generate:indexer, 2) cd indexer && npx tsc --noEmit, 3) cd indexer && npm test -- --grep smoke. Verify NO GRAPHQL_VALIDATION_FAILED errors. Update indexer/README.md noting that aggregate tables are auto-generated. Document in AGENTS.md that running generate:indexer now creates aggregate tables.

---

## Success Criteria

1. Running `npm run generate:indexer` produces `assets`, `orders`, `journeys` tables in `generated-schema.ts`
2. Handlers automatically upsert to aggregate tables when relevant events fire
3. All smoke tests pass - no GraphQL validation errors
4. No manual schema edits required when contracts change
5. Future contract updates only require re-running the generator

## Non-Goals

- Backfilling historical data (indexer will catch up from startBlock)
- Modifying frontend queries (schema is source of truth)
- Adding new event types beyond what exists in contracts
