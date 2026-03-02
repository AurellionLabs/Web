---
tags: [smart-contracts, facets, clob, view, read-only]
---

# CLOBViewFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > CLOBViewFacet

`CLOBViewFacet.sol` provides all read-only view functions for the CLOB V2 order book. Separating view functions into their own facet keeps `CLOBCoreFacet` and `CLOBMatchingFacet` under the 24KB limit and allows gas-free RPC calls to a clean interface.

---

## Overview

| Property | Value                                                       |
| -------- | ----------------------------------------------------------- |
| File     | `contracts/diamond/facets/CLOBViewFacet.sol`                |
| Gas cost | All functions are `view` — zero gas for off-chain calls     |
| Storage  | [[Smart Contracts/Libraries/DiamondStorage]] V2 — read only |

---

## Order Book Functions

### `getBestBidAsk(bytes32 marketId) → (uint256 bestBid, uint256 bestBidSize, uint256 bestAsk, uint256 bestAskSize, uint256 spread)`

Returns current market top-of-book in a single call. The most commonly called view function.

```typescript
const { bestBid, bestBidSize, bestAsk, bestAskSize, spread } =
  await diamond.getBestBidAsk(marketId);

const price = ethers.formatUnits(bestAsk, 18); // e.g. "500.0"
const slippage = (spread * 100n) / bestAsk; // spread as % of ask
```

---

### `getOrderBookDepth(bytes32 marketId, uint256 levels) → (uint256[] bidPrices, uint256[] bidSizes, uint256[] bidCounts, uint256[] askPrices, uint256[] askSizes, uint256[] askCounts)`

Returns full order book depth up to `levels` price levels on each side.

| Return      | Description                                     |
| ----------- | ----------------------------------------------- |
| `bidPrices` | Descending bid prices (highest first)           |
| `bidSizes`  | Total base token volume at each bid price level |
| `bidCounts` | Number of orders at each bid price level        |
| `askPrices` | Ascending ask prices (lowest first)             |
| `askSizes`  | Total base token volume at each ask price level |
| `askCounts` | Number of orders at each ask price level        |

```typescript
const depth = await diamond.getOrderBookDepth(marketId, 20);
// depth.bidPrices[0] = best bid (highest)
// depth.askPrices[0] = best ask (lowest)
```

Used by the frontend trading chart to render the order book visualisation.

---

### `getMarketInfo(bytes32 marketId) → MarketV2`

Returns full market metadata including token addresses, active status, and creation timestamp.

---

### `getAllMarkets() → bytes32[]`

Returns all market IDs. Use `getMarketInfo` to get details for each.

---

## Order Functions

### `getOrder(bytes32 orderId) → (address maker, bool isBuy, uint8 orderType, uint8 status, uint8 timeInForce, uint96 price, uint96 amount, uint96 filledAmount, uint40 expiry, uint40 createdAt, uint88 nonce)`

Unpacks and returns all fields from a `PackedOrder`. Converts the 3-slot storage representation to named return values.

```typescript
const order = await diamond.getOrder(orderId);
console.log(
  `Status: ${order.status}, Filled: ${order.filledAmount}/${order.amount}`,
);
```

---

### `getOrdersByMaker(address maker) → bytes32[]`

Returns all order IDs created by a specific address (both active and historical).

> ⚠️ On-chain enumeration — for large histories, prefer the Ponder indexer query.

---

### `getOrdersForMarket(bytes32 marketId) → bytes32[]`

Returns all active order IDs for a market.

---

## Market Statistics

### `getMarketStats(bytes32 marketId) → (uint256 volume24h, uint256 trades24h, uint256 lastPrice, uint256 priceChange24h, uint256 high24h, uint256 low24h)`

Returns 24-hour trading statistics for a market. Computed from the `TradeV2` records in storage.

---

### `getSpread(bytes32 marketId) → uint256`

Returns the current bid-ask spread in price units.

```typescript
const spread = await diamond.getSpread(marketId);
const spreadBps = (spread * 10000n) / bestAsk; // spread in basis points
```

---

## Fee Views

### `getTakerFee() → uint16`

### `getMakerFee() → uint16`

Returns current fee rates in basis points.

### `getCollectedFees(address quoteToken) → uint256`

Returns accumulated uncollected fees for a specific quote token.

---

## Pool Views

### `getPool(bytes32 poolId) → LiquidityPool`

Returns full pool data including reserves, LP supply, and active status.

### `getLPBalance(address account, bytes32 poolId) → uint256`

Returns an account's LP token balance for a pool.

### `getPoolPrice(bytes32 poolId) → uint256`

Computes current pool price as `quoteReserve × 1e18 / baseReserve`.

---

## Using View Functions in Frontend

The `CLOBViewFacet` functions are called directly via ethers.js for real-time data:

```typescript
// In TradeProvider — polling every 2 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    if (!diamond || !selectedMarket) return;

    const [topOfBook, depth] = await Promise.all([
      diamond.getBestBidAsk(selectedMarket.id),
      diamond.getOrderBookDepth(selectedMarket.id, 20),
    ]);

    setOrderBook({ topOfBook, depth });
  }, 2000);

  return () => clearInterval(interval);
}, [diamond, selectedMarket]);
```

For historical data (trades, order history), use the [[Indexer/Schema and Queries|Ponder GraphQL API]] instead.

---

## Related Pages

- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Smart Contracts/Facets/CLOBMatchingFacet]]
- [[Core Concepts/CLOB Trading]]
- [[Indexer/Schema and Queries]]
