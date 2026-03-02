# OrderMatchingLib

Library for order matching engine logic.

## Overview

`OrderMatchingLib` provides the core order matching functionality for the CLOB system. It handles:

- Price-time priority matching between orders
- Trade execution and token transfers
- Order fill tracking and updates

Extracted from `OrderRouterFacet` to reduce contract size and stack depth. Uses context structs to minimize stack variables.

## Key Concepts

### Matching Algorithm

The matcher follows price-time priority:

1. **Buy orders** match against lowest available sell prices
2. **Sell orders** match against highest available buy prices
3. At equal prices, earlier orders match first (FIFO)

### MatchContext

A struct used to pass multiple parameters and reduce stack depth:

```solidity
struct MatchContext {
    bytes32 marketId;
    address baseToken;
    uint256 baseTokenId;
    address quoteToken;
}
```

## Events

### RouterTradeExecuted

Emitted when a trade is executed through the matching engine.

```solidity
event RouterTradeExecuted(
    bytes32 indexed tradeId,
    bytes32 indexed takerOrderId,
    bytes32 indexed makerOrderId,
    uint256 price,
    uint256 amount,
    uint256 quoteAmount
);
```

## Functions

### `matchOrder()`

Main entry point for order matching. Routes to buy or sell matching.

```solidity
function matchOrder(
    DiamondStorage.AppStorage storage s,
    bytes32 orderId,
    bytes32 marketId,
    address baseToken,
    uint256 baseTokenId,
    address quoteToken
) internal
```

**Parameters:**

- `s` - Diamond app storage
- `orderId` - Order to match
- `marketId` - Market identifier
- `baseToken` - Base token (ERC1155) address
- `baseTokenId` - Base token ID
- `quoteToken` - Quote token (ERC20) address

**Behavior:**

1. Determines if order is buy or sell
2. Routes to appropriate matching function
3. Iterates through price levels matching as needed

---

### `_matchBuyOrder()`

Matches a buy order against existing sell orders.

```solidity
function _matchBuyOrder(
    DiamondStorage.AppStorage storage s,
    bytes32 buyOrderId,
    MatchContext memory ctx
) private
```

**Algorithm:**

1. Extract buy price and remaining amount
2. Find lowest ask price (`getBestPrice` with `getMin=true`)
3. While remaining > 0 and askPrice <= buyPrice:
   - Match against orders at that price level
   - Move to next higher ask price

---

### `_matchSellOrder()`

Matches a sell order against existing buy orders.

```solidity
function _matchSellOrder(
    DiamondStorage.AppStorage storage s,
    bytes32 sellOrderId,
    MatchContext memory ctx
) private
```

**Algorithm:**

1. Extract sell price and remaining amount
2. Find highest bid price (`getBestPrice` with `getMin=false`)
3. While remaining > 0 and bidPrice >= sellPrice:
   - Match against orders at that price level
   - Move to next lower bid price

---

### `_matchBuyAtPrice()`

Matches a buy order at a specific ask price level.

```solidity
function _matchBuyAtPrice(
    DiamondStorage.AppStorage storage s,
    bytes32 buyOrderId,
    MatchContext memory ctx,
    uint256 askPrice,
    uint256 remaining
) private returns (uint256)
```

**Returns:** Remaining amount after matching at this price level

---

### `_matchSellAtPrice()`

Matches a sell order at a specific bid price level.

```solidity
function _matchSellAtPrice(
    DiamondStorage.AppStorage storage s,
    bytes32 sellOrderId,
    MatchContext memory ctx,
    uint256 bidPrice,
    uint256 remaining
) private returns (uint256)
```

**Returns:** Remaining amount after matching at this price level

## Internal Helpers

### `_getRemaining()`

Gets the unfilled amount for an order.

```solidity
function _getRemaining(
    DiamondStorage.AppStorage storage s,
    bytes32 orderId
) private view returns (uint256)
```

---

### `_calculateFill()`

Calculates the fill amount for a counter-order.

```solidity
function _calculateFill(
    DiamondStorage.AppStorage storage s,
    bytes32 orderId,
    uint256 remaining
) private view returns (uint256)
```

**Logic:** Returns `min(remaining, counterRemaining)`

---

### `_executeTrade()`

Executes a trade between two orders.

```solidity
function _executeTrade(
    DiamondStorage.AppStorage storage s,
    bytes32 buyOrderId,
    bytes32 sellOrderId,
    MatchContext memory ctx,
    uint96 price,
    uint96 amount
) private
```

**Steps:**

1. Get buyer and seller addresses from order data
2. Calculate quote amount: `price * amount`
3. Transfer base tokens: Diamond → Buyer
4. Transfer quote tokens: Seller → Buyer (or from escrow)
5. Update fill amounts on both orders
6. Emit trade event

---

### `_updateOrderFilled()`

Updates the filled amount and status of an order.

```solidity
function _updateOrderFilled(
    DiamondStorage.PackedOrder storage order,
    uint256 fillAmount
) private
```

**Updates:**

- Increases filled amount
- Updates status to `PARTIAL` or `FILLED` if fully filled

---

### `_emitTradeEvent()`

Emits the trade executed event.

```solidity
function _emitTradeEvent(
    DiamondStorage.AppStorage storage s,
    bytes32 buyOrderId,
    bytes32 sellOrderId,
    uint96 price,
    uint96 amount,
    uint256 quoteAmount
) private
```

**Trade ID generation:** `keccak256(abi.encodePacked(buyOrderId, sellOrderId, block.timestamp, s.totalTrades++))`

## Trade Flow

```
User places order
       ↓
OrderRouterFacet.placeOrder()
       ↓
OrderMatchingFacet.matchOrder()
       ↓
OrderMatchingLib.matchOrder()
       ↓
_matchBuyOrder() / _matchSellOrder()
       ↓
_matchAtPrice() (loops through price levels)
       ↓
_executeTrade() (token transfers)
       ↓
Emit RouterTradeExecuted
```

## Integration

This library is used by:

- `OrderMatchingFacet` - Primary matching entry point
- `OrderRouterFacet` - Order placement and routing

It depends on:

- `DiamondStorage` - For accessing order data
- `CLOBLib` - For order packing/unpacking
- `OrderBookLib` - For price tree navigation

## Related

- [OrderBookLib](./OrderBookLib.md) - Price level management
- [CLOBLib](./CLOBLib.md) - Order data structures
- [DiamondStorage](./DiamondStorage.md) - Storage layouts
- [OrderRouterFacet](../Facets/OrderRouterFacet.md) - Order placement
