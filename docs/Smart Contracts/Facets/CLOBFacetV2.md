# CLOBFacetV2

Production-ready Central Limit Order Book with gas-optimized storage and advanced features.

## Overview

CLOBFacetV2 is the production CLOB implementation featuring:
- Gas-optimized Red-Black tree order book
- MEV protection via commit-reveal (in CLOBMEVFacet)
- Order expiration (GTD)
- Circuit breakers
- Emergency recovery
- Multiple time-in-force options

## Events

### OrderCreated

```solidity
event OrderCreated(
    bytes32 indexed orderId,
    bytes32 indexed marketId,
    address indexed maker,
    uint256 price,
    uint256 amount,
    bool isBuy,
    uint8 orderType,
    uint8 timeInForce,
    uint256 expiry,
    uint256 nonce
);
```

### OrderPlacedWithTokens

Token-based event for indexer compatibility.

```solidity
event OrderPlacedWithTokens(
    bytes32 indexed orderId,
    address indexed maker,
    address indexed baseToken,
    uint256 baseTokenId,
    address quoteToken,
    uint256 price,
    uint256 amount,
    bool isBuy,
    uint8 orderType
);
```

### CLOBOrderFilled

```solidity
event CLOBOrderFilled(
    bytes32 indexed orderId,
    bytes32 indexed tradeId,
    uint256 fillAmount,
    uint256 fillPrice,
    uint256 remainingAmount,
    uint256 cumulativeFilled
);
```

### CLOBOrderCancelled

```solidity
event CLOBOrderCancelled(
    bytes32 indexed orderId,
    address indexed maker,
    uint256 remainingAmount,
    uint8 reason  // 0=user, 1=expired, 2=IOC unfilled, 3=FOK failed
);
```

### CLOBTradeExecuted

```solidity
event CLOBTradeExecuted(
    bytes32 indexed tradeId,
    bytes32 indexed takerOrderId,
    bytes32 indexed makerOrderId,
    address taker,
    address maker,
    bytes32 marketId,
    uint256 price,
    uint256 amount,
    uint256 quoteAmount,
    uint256 takerFee,
    uint256 makerFee,
    uint256 timestamp,
    bool takerIsBuy
);
```

## Errors

| Error | Description |
|-------|-------------|
| `InvalidPrice()` | Price is zero or exceeds maximum |
| `InvalidAmount()` | Amount is zero or exceeds maximum |
| `InvalidTimeInForce()` | Invalid time-in-force value |
| `OrderNotFound()` | Order does not exist |
| `OrderNotActive()` | Order is not in matchable state |
| `NotOrderMaker()` | Caller is not the order maker |
| `MarketPaused()` | Market is paused |
| `CircuitBreakerTrippedError()` | Circuit breaker is active |
| `RateLimitExceeded()` | Rate limit exceeded |
| `FOKNotFilled()` | Fill-or-kill order could not fill |
| `OrderExpiredError()` | Order has expired |

## Constants

```solidity
uint256 public constant BASIS_POINTS = 10000;
```

## Initialization

### `initializeCLOBV2()`

```solidity
function initializeCLOBV2(
    uint16 _takerFeeBps,
    uint16 _makerFeeBps,
    uint256 _defaultPriceChangeThreshold,
    uint256 _defaultCooldownPeriod,
    uint256 _emergencyTimelock
) external onlyOwner;
```

**Parameters:**
- `_takerFeeBps` - Taker fee in basis points (e.g., 10 = 0.1%)
- `_makerFeeBps` - Maker fee in basis points
- `_defaultPriceChangeThreshold` - Max price change for circuit breaker
- `_defaultCooldownPeriod` - Cooldown period after circuit breaker trip
- `_emergencyTimelock` - Timelock for emergency withdrawals

## Order Placement

### `placeLimitOrder()`

Place a limit order with time-in-force.

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
) external nonReentrant whenNotPaused checkRateLimit returns (bytes32 orderId);
```

**Parameters:**
- `baseToken` - ERC1155 token address
- `baseTokenId` - Token ID
- `quoteToken` - ERC20 token address
- `price` - Price per unit
- `amount` - Amount of base tokens
- `isBuy` - true for buy order
- `timeInForce` - 0=GTC, 1=IOC, 2=FOK, 3=GTD
- `expiry` - Expiration timestamp (required for GTD)

### Time-In-Force Options

| Value | Name | Description |
|-------|------|-------------|
| 0 | GTC | Good Till Cancelled |
| 1 | IOC | Immediate or Cancel |
| 2 | FOK | Fill or Kill |
| 3 | GTD | Good Till Date |

## Order Book Structure

Uses Red-Black tree for O(log n) operations:
- `bidTreeNodes[marketId]` - Buy orders (highest first)
- `askTreeNodes[marketId]` - Sell orders (lowest first)

Each price level contains cumulative amount for depth visualization.

## Circuit Breaker

Monitors price movements and halts trading if thresholds exceeded:

```solidity
// Check on each trade
if (priceChange > threshold) {
    // Trip circuit breaker
}
```

## Related

- [CLOBMEVFacet](./CLOBMEVFacet.md) - MEV protection
- [CLOBCoreFacet](./CLOBCoreFacet.md) - Core CLOB functions
- [OrderRouterFacet](./OrderRouterFacet.md) - Main order entry point
