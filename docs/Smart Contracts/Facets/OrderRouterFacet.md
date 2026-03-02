---
tags: [smart-contracts, facets, clob, orders, entry-point]
---

# OrderRouterFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > OrderRouterFacet

`OrderRouterFacet.sol` is the **single recommended entry point for all order operations** in the Aurellion Diamond. All frontend and integration code should route order placement through this facet. It uses `OrderBookLib`, `OrderMatchingLib`, and `OrderUtilsLib` to keep the facet within the 24KB size limit while delegating logic cleanly.

---

## Why Use This Facet

| Approach                          | Status         | Why                                  |
| --------------------------------- | -------------- | ------------------------------------ |
| `OrderRouterFacet.placeOrder()`   | ✅ Recommended | Uses V2 storage, consistent matching |
| `CLOBCoreFacet.placeLimitOrder()` | ✅ Acceptable  | Internal, V2 storage                 |
| `CLOBFacet.placeOrder()`          | ⚠️ Deprecated  | Legacy V1 storage, no V2 matching    |
| `CLOBFacet.placeBuyOrder()`       | ❌ Deprecated  | Redirects to OrderRouterFacet        |

---

## Order Placement

### `placeOrder(address baseToken, uint256 baseTokenId, address quoteToken, uint96 price, uint96 amount, bool isBuy, uint8 timeInForce, uint40 expiry) → bytes32 orderId`

Places a **limit order** (buy or sell) into the order book.

**Modifiers:** `nonReentrant`

**Token escrow:**

- Buy orders: transfers `price * amount` of `quoteToken` (ERC-20) from caller to Diamond
- Sell orders: transfers `amount` of `baseToken` tokenId (ERC-1155) from caller to Diamond

**Process:**

1. Validates order params via `OrderUtilsLib.validateOrderParams`
2. Creates or retrieves market: `marketId = keccak256(baseToken, baseTokenId, quoteToken)`
3. Escrows tokens (buy = quote, sell = base)
4. Creates `PackedOrder` via `OrderBookLib`
5. Inserts into order book price level
6. Attempts immediate matching via `OrderMatchingLib`
7. Returns orderId

**Emits:** `RouterOrderPlaced`, `RouterOrderCreated`, potentially `TradeExecuted` if matched

---

### `placeMarketOrder(address baseToken, uint256 baseTokenId, address quoteToken, uint96 amount, bool isBuy, uint16 maxSlippageBps) → bytes32 orderId`

Places a **market order** — executes immediately at the best available price.

**Parameters:**

| Parameter        | Type      | Description                         |
| ---------------- | --------- | ----------------------------------- |
| `baseToken`      | `address` | Asset token address                 |
| `baseTokenId`    | `uint256` | Asset token ID                      |
| `quoteToken`     | `address` | Payment token                       |
| `amount`         | `uint96`  | Quantity to buy/sell                |
| `isBuy`          | `bool`    | Direction                           |
| `maxSlippageBps` | `uint16`  | Max price deviation in basis points |

**Reverts:**

- `NoLiquidityForMarketOrder()` — no counterpart orders in book
- `MarketPaused()` — circuit breaker active

---

### `cancelOrder(bytes32 orderId)`

Cancels an open order and returns escrowed tokens.

**Reverts:** Propagates errors from `OrderBookLib` (OrderNotFound, NotOrderMaker, etc.)

**Emits:** `RouterOrderCancelled(orderId, maker, remainingAmount, reason)`

---

### `placeNodeSellOrder(address nodeOwner, address baseToken, uint256 baseTokenId, address quoteToken, uint96 price, uint96 amount, uint8 timeInForce, uint40 expiry) → bytes32 orderId`

Specialised entry point for **node operators** placing sell orders on their minted assets.

**Checks:**

- `NotNodeOwner()` — validates `msg.sender` owns the specified `nodeOwner` address's node
- `InsufficientNodeBalance()` — validates node has enough token balance in Diamond inventory (`nodeTokenBalances[nodeHash][baseTokenId] >= amount`)

**Use case:** When a node operator mints tokens and immediately lists them for sale. The tokens come from the node's internal inventory rather than the operator's wallet.

---

## Events

| Event                  | Parameters                                                                            | When                                |
| ---------------------- | ------------------------------------------------------------------------------------- | ----------------------------------- |
| `OrderRouted`          | `orderId, maker, orderSource, isBuy`                                                  | Any order routed through this facet |
| `RouterOrderPlaced`    | `orderId, maker, baseToken, baseTokenId, quoteToken, price, amount, isBuy, orderType` | Order successfully placed           |
| `RouterOrderCreated`   | `orderId, marketId, maker, price, amount, isBuy, orderType, TIF, expiry, nonce`       | Order record created                |
| `RouterOrderCancelled` | `orderId, maker, remainingAmount, reason`                                             | Order cancelled                     |

`orderSource` values: `0=direct`, `1=node`, `2=market`

---

## Errors

| Error                         | Condition                                    |
| ----------------------------- | -------------------------------------------- |
| `InsufficientNodeBalance()`   | Node's internal token balance < order amount |
| `NotNodeOwner()`              | Caller doesn't own the specified node        |
| `MarketPaused()`              | Market circuit breaker active                |
| `NoLiquidityForMarketOrder()` | No counterpart orders for market order       |

---

## Integration Notes

### Frontend Usage

```typescript
// Place a buy limit order via ethers.js
const tx = await diamond.placeOrder(
  baseTokenAddress, // ERC-1155 asset contract
  tokenId, // Asset token ID
  quoteTokenAddress, // Payment token (e.g., USDC)
  price, // 96-bit: price per unit in 18 decimals
  amount, // 96-bit: number of tokens
  true, // isBuy
  0, // GTC time-in-force
  0, // No expiry
);
```

### Approval Required

Before calling `placeOrder`, callers must:

- **Buy orders:** `quoteToken.approve(diamondAddress, price * amount)`
- **Sell orders:** `baseToken.setApprovalForAll(diamondAddress, true)`

---

## Related Pages

- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Smart Contracts/Facets/CLOBMatchingFacet]]
- [[Core Concepts/CLOB Trading]]
- [[Roles/Customer]]
- [[Roles/Node Operator]]
