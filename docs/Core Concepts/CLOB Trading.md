---
tags: [concepts, clob, trading, order-book, matching]
---

# CLOB Trading

[[🏠 Home]] > Core Concepts > CLOB Trading

Aurellion's **Central Limit Order Book (CLOB)** is a fully on-chain order matching engine that enables price-time priority trading of tokenised real-world assets. It is production-grade, gas-optimised, and MEV-protected.

---

## What is a CLOB?

A Central Limit Order Book is a market structure where buy and sell orders are collected in an order book and matched by price-time priority:

- **Best price wins** — highest bid matches with lowest ask
- **Time priority within price** — among orders at the same price, earlier orders fill first (FIFO)
- **Price discovery** — the spread between best bid and best ask reveals the market price

This is the same model used by NYSE, Nasdaq, and traditional commodity exchanges — but fully on-chain and permissionless.

---

## Order Types

| Type           | Code | Description                                      |
| -------------- | ---- | ------------------------------------------------ |
| **Limit**      | `1`  | Buy/sell at a specific price or better           |
| **Market**     | `0`  | Execute immediately at best available price      |
| **Stop Limit** | `2`  | Trigger a limit order when price reaches a level |
| **TWAP**       | `3`  | Time-weighted average price execution            |

---

## Time-In-Force Options

| TIF     | Code | Behaviour                                                              |
| ------- | ---- | ---------------------------------------------------------------------- |
| **GTC** | `0`  | Good Till Cancelled — stays in book until filled or manually cancelled |
| **IOC** | `1`  | Immediate Or Cancel — fills what it can, remaining quantity cancelled  |
| **FOK** | `2`  | Fill Or Kill — fills entirely or reverts the entire transaction        |
| **GTD** | `3`  | Good Till Date — auto-cancelled at the specified `expiry` timestamp    |

---

## Markets

A **market** is a trading pair defined by three parameters:

```
marketId = keccak256(baseToken, baseTokenId, quoteToken)
```

| Component     | Type      | Example                              |
| ------------- | --------- | ------------------------------------ |
| `baseToken`   | `address` | Aurellion ERC-1155 contract          |
| `baseTokenId` | `uint256` | Token ID of the specific asset class |
| `quoteToken`  | `address` | USDC or other ERC-20 payment token   |

Markets are created automatically when the first order is placed for a token pair, or explicitly via `CLOBAdminFacet.createMarket()`.

---

## Order Book Architecture

### V2 Order Book (Production)

The V2 CLOB uses three-slot **PackedOrders** for gas efficiency and **Red-Black Trees** for O(log n) price operations:

```
Bid Side (buyers)          Ask Side (sellers)
Price  Volume  FIFO        Price  Volume  FIFO
─────  ──────  ────        ─────  ──────  ────
100    5,000   [A→B→C]     105    3,000   [D→E]
 98    2,000   [F]         108    1,500   [G→H→I]
 95    8,000   [J→K]       115    4,000   [L]
```

- Red-Black Tree: O(log n) insertion, deletion, best-price lookup
- FIFO queue: Doubly-linked list per price level for time priority
- PackedOrder: 3 EVM slots per order vs. 10+ for V1

### Price Level Mechanics

When an order is placed:

1. Calculate `marketId`
2. Find/create price level in the Red-Black Tree
3. Append order to end of FIFO queue at that price level
4. Attempt matching against opposite side

When an order fills:

1. Dequeue from head of FIFO (earliest order fills first)
2. Update RB Tree node volume
3. Remove price level from tree if volume reaches zero

---

## Matching Process

```
Buyer places limit buy at $100 for 10 tokens
         │
         ▼ OrderRouterFacet.placeOrder(...)
         │  → Escrow: 100 USDC × 10 = 1,000 USDC transferred to Diamond
         │  → Create PackedOrder, insert into bid tree at $100
         │
         ▼ CLOBMatchingFacet.matchOrder(orderId)
         │  → Get lowestAsk from ask Red-Black Tree
         │  → lowestAsk = $98 (sellers willing to sell at $98)
         │
         ▼ Price overlap: $100 bid ≥ $98 ask → MATCH
         │  → Fill price = $98 (maker price)
         │  → Fill amount = min(10, askQueueHead.amount)
         │
         ▼ Trade settled:
         │  → 10 ERC-1155 tokens → buyer's wallet
         │  → 980 USDC → seller (minus maker fee 0.05% = $0.49)
         │  → buyer refunded: $100×10 - $98×10 = $20 (price improvement)
         │  → taker fee: $98×10×0.1% = $0.98 → protocol
         │
         ▼ Emits:
            TradeExecuted(tradeId, buyer, seller, marketId, $98, 10, ...)
            MarketDepthChanged(marketId, bestBid, bestBidSize, bestAsk, ...)
```

---

## Fee Structure

| Fee       | Rate                                 | Who Pays    | Recipient                |
| --------- | ------------------------------------ | ----------- | ------------------------ |
| Taker fee | `takerFeeBps` (default 10bps = 0.1%) | Order taker | Protocol                 |
| Maker fee | `makerFeeBps` (default 5bps = 0.05%) | Order maker | Protocol                 |
| LP fee    | 5bps                                 | Taker       | Liquidity pool providers |

Fees are accumulated and claimable by the contract owner via `CLOBAdminFacet.withdrawFees()`.

---

## MEV Protection

Large orders (above `commitmentThreshold`, default 10,000e18 quote tokens) must use the **commit-reveal scheme**:

### Commit Phase

```solidity
// Trader creates a commitment off-chain
bytes32 commitment = keccak256(abi.encode(salt, orderParams));
CLOBMEVFacet.commitOrder(commitment);
// Order details hidden for at least minRevealDelay blocks
```

### Reveal Phase (≥ minRevealDelay blocks later)

```solidity
// Trader reveals the actual order parameters
CLOBMEVFacet.revealOrder(salt, orderParams);
// Only executes if block.number >= commit.block + minRevealDelay
```

This prevents front-running of large orders by MEV bots.

---

## Circuit Breakers

Each market has a circuit breaker that automatically pauses trading during extreme price movements:

| Parameter                     | Default      | Description                         |
| ----------------------------- | ------------ | ----------------------------------- |
| `defaultPriceChangeThreshold` | Configurable | % price move that trips breaker     |
| `defaultCooldownPeriod`       | Configurable | Blocks the market stays paused      |
| `emergencyTimelock`           | Configurable | Delay before emergency admin action |

Circuit breakers can be manually triggered or reset by the contract owner via `CLOBAdminFacet`.

---

## Liquidity Pools (AMM Hybrid)

Alongside the CLOB, Aurellion supports **Automated Market Maker (AMM) liquidity pools** that provide passive liquidity:

### Pool Operations

| Function                                         | Description                        |
| ------------------------------------------------ | ---------------------------------- |
| `createPool(baseToken, baseTokenId, quoteToken)` | Create a new AMM pool              |
| `addLiquidity(poolId, baseAmount, quoteAmount)`  | Deposit tokens, receive LP tokens  |
| `removeLiquidity(poolId, lpAmount)`              | Burn LP tokens, receive underlying |
| `claimFees(poolId)`                              | Claim accumulated trading fees     |

Pools use the constant product formula (`x × y = k`). LP tokens are minted proportionally to the share of liquidity provided.

**Events:** `PoolCreated`, `LiquidityAdded`, `LiquidityRemoved`, `FeesCollected`

---

## Reading the Order Book

### GraphQL (via Ponder indexer)

```graphql
query OrderBook($marketId: String!) {
  clobOrderss(
    where: { marketId: $marketId, status: 0 }
    orderBy: "price"
    orderDirection: "desc"
  ) {
    items {
      id
      maker
      price
      amount
      filledAmount
      isBuy
      createdAt
    }
  }
}
```

### Direct Contract Read (CLOBViewFacet)

```typescript
const { bestBid, bestBidSize, bestAsk, bestAskSize, spread } =
  await diamond.getMarketDepth(marketId);

const orderBook = await diamond.getOrderBook(marketId, (depth = 20));
// Returns: { bids: [price, size][], asks: [price, size][] }
```

---

## Order Lifecycle States

| State            | Value | Meaning                                |
| ---------------- | ----- | -------------------------------------- |
| ACTIVE           | `0`   | In order book, available to match      |
| PARTIALLY_FILLED | `1`   | Some quantity filled, remainder active |
| FILLED           | `2`   | Fully matched and settled              |
| CANCELLED        | `3`   | Cancelled by maker or expired          |
| EXPIRED          | `4`   | GTD order past expiry                  |

---

## Integration Checklist

For a node operator listing assets:

1. Mint tokens via `AssetsFacet.nodeMint()`
2. Ensure tokens in node inventory: `NodesFacet.depositTokensToNode()`
3. Place sell order: `OrderRouterFacet.placeNodeSellOrder()`
4. Monitor fills via Ponder GraphQL

For a customer buying:

1. Approve quote token: `quoteToken.approve(diamond, amount)`
2. Place buy order: `OrderRouterFacet.placeOrder(..., isBuy=true)`
3. If matched → either receive tokens directly (no delivery) or trigger bridge for physical delivery

---

## Related Pages

- [[Smart Contracts/Facets/OrderRouterFacet]]
- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Smart Contracts/Facets/CLOBMatchingFacet]]
- [[Core Concepts/Order Lifecycle]]
- [[Roles/Customer]]
