# AuraAsset Indexer Smoke Tests

## Overview

This document describes the smoke tests created to verify that the AuraAsset indexer outputs data in the exact format expected by the frontend `useUserHoldings` hook.

## Test Files

- `/srv/Web/indexer/test/smoke/aura-asset-smoke.test.ts` - Main smoke tests
- `/srv/Web/indexer/test/smoke/index.ts` - Test entry point

## Running the Tests

```bash
cd /srv/Web/indexer

# Run AuraAsset smoke tests only
npm test -- --run test/smoke/aura-asset-smoke.test.ts

# Run all tests
npm test -- --run
```

## Test Results

All 17 smoke tests pass:

```
✓ GraphQL Schema Compatibility (3 tests)
✓ MintedAsset Event Handler Output (4 tests)
✓ Transfer Event Handler Output (3 tests)
✓ Batch Transfer Handler Output (1 test)
✓ Asset Attribute Handler Output (1 test)
✓ End-to-End Data Flow (3 tests)
✓ Error Handling (2 tests)
```

## Frontend Compatibility

The tests verify that the indexer outputs match the `useUserHoldings` hook expectations:

### Expected GraphQL Query

```graphql
query GetAllAssets($limit: Int!) {
  assetss(limit: $limit, orderBy: "tokenId", orderDirection: "asc") {
    items {
      id
      hash
      tokenId
      name
      assetClass
      className
      account
    }
  }
}
```

### Expected Response Format

```typescript
interface FrontendAsset {
  id: string; // Asset hash
  hash: string; // Asset hash
  tokenId: string; // Serialized as string (not bigint)
  name: string; // Asset name
  assetClass: string; // Asset class
  className: string; // Class name
  account: string; // Minter/node address
}
```

## Handler Coverage

| Event                 | Handler Function                             | Status        |
| --------------------- | -------------------------------------------- | ------------- |
| `MintedAsset`         | `ponder.on('AuraAsset:MintedAsset')`         | ✓ Implemented |
| `TransferSingle`      | `ponder.on('AuraAsset:TransferSingle')`      | ✓ Implemented |
| `TransferBatch`       | `ponder.on('AuraAsset:TransferBatch')`       | ✓ Implemented |
| `AssetAttributeAdded` | `ponder.on('AuraAsset:AssetAttributeAdded')` | ✓ Implemented |

## Key Test Assertions

1. **GraphQL Schema Matching**

   - Query structure matches frontend expectations
   - Field names are correct (camelCase in TypeScript, exposed as-is in GraphQL)
   - tokenId is serialized as string (GraphQL requirement)

2. **Event Data Structure**

   - All event fields are present and correctly typed
   - Composite IDs are generated correctly (txHash-logIndex)
   - Addresses are normalized to lowercase

3. **Entity Relationships**

   - Assets are linked to user balances
   - Token stats are updated on mints/transfers
   - Batch transfers update all affected balances

4. **Edge Cases**
   - Zero-value transfers are handled gracefully
   - Multiple mints to same address don't inflate holder count
   - Mint/burn transactions are handled correctly

## Files Modified

1. `/srv/Web/indexer/src/handlers/aura-asset.generated.ts` - New handler file
2. `/srv/Web/indexer/generated-schema.ts` - Added event tables
3. `/srv/Web/indexer/src/handlers/index.ts` - Import new handler
4. `/srv/Web/indexer/test/smoke/aura-asset-smoke.test.ts` - New smoke tests

## Deployment

After deploying the handler changes to the indexer, run:

```bash
# Start/restart the indexer
cd /srv/Web/indexer
npm start

# Or if using Docker
docker-compose down && docker-compose up -d

# Verify with smoke tests
npm test -- --run test/smoke/aura-asset-smoke.test.ts

# Check the indexer is processing events
curl -X POST https://indexer.aurellionlabs.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ assetss(limit: 10) { items { id hash tokenId name assetClass className account } } }"}'
```
