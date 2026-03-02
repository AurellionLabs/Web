# OrderEventFacet

Helper facet for emitting order events to support indexer backfilling.

## Overview

This facet emits the `OrderPlacedWithTokens` event for existing orders that were created before this event was added to the main order placement facet. It helps maintain indexer compatibility by allowing anyone to emit historical order events.

## Events

### OrderPlacedWithTokens

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

## Key Functions

### `emitOrderPlacedWithTokens()`

Emits an OrderPlacedWithTokens event for an existing order.

```solidity
function emitOrderPlacedWithTokens(
    bytes32 orderId,
    address baseToken,
    uint256 baseTokenId,
    address quoteToken
) external
```

**Parameters:**

- `orderId` - The order ID to emit event for
- `baseToken` - Base token (ERC1155) address
- `baseTokenId` - Base token ID
- `quoteToken` - Quote token (ERC20) address

**Requirements:**

- Order must exist (maker cannot be address(0))

## Usage

Anyone can call this function to help the indexer backfill historical orders:

```solidity
IOrderEventFacet(diamondAddress).emitOrderPlacedWithTokens(
    orderId,
    baseTokenAddress,
    tokenId,
    quoteTokenAddress
);
```

## Why This Exists

The indexer relies on events to reconstruct the order book state. When new event fields are added (like token addresses), existing orders don't automatically emit those events. This facet allows:

1. **Backfilling**: Emit events for old orders with new data
2. **Indexer Sync**: Help the indexer catch up on historical data
3. **No Migration**: Avoid expensive storage migrations

## Related

- [OrderRouterFacet](./OrderRouterFacet.md) - Current order placement
- [Indexer Architecture](../../Architecture/Indexer Architecture.md)
