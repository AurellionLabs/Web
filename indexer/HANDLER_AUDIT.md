# Indexer Handler Audit

## Overview

This document audits all handlers needed for the frontend to work properly with the indexer.

## Frontend GraphQL Query Requirements

### ✅ Nodes & Node Assets

**Queries:**

- `GET_NODE_BY_ADDRESS` - Single node lookup
- `GET_NODES_BY_OWNER` - Nodes by owner
- `GET_ALL_ACTIVE_NODES` - All active nodes
- `GET_NODE_ASSETS_AURUM` - Node assets by node address
- `GET_ALL_NODE_ASSETS_AURUM` - All node assets (paginated)

**Handlers:** ✅ `nodes.ts`

- `Diamond:NodeRegistered` ✅
- `Diamond:NodeUpdated` ✅
- `Diamond:NodeDeactivated` ✅
- `Diamond:SupportedAssetAdded` ✅
- `Diamond:TokensDepositedToNode` ✅
- `Diamond:TokensWithdrawnFromNode` ✅
- `Diamond:TokensTransferredBetweenNodes` ✅
- `Diamond:TokensMintedToNode` ✅

### ✅ AuraAsset (ERC1155 Assets)

**Queries:**

- `GET_ALL_ASSETS` - All assets (paginated)
- `GET_ASSETS_BY_TOKEN_IDS` - Assets by token IDs
- `GET_ASSETS_BY_HASHES` - Assets by hashes
- `GET_ASSETS_BY_CLASS` - Assets by class
- `GET_SUPPORTED_CLASSES` - Supported asset classes
- `GET_USER_BALANCES_AURA` - User balances

**Handlers:** ✅ `aura-asset.ts` (NEWLY CREATED)

- `AuraAsset:MintedAsset` ✅
- `AuraAsset:AssetAttributeAdded` ✅
- `AuraAsset:TransferSingle` ✅
- `AuraAsset:TransferBatch` ✅

**Tables Populated:**

- `assets` ✅
- `assetAttributes` ✅
- `supportedAssets` ✅
- `supportedClasses` ✅ (THIS WAS MISSING - NOW FIXED)
- `mintedAssetEvents` ✅
- `transferEvents` ✅
- `transferBatchEvents` ✅
- `tokenStats` ✅
- `userBalances` ✅

### ✅ CLOB Trading

**Queries:**

- `GET_ORDER_BOOK` - Order book for market
- `GET_ORDER_BY_ID` - Single order lookup
- `GET_USER_ORDERS` - User's orders
- `GET_USER_ACTIVE_ORDERS` - User's active orders
- `GET_TRADES` - Trades for market
- `GET_USER_TRADES` - User's trades
- `GET_MARKET` - Market data
- `GET_ALL_MARKETS` - All markets
- `GET_CLOB_OPEN_ORDERS` - Open orders
- `GET_CLOB_TRADES` - Recent trades
- `GET_CLOB_USER_ORDERS` - User order history
- `GET_CLOB_USER_TRADES` - User trade history
- `GET_CLOB_BEST_PRICES` - Best bid/ask

**Handlers:** ✅ `clob.ts`

- `Diamond:OrderCreated` ✅
- `Diamond:OrderPlacedWithTokens` ✅
- `Diamond:OrderFilled` ✅
- `Diamond:TradeExecuted` (V2 with fees) ✅
- `Diamond:TradeExecuted` (Matching version) ✅
- `Diamond:OrderCancelled` (CLOB version) ✅
- `Diamond:OrderExpired` ✅
- `Diamond:MarketCreated` ✅

**Tables Populated:**

- `clobOrders` ✅
- `clobTrades` ✅
- `orderPlacedEvents` ✅
- `orderCancelledEvents` ✅
- `tradeExecutedEvents` ✅
- `marketData` ✅

### ✅ Bridge/Unified Orders

**Queries:**

- Queries use `unifiedOrders` table

**Handlers:** ✅ `bridge.ts`

- `Diamond:UnifiedOrderCreated` ✅
- `Diamond:TradeMatched` ✅
- `Diamond:OrderSettled` ✅
- `Diamond:OrderCancelled` (Bridge version) ✅

**Tables Populated:**

- `unifiedOrders` ✅
- `unifiedOrderCreatedEvents` ✅
- `tradeMatchedEvents` ✅
- `unifiedOrderSettledEvents` ✅

### ✅ Staking

**Queries:**

- Queries use `stakes`, `stakedEvents`, `unstakedEvents`, `rewardPaidEvents` tables

**Handlers:** ✅ `staking.ts`

- `Diamond:Staked` ✅
- `Diamond:Withdrawn` ✅
- `Diamond:RewardsClaimed` ✅

**Tables Populated:**

- `stakes` ✅
- `stakedEvents` ✅
- `unstakedEvents` ✅
- `rewardPaidEvents` ✅
- `userStakeStats` ✅

### ❌ Orders (AuSys Orders) - MISSING HANDLERS

**Queries:**

- `GET_ORDER_BY_ID` - Single order lookup
- `GET_ORDERS_BY_BUYER` - Orders by buyer
- `GET_ORDERS_BY_SELLER` - Orders by seller
- `GET_ORDERS_BY_NODE` - Orders by node

**Expected Events:**

- `Diamond:OrderCreated` from OrdersFacet (different from CLOB OrderCreated)
- `Diamond:OrderUpdated` from OrdersFacet
- `Diamond:OrderCancelled` from OrdersFacet (different from CLOB/Bridge versions)

**Tables Expected:**

- `orders` table exists in schema ✅
- But NO HANDLERS to populate it ❌

**Status:** ❌ **MISSING - NEEDS HANDLER**

### ❌ Journeys - MISSING HANDLERS

**Queries:**

- `GET_JOURNEY_BY_ID` - Single journey lookup
- `GET_JOURNEYS_BY_SENDER` - Journeys by sender
- `GET_JOURNEYS_BY_RECEIVER` - Journeys by receiver
- `GET_JOURNEYS_BY_DRIVER` - Journeys by driver
- `GET_AVAILABLE_JOURNEYS` - Available journeys
- `GET_ALL_JOURNEYS` - All journeys
- `GET_JOURNEYS_BY_ORDER_ID` - Journeys by order

**Expected Events:**

- `Diamond:LogisticsOrderCreated` from BridgeFacet
- `Diamond:JourneyStatusUpdated` from BridgeFacet
- Possibly `JourneyCreated` from legacy AuSys contract

**Tables Expected:**

- `journeys` table exists in schema ✅
- `journeyStatusUpdates` table exists ✅
- `driverAssignments` table exists ✅
- `packageSignatures` table exists ✅
- But NO HANDLERS to populate them ❌

**Status:** ❌ **MISSING - NEEDS HANDLER**

## Summary

### ✅ Working Handlers

1. **nodes.ts** - Complete ✅
2. **clob.ts** - Complete ✅
3. **bridge.ts** - Complete ✅
4. **staking.ts** - Complete ✅
5. **aura-asset.ts** - Complete ✅ (NEWLY CREATED)
6. **orders.ts** - Complete ✅ (NEWLY CREATED - with data warnings)
7. **journeys.ts** - Complete ✅ (NEWLY CREATED)

## Error Handling

All handlers now include:

- ✅ Try-catch blocks to prevent silent failures
- ✅ Error logging with stack traces
- ✅ Warnings when expected data is missing
- ✅ Handler count validation on startup
- ✅ Clear error messages indicating which handler failed

When a handler is missing or fails:

- ❌ Errors are logged to console with full stack traces
- ❌ Errors are re-thrown so Ponder can retry
- ⚠️ Warnings are logged when data is incomplete
- ✅ Handler validation runs on startup to catch missing imports

### ✅ Missing Handlers - NOW CREATED

1. **orders.ts** - ✅ CREATED

   - Handle `Diamond:OrderCreated` from OrdersFacet ✅
   - Handle `Diamond:OrderUpdated` from OrdersFacet ✅
   - Handle `Diamond:OrderCancelled` from OrdersFacet ✅
   - Populate `orders` table ✅
   - **Note:** OrdersFacet emits minimal events. Orders table expects more data (token, location, etc.) which may not be available. Handler logs warnings when data is missing.

2. **journeys.ts** - ✅ CREATED
   - Handle `Diamond:LogisticsOrderCreated` from BridgeFacet ✅
   - Handle `Diamond:JourneyStatusUpdated` from BridgeFacet ✅
   - Populate `journeys`, `journeyStatusUpdates`, `driverAssignments` tables ✅

## Action Items

1. ✅ **DONE:** Created `aura-asset.ts` handler for AuraAsset events
2. ✅ **DONE:** Created `orders.ts` handler for OrdersFacet events
3. ✅ **DONE:** Created `journeys.ts` handler for Journey events
4. ✅ **DONE:** Updated `index.ts` to import new handlers
5. ✅ **DONE:** Added error handling to prevent silent failures
6. ⏳ **TODO:** Test all handlers with real events
7. ⏳ **TODO:** Monitor logs for missing data warnings

## Notes

- The `orders` table schema exists but is not being populated
- The `journeys` table schema exists but is not being populated
- Frontend queries for orders and journeys will return empty results until handlers are created
- CLOB orders are handled separately in `clob.ts` - those work fine
- Unified orders are handled in `bridge.ts` - those work fine
- The missing handlers are for the legacy AuSys-style orders and journeys
