# OrdersFacet

Business logic facet for basic order management. Part of the AuSys order functionality.

## Overview

Handles creation, updates, and cancellation of basic orders. This is a legacy facet that works with the original order storage structure.

## Events

### OrderCreated

```solidity
event OrderCreated(
    bytes32 indexed orderHash,
    address indexed buyer,
    address indexed seller,
    uint256 price,
    uint256 amount
);
```

### OrderUpdated

```solidity
event OrderUpdated(
    bytes32 indexed orderHash,
    string status
);
```

### AusysOrderCancelled

```solidity
event AusysOrderCancelled(
    bytes32 indexed orderHash,
    address indexed buyer
);
```

## Key Functions

### `createOrder()`

Creates a new order.

```solidity
function createOrder(
    address _buyer,
    address _seller,
    uint256 _price,
    uint256 _amount,
    string memory _status
) external returns (bytes32 orderHash)
```

**Parameters:**

- `_buyer` - Buyer address
- `_seller` - Seller address
- `_price` - Order price
- `_amount` - Order amount
- `_status` - Initial order status

**Returns:**

- `orderHash` - Generated order identifier

### `updateOrderStatus()`

Updates an order's status.

```solidity
function updateOrderStatus(bytes32 _orderHash, string memory _status) external
```

**Requirements:**

- Caller must be buyer or seller

### `cancelOrder()`

Cancels an order.

```solidity
function cancelOrder(bytes32 _orderHash) external
```

**Requirements:**

- Caller must be the buyer
- Order must not already be cancelled

### `getOrder()`

Retrieves order details.

```solidity
function getOrder(bytes32 _orderHash) external view returns (
    address buyer,
    address seller,
    uint256 price,
    uint256 amount,
    string memory status,
    uint256 createdAt
);
```

### `getBuyerOrders()`

Gets all orders for a buyer.

```solidity
function getBuyerOrders(address _buyer) external view returns (bytes32[] memory);
```

### `getSellerOrders()`

Gets all orders for a seller.

```solidity
function getSellerOrders(address _seller) external view returns (bytes32[] memory);
```

### `getTotalOrders()`

Returns total number of orders.

```solidity
function getTotalOrders() external view returns (uint256);
```

## Order Hash Calculation

```solidity
orderHash = keccak256(
    abi.encodePacked(buyer, seller, price, amount, block.timestamp, totalOrders)
);
```

## Status Values

| Status        | Description            |
| ------------- | ---------------------- |
| `"OPEN"`      | Order is active        |
| `"CANCELLED"` | Order was cancelled    |
| `"FILLED"`    | Order was fully filled |

## Related

- [OrderRouterFacet](./OrderRouterFacet.md) - Current order placement
- [OrderMatchingFacet](./OrderMatchingFacet.md) - Order matching logic
- [CLOBCoreFacet](./CLOBCoreFacet.md) - CLOB order management
