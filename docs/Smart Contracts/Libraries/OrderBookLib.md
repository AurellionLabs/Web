# OrderBookLib

Library for order book management - tree operations and price levels.

## Overview

`OrderBookLib` provides the core order book management functionality for the CLOB system. It handles:

- Adding/removing orders from price levels
- Red-Black tree operations for price discovery
- FIFO queue management at each price level

Extracted from `OrderRouterFacet` to reduce contract size and stack depth.

## Key Concepts

### Price Levels

Each price level maintains:

- `head` - First order in FIFO queue
- `tail` - Last order in FIFO queue
- `totalAmount` - Aggregate amount at this price
- `orderCount` - Number of orders at this price

### Red-Black Tree

Prices are stored in a Red-Black tree for O(log n) operations:

- **Ask tree**: Sorted ascending (lowest price first)
- **Bid tree**: Sorted descending (highest price first)

## Functions

### `addToOrderBook()`

Adds an order to the order book at the specified price level.

```solidity
function addToOrderBook(
    DiamondStorage.AppStorage storage s,
    bytes32 orderId,
    bytes32 marketId,
    uint256 price,
    uint256 amount,
    bool isBuy
) internal
```

**Parameters:**

- `s` - Diamond app storage
- `orderId` - Unique order identifier
- `marketId` - Market identifier
- `price` - Order price (in wei scaled units)
- `amount` - Order amount
- `isBuy` - True for buy orders (bid tree), false for sell (ask tree)

**Behavior:**

1. Inserts price level into tree if new
2. Adds order to FIFO queue at price level
3. Updates aggregate totals

---

### `removeFromPriceLevel()`

Removes amount from a price level when an order is cancelled or filled.

```solidity
function removeFromPriceLevel(
    DiamondStorage.AppStorage storage s,
    bytes32 marketId,
    uint256 price,
    uint256 amount,
    bool isBuy
) internal
```

**Parameters:**

- `s` - Diamond app storage
- `marketId` - Market identifier
- `price` - Price level to update
- `amount` - Amount to remove
- `isBuy` - Whether this is a bid level

---

### `getBestPrice()`

Gets the best price from a tree (minimum for asks, maximum for bids).

```solidity
function getBestPrice(
    DiamondStorage.RBTreeMeta storage meta,
    mapping(uint256 => DiamondStorage.RBNode) storage nodes,
    bool getMin
) internal view returns (uint256)
```

**Parameters:**

- `meta` - Tree metadata
- `nodes` - Tree nodes mapping
- `getMin` - True for minimum (asks), false for maximum (bids)

**Returns:** Best price, or 0 if tree is empty

---

### `getNextHigher()`

Gets the next higher price in the ask tree.

```solidity
function getNextHigher(
    mapping(uint256 => DiamondStorage.RBNode) storage nodes,
    uint256 price
) internal view returns (uint256)
```

**Use case:** When matching a buy order, iterate from lowest ask upward.

---

### `getNextLower()`

Gets the next lower price in the bid tree.

```solidity
function getNextLower(
    mapping(uint256 => DiamondStorage.RBNode) storage nodes,
    uint256 price
) internal view returns (uint256)
```

**Use case:** When matching a sell order, iterate from highest bid downward.

## Internal Functions

### `_insertPriceLevel()`

Creates a new price level node in the Red-Black tree.

### `_insertNode()`

Standard binary search tree insertion. Note: This is a simplified BST insert without Red-Black rebalancing since we only add prices (never delete individual prices in the middle).

## Storage Layout

### RBTreeMeta

```solidity
struct RBTreeMeta {
    uint256 root;   // Root node price
    uint256 count;  // Number of price levels
}
```

### RBNode

```solidity
struct RBNode {
    uint256 parent;
    uint256 left;
    uint256 right;
    uint8 color;        // 0 = black, 1 = red
    bool exists;        // Whether this price level exists
    uint256 totalAmount;  // Aggregate amount at this price
    uint256 orderCount;   // Number of orders at this price
}
```

### PriceLevel

```solidity
struct PriceLevel {
    bytes32 head;     // First order ID in FIFO queue
    bytes32 tail;     // Last order ID in FIFO queue
    uint256 totalAmount;  // Sum of all order amounts
    uint256 orderCount;   // Number of orders
}
```

## Usage in Matching

The matching engine uses these functions:

1. `getBestPrice()` - Find the best available price
2. `_matchAtPrice()` - Match against orders in FIFO queue
3. `getNextHigher/Lower` - Move to next price level if needed
4. `removeFromPriceLevel()` - Update totals after fills

## Related

- [DiamondStorage](./DiamondStorage.md) - Storage layouts
- [OrderMatchingLib](./OrderMatchingLib.md) - Matching engine
- [CLOBLib](./CLOBLib.md) - Order packing and utilities
