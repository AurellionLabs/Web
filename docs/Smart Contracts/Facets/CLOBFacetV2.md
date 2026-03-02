---
tags: [smart-contracts, facets, clob, order-book, trading]
---

# CLOBFacetV2

[[🏠 Home]] > Smart Contracts > Facets > CLOBFacetV2

`CLOBFacetV2.sol` is the production-ready implementation of Aurellion's Central Limit Order Book (CLOB). It provides gas-optimized order storage, MEV protection, order expiration, circuit breakers, and emergency recovery mechanisms.

---

## Overview

| Property | Value |
|----------|-------|
| **File** | `contracts/diamond/facets/CLOBFacetV2.sol` |
| **Inherits** | `ReentrancyGuard` |
| **Storage** | `DiamondStorage.AppStorage` |
| **EIP** | EIP-2535 (Diamond Standard) |

---

## Core Concepts

### Order Types

| Type | Value | Description |
|------|-------|-------------|
| `LIMIT` | 0 | Standard limit order |
| `MARKET` | 1 | Execute at market price |
| `STOP_LOSS` | 2 | Trigger on price drop |
| `STOP_GAIN` | 3 | Trigger on price rise |

### Time in Force

| TIF | Value | Behavior |
|-----|-------|----------|
| `GTC` | 0 | Good Till Cancelled — stays on book until filled or cancelled |
| `IOC` | 1 | Immediate Or Cancel — fill what possible, cancel rest |
| `FOK` | 2 | Fill Or Kill — must fill entirely or revert |
| `GTD` | 3 | Good Till Date — expires at specified timestamp |

### Order Status

| Status | Value | Description |
|--------|-------|-------------|
| `ACTIVE` | 0 | On the order book |
| `PARTIAL_FILLED` | 1 | Partially executed |
| `FILLED` | 2 | Fully executed |
| `CANCELLED` | 3 | Cancelled/expired |

---

## Key Functions

### Initialization

```solidity
function initializeCLOBV2(
    uint16 _takerFeeBps,
    uint16 _makerFeeBps,
    uint256 _defaultPriceChangeThreshold,
    uint256 _defaultCooldownPeriod,
    uint256 _emergencyTimelock
) external onlyOwner
```

Configures CLOB V2 parameters:
- `takerFeeBps` — Taker fee in basis points (e.g., 30 = 0.3%)
- `makerFeeBps` — Maker rebate in basis points
- `defaultPriceChangeThreshold` — Max price change per block
- `defaultCooldownPeriod` — Time between order modifications
- `emergencyTimelock` — Delay for emergency operations

---

### Place Limit Order

```solidity
function placeLimitOrder(
    address baseToken,
    uint256 baseTokenId,
    address quoteToken,
    uint96 price,
    uint96 amount,
    bool isBuy,
    uint8 timeInForce,
    uint40 expiry
) external nonReentrant whenNotPaused checkRateLimit
    returns (bytes32 orderId)
```

Places a limit order on the order book.

**Parameters:**
- `baseToken` — ERC-1155 token address
- `baseTokenId` — Token ID
- `quoteToken` — ERC-20 quote token (USDC)
- `price` — Price per unit (in quote token decimals)
- `amount` — Quantity of base tokens
- `isBuy` — `true` for bid, `false` for ask
- `timeInForce` — GTC/IOC/FOK/GTD
- `expiry` — Expiration timestamp (for GTD)

**Requirements:**
- Price and amount > 0
- Valid time in force
- Market not paused
- Rate limit not exceeded

**Events:**
- `OrderCreated` — Order placed
- `OrderPlacedWithTokens` — Token-specific event for indexer

---

### Place Market Order

```solidity
function placeMarketOrder(
    address baseToken,
    uint256 baseTokenId,
    address quoteToken,
    uint96 amount,
    bool isBuy
) external nonReentrant whenNotPaused checkRateLimit
    returns (bytes32 orderId, uint256 filledAmount)
```

Executes immediately at best available price.

---

### Cancel Order

```solidity
function cancelOrder(bytes32 orderId) external nonReentrant
    returns (uint256 remainingAmount)
```

Cancels an active order and returns unfilled amount to maker.

**Requirements:**
- Caller must be order maker
- Order must be active or partial

**Events:**
- `CLOBOrderCancelled` — Order cancelled

---

### Get Order Book

```solidity
function getOrderBook(
    bytes32 marketId,
    uint256 limit
) external view returns (PriceLevel[] bids, PriceLevel[] asks)
```

Returns aggregated price levels for display.

---

### Get Market Stats

```solidity
function getMarketStats(bytes32 marketId) external view returns (
    uint256 lastPrice,
    uint25624hVolume,
    uint25624hHigh,
    uint25624hLow,
    uint256 bestBid,
    uint256 bestAsk,
    uint256 orderCount
)
```

---

## Circuit Breaker

CLOBFacetV2 includes circuit breaker functionality to protect against market manipulation:

```solidity
function checkCircuitBreaker(bytes32 marketId, uint256 price) internal view
```

If price moves beyond threshold vs last trade:
1. Block new orders at extreme prices
2. Allow cancellations only
3. Emit `CircuitBreakerTripped` event

---

## Rate Limiting

Prevents spam and front-running:

```solidity
// Limits per block (configurable)
maxOrdersPerBlock = 100
maxVolumePerBlock = 1,000,000e18
```

---

## Fee Structure

| Role | Fee |
|------|-----|
| Taker | `takerFeeBps` (default ~30 bps = 0.3%) |
| Maker | Rebate `makerFeeBps` (default ~10 bps = 0.1%) |

Fees are collected in quote token on each trade.

---

## Events

| Event | Description |
|-------|-------------|
| `OrderCreated` | New order placed |
| `OrderPlacedWithTokens` | Token-specific order event |
| `CLOBOrderFilled` | Order partially filled |
| `CLOBOrderCancelled` | Order cancelled |
| `OrderExpired` | GTD order expired |
| `CLOBTradeExecuted` | Trade executed |
| `MarketCreated` | New market registered |

---

## Storage Layout

Uses packed storage for gas optimization:

```solidity
struct PackedOrder {
    bytes32 marketId;
    address maker;
    uint96 price;
    uint96 amount;
    uint96 filled;
    uint40 expiry;
    uint8 status;
    uint8 orderType;
    uint8 timeInForce;
    bool isBuy;
}
```

---

## Related Pages

- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Smart Contracts/Facets/CLOBViewFacet]]
- [[Smart Contracts/Facets/CLOBMatchingFacet]]
- [[Smart Contracts/Facets/CLOBMEVFacet]]
- [[Smart Contracts/Facets/CLOBAdminFacet]]
- [[Core Concepts/CLOB Trading]]
