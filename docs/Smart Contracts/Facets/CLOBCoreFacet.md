---
tags: [smart-contracts, facets, clob, order-book, trading]
---

# CLOBCoreFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > CLOBCoreFacet

`CLOBCoreFacet.sol` handles **order creation and cancellation** within the Aurellion Central Limit Order Book. It is one of three CLOB facets (along with [[Smart Contracts/Facets/CLOBMatchingFacet]] and [[Smart Contracts/Facets/OrderRouterFacet]]) that together implement the full CLOB system.

> ⭐ **Recommended entry point:** Use [[Smart Contracts/Facets/OrderRouterFacet]] (`placeOrder`, `placeMarketOrder`) for all order placement. `CLOBCoreFacet` is used internally by the router.

---

## Overview

| Property    | Value                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| File        | `contracts/diamond/facets/CLOBCoreFacet.sol`                                      |
| Inherits    | `ReentrancyGuard`                                                                 |
| Storage     | [[Smart Contracts/Libraries/DiamondStorage]] V2 (`packedOrders`, Red-Black Trees) |
| Key library | `CLOBLib` for quote amount calculation                                            |

---

## Initialisation

#### `initializeCLOBV2(uint16 takerFeeBps, uint16 makerFeeBps, uint256 priceChangeThreshold, uint256 cooldownPeriod, uint256 emergencyTimelock)`

Owner-only. Sets up the CLOB V2 system parameters:

- `takerFeeBps` / `makerFeeBps` — fee rates in basis points
- `priceChangeThreshold` — % price movement that trips circuit breaker
- `cooldownPeriod` — blocks circuit breaker stays active
- `emergencyTimelock` — delay before emergency actions take effect
- Defaults: `minRevealDelay=2`, `commitmentThreshold=10,000e18`, `maxOrdersPerBlock=100`, `maxVolumePerBlock=1,000,000e18`

---

## Order Placement

### `placeLimitOrder(...) → bytes32 orderId`

Places a limit order with Time-In-Force (TIF) specification.

**Parameters:**

| Parameter     | Type      | Description                                     |
| ------------- | --------- | ----------------------------------------------- |
| `baseToken`   | `address` | ERC-1155 token address (the asset being traded) |
| `baseTokenId` | `uint256` | ERC-1155 token ID                               |
| `quoteToken`  | `address` | ERC-20 token used for payment                   |
| `price`       | `uint96`  | Price per unit in quote token (18 decimals)     |
| `amount`      | `uint96`  | Number of base tokens                           |
| `isBuy`       | `bool`    | True = buy order, False = sell order            |
| `timeInForce` | `uint8`   | 0=GTC, 1=IOC, 2=FOK, 3=GTD                      |
| `expiry`      | `uint40`  | Unix timestamp for GTD orders (0 for others)    |

**Modifiers:** `nonReentrant`, `whenNotPaused`, `checkRateLimit`

**Commit-Reveal Check:**
If `quoteAmount >= commitmentThreshold` (10,000e18), the function reverts with `OrderRequiresCommitReveal`. Large orders must use the MEV-protected commit-reveal flow via `CLOBMEVFacet`.

**Process:**

1. Validates parameters
2. Checks rate limit (`maxOrdersPerBlock` per address)
3. Calculates quote amount: `price * amount / 1e18`
4. If large order → revert `OrderRequiresCommitReveal`
5. Creates `PackedOrder` (gas-efficient 3-slot struct)
6. Inserts into appropriate price level (bid or ask)
7. Emits `OrderCreated`

**Time-In-Force Values:**

| TIF | Value | Behaviour                                                     |
| --- | ----- | ------------------------------------------------------------- |
| GTC | 0     | Good Till Cancelled — stays in book until filled or cancelled |
| IOC | 1     | Immediate Or Cancel — fills what it can, cancels remainder    |
| FOK | 2     | Fill Or Kill — fills entirely or reverts                      |
| GTD | 3     | Good Till Date — cancelled at `expiry` timestamp              |

---

## Order Cancellation

### `cancelOrder(bytes32 orderId)`

Cancels an open order and returns escrowed tokens to the maker.

**Reverts:**

- `OrderNotFound()` — orderId doesn't exist
- `OrderNotActive()` — order already filled/cancelled
- `NotOrderMaker()` — caller is not the order creator

**Process:**

1. Validates order exists and is active
2. Validates `msg.sender == order.maker`
3. Removes order from price level queue
4. Returns escrowed tokens: quote tokens for buys, base tokens for sells
5. Marks order as CANCELLED
6. Emits `CLOBOrderCancelled(orderId, maker, remainingAmount, reason=USER_CANCELLED)`

---

## Events

| Event                                                                                         | Description        |
| --------------------------------------------------------------------------------------------- | ------------------ |
| `OrderCreated(orderId, marketId, maker, price, amount, isBuy, orderType, TIF, expiry, nonce)` | New order placed   |
| `CLOBOrderCancelled(orderId, maker, remainingAmount, reason)`                                 | Order cancelled    |
| `OrderExpired(orderId, expiredAt)`                                                            | GTD order expired  |
| `MarketCreated(marketId, baseToken, baseTokenId, quoteToken)`                                 | New market created |

---

## Errors

| Error                         | Condition                            |
| ----------------------------- | ------------------------------------ |
| `InvalidPrice()`              | `price == 0`                         |
| `InvalidAmount()`             | `amount == 0`                        |
| `InvalidTimeInForce()`        | TIF value out of range               |
| `OrderNotFound()`             | Unknown orderId                      |
| `OrderNotActive()`            | Order not in ACTIVE status           |
| `NotOrderMaker()`             | Canceller is not maker               |
| `MarketPaused()`              | Circuit breaker active               |
| `OrderRequiresCommitReveal()` | Order too large for direct placement |
| `RateLimitExceeded()`         | Too many orders in current block     |
| `OrderExpiredError()`         | Order expiry has passed              |

---

## Rate Limiting

The `checkRateLimit` modifier enforces per-block limits:

- `maxOrdersPerBlock` (default: 100) — number of orders per address per block
- `maxVolumePerBlock` (default: 1,000,000e18) — total volume per block

---

## Circuit Breaker

Each market has a `CircuitBreaker` struct in `AppStorage` that:

- Monitors price change vs. `defaultPriceChangeThreshold`
- Pauses the market for `defaultCooldownPeriod` blocks when tripped
- Can be manually reset by owner via `CLOBAdminFacet`

---

## PackedOrder Layout

```
Slot 1: makerAndFlags
  [159:0]   maker address (160 bits)
  [160]     isBuy (1 bit)
  [162:161] orderType (2 bits): 0=Market, 1=Limit, 2=StopLimit, 3=TWAP
  [164:163] status (2 bits): 0=Active, 1=Filled, 2=Cancelled, 3=Expired
  [167:165] timeInForce (3 bits)
  [255:168] nonce (88 bits)

Slot 2: priceAmountFilled
  [95:0]    price (96 bits, 18 decimals)
  [191:96]  amount (96 bits)
  [255:192] filledAmount (64 bits)

Slot 3: expiryCreatedMarket
  [39:0]    expiry (40 bits, unix timestamp)
  [79:40]   createdAt (40 bits, unix timestamp)
  [111:80]  marketIndex (32 bits)
  [271:112] baseToken reference (160 bits)
```

---

## Related Pages

- [[Smart Contracts/Facets/CLOBMatchingFacet]]
- [[Smart Contracts/Facets/OrderRouterFacet]]
- [[Core Concepts/CLOB Trading]]
- [[Technical Reference/Events Reference]]
