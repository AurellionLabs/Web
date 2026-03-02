---
tags: [smart-contracts, facets, clob, matching, trading]
---

# CLOBMatchingFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > CLOBMatchingFacet

`CLOBMatchingFacet.sol` is the **matching engine** of Aurellion's Central Limit Order Book. It implements price-time priority matching, trade settlement, and order book depth management using Red-Black Trees for O(log n) performance.

---

## Overview

| Property       | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| File           | `contracts/diamond/facets/CLOBMatchingFacet.sol`                     |
| Inherits       | `ReentrancyGuard`                                                    |
| Algorithm      | Price-Time Priority (best price first, then FIFO within price level) |
| Data structure | Red-Black Tree for price levels + linked list FIFO queues            |

---

## Matching Algorithm

```
Incoming BUY order at price P
  ↓
Find lowest ASK price in Red-Black Tree
  ↓
If lowestAsk <= P (price overlap):
  Take first order in FIFO queue at that price level
  Calculate fill: min(buyAmount, sellAmount)
  Execute trade
  Remove from queue if fully filled
  Repeat until order filled or no more matching asks
  ↓
If partially filled AND TIF == GTC:
  Insert remainder into bid tree at price P
Else if IOC: cancel remainder
Else if FOK: revert entire tx (FOKNotFilled)
```

---

## Core Functions

### `matchOrder(bytes32 orderId)`

Attempts to match a newly placed order against the existing order book.

**Called by:** `OrderRouterFacet` immediately after order creation.

**Modifiers:** `whenNotPaused`

**Process:**

1. Loads `PackedOrder` from storage
2. Determines direction (bid/ask)
3. Traverses Red-Black Tree to find matching price levels
4. Executes fills via `_executeFill`
5. Updates order book depth
6. Emits `MarketDepthChanged`

---

### `executeMatch(bytes32 takerOrderId, bytes32 makerOrderId)`

Admin/settlement function to force-match two specific orders.

**Use case:** Manual matching for MEV-protected commit-reveal orders after reveal.

---

## Trade Execution

For each fill:

1. **Calculate amounts:**

   ```
   fillAmount = min(takerRemaining, makerRemaining)
   quoteAmount = fillAmount × fillPrice
   takerFee = quoteAmount × takerFeeBps / 10000
   makerFee = quoteAmount × makerFeeBps / 10000
   ```

2. **Transfer tokens:**

   - Buy taker: receives `fillAmount` ERC-1155 tokens from Diamond
   - Sell taker: receives `quoteAmount - takerFee` ERC-20 from Diamond
   - Maker (sell): receives `quoteAmount - makerFee` ERC-20
   - Maker (buy): receives `fillAmount` ERC-1155

3. **Fee distribution:**

   - Fees accumulated in `collectedFees[quoteToken]`
   - Claimable by owner via `CLOBAdminFacet.withdrawFees`

4. **Update order records:**
   - `packedOrders[orderId].filledAmount += fillAmount`
   - Mark FILLED if `filledAmount == amount`

---

## Events

| Event                 | Parameters                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `MatchingOrderFilled` | `orderId, tradeId, fillAmount, fillPrice, remainingAmount, cumulativeFilled`                                                         |
| `TradeExecuted`       | `tradeId, takerOrderId, makerOrderId, taker, maker, marketId, price, amount, quoteAmount, takerFee, makerFee, timestamp, takerIsBuy` |
| `MarketDepthChanged`  | `marketId, bestBid, bestBidSize, bestAsk, bestAskSize, spread`                                                                       |
| `CLOBOrderCancelled`  | `orderId, maker, remainingAmount, reason`                                                                                            |
| `OrderExpired`        | `orderId, expiredAt`                                                                                                                 |

---

## Errors

| Error                          | Condition                                   |
| ------------------------------ | ------------------------------------------- |
| `OrderNotFound()`              | Unknown orderId                             |
| `MarketPaused()`               | Circuit breaker active                      |
| `CircuitBreakerTrippedError()` | Price moved beyond threshold                |
| `FOKNotFilled()`               | Fill-or-Kill order couldn't be fully filled |

---

## Red-Black Tree Price Levels

Price levels use a Red-Black Tree (self-balancing BST) for O(log n) best-price lookup:

```
Bid Tree (max-heap behaviour — highest bid at root):
         100
        /   \
       95   98
      / \
     90  93

Ask Tree (min-heap behaviour — lowest ask at root):
         105
        /   \
      110   108
            / \
          115 112
```

Each price level contains a FIFO queue of orders at that price. Time priority is maintained by the queue — earlier orders fill first.

**`RBTreeMeta` fields:** root, count, totalVolume
**`RBNode` fields:** key (price), parent, left, right, isRed, orderId (head of queue)
**`PriceLevel` fields:** head, tail, totalVolume, orderCount

---

## Circuit Breaker Integration

Before executing any fill, the matching facet checks the circuit breaker:

```
newPrice = fillPrice
threshold = market.defaultPriceChangeThreshold
if |newPrice - lastPrice| / lastPrice > threshold:
  tripCircuitBreaker(marketId)
  revert CircuitBreakerTrippedError()
```

Tripped markets are paused for `defaultCooldownPeriod` blocks.

---

## Related Pages

- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Smart Contracts/Facets/OrderRouterFacet]]
- [[Core Concepts/CLOB Trading]]
