# OrderMatchingFacet

Order matching and trade execution logic. Handles V1/V2 hybrid matching for the Central Limit Order Book.

## Overview

This facet handles the core matching logic for orders, supporting both the legacy V1 array-based storage and the newer V2 tree-based storage. It performs price-time priority matching between buy and sell orders.

## Events

### AusysOrderFilled

```solidity
event AusysOrderFilled(
    bytes32 indexed orderId,
    bytes32 indexed tradeId,
    uint256 fillAmount,
    uint256 fillPrice,
    uint256 remainingAmount,
    uint256 cumulativeFilled
);
```

### TradeExecuted

```solidity
event TradeExecuted(
    bytes32 indexed tradeId,
    bytes32 indexed takerOrderId,
    bytes32 indexed makerOrderId,
    uint256 price,
    uint256 amount,
    uint256 quoteAmount
);
```

### MatchingOrderCancelled

```solidity
event MatchingOrderCancelled(
    bytes32 indexed orderId,
    address indexed maker,
    uint256 remainingAmount,
    uint8 reason
);
```

## Key Functions

### `matchOrder()`

Matches an order against the order book.

```solidity
function matchOrder(
    bytes32 orderId,
    bytes32 marketId,
    address baseToken,
    uint256 baseTokenId,
    address quoteToken
) external
```

**Parameters:**

- `orderId` - The order to match
- `marketId` - Market identifier
- `baseToken` - Base token (ERC1155) address
- `baseTokenId` - Base token ID
- `quoteToken` - Quote token (ERC20) address

### `cancelOrderInternal()`

Internal order cancellation.

```solidity
function cancelOrderInternal(bytes32 orderId, uint8 reason) external
```

**Parameters:**

- `orderId` - Order to cancel
- `reason` - Cancellation reason code

## Matching Algorithm

### Buy Order Matching

1. Unpack order price and amount
2. Find best ask price (lowest)
3. While remaining > 0 and askPrice <= buyPrice:
   - Match against orders at that price level
   - Move to next higher ask price
4. If remaining > 0, check V1 legacy orders

### Sell Order Matching

1. Unpack order price and amount
2. Find best bid price (highest)
3. While remaining > 0 and bidPrice >= sellPrice:
   - Match against orders at that price level
   - Move to next lower bid price
4. If remaining > 0, check V1 legacy orders

## V1/V2 Hybrid Matching

The facet supports both V1 and V2 order storage:

- **V2 Orders**: Stored in `packedOrders` using optimized packing
- **V1 Orders**: Stored in `clobOrders` with array-based price levels

This allows gradual migration and backward compatibility.

## Trade Execution

When a match occurs:

1. Calculate fill amount (min of remaining amounts)
2. Transfer base tokens: Diamond → Buyer
3. Transfer quote tokens: Buyer → Seller (or Diamond escrowed → Seller)
4. Update order fill amounts
5. Update price level totals
6. Emit TradeExecuted event

## Internal Helpers

### `_unpack()`

Extracts price, amount, and filled amount from packed order data.

```solidity
function _unpack(uint256 packed) internal pure returns (uint96 price, uint96 amount, uint64 filled)
```

### `_updateOrderFilled()`

Updates the filled amount and status of an order.

### `_updatePriceLevel()`

Updates cumulative amounts at a price level.

### Tree Navigation

- `_getBestPrice()` - Get min/max price in tree
- `_getNextHigher()` - Get next price in tree (for asks)
- `_getNextLower()` - Get next price in tree (for bids)

## Related

- [OrderRouterFacet](./OrderRouterFacet.md) - Order placement entry point
- [CLOBCoreFacet](./CLOBCoreFacet.md) - CLOB core functions
- [CLOBMatchingFacet](./CLOBMatchingFacet.md) - Additional matching
