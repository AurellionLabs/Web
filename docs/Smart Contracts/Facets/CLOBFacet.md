# CLOBFacet

**⚠️ DEPRECATED: Use OrderRouterFacet for new integrations**

Business logic facet for CLOB (Central Limit Order Book) operations. This is the legacy facet - most order functions now redirect to OrderRouterFacet.

## Deprecation Notice

This facet is deprecated. While still functional for backward compatibility:

- **New orders**: Use `OrderRouterFacet.placeOrder()` instead
- **Market orders**: Use `OrderRouterFacet.placeMarketOrder()` instead
- **View functions**: Still available for querying historical data

Orders placed here use V1 storage and may not match with V2 orders.

## Events

### OrderPlaced (Legacy)

```solidity
event OrderPlaced(
    bytes32 indexed orderId,
    address indexed maker,
    bytes32 indexed marketId,
    uint256 price,
    uint256 amount,
    bool isBuy,
    uint8 orderType
);
```

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

### TradeExecuted

```solidity
event TradeExecuted(
    bytes32 indexed tradeId,
    address indexed taker,
    address indexed maker,
    bytes32 marketId,
    uint256 price,
    uint256 amount,
    uint256 quoteAmount,
    uint256 timestamp
);
```

### PoolCreated

```solidity
event PoolCreated(
    bytes32 indexed poolId,
    string baseToken,
    uint256 baseTokenId,
    string quoteToken
);
```

## Constants

```solidity
uint8 public constant TAKER_FEE = 10;    // 0.10%
uint8 public constant MAKER_FEE = 5;      // 0.05%
uint8 public constant LP_FEE = 5;         // 0.05%
```

## Deprecated Functions

### `placeOrder()`

```solidity
function placeOrder(
    bytes32 _marketId,
    uint256 _price,
    uint256 _amount,
    bool _isBuy,
    uint8 _orderType
) external returns (bytes32 orderId)
```

**⚠️ DEPRECATED**: Use `OrderRouterFacet.placeOrder()` instead

### `placeBuyOrder()`

```solidity
function placeBuyOrder(
    address _baseToken,
    uint256 _baseTokenId,
    address _quoteToken,
    uint256 _price,
    uint256 _amount
) external returns (bytes32 orderId)
```

**⚠️ DEPRECATED**: Now redirects to `OrderRouterFacet.placeOrder()` with `isBuy=true`

### `placeMarketOrder()`

```solidity
function placeMarketOrder(
    address _baseToken,
    uint256 _baseTokenId,
    address _quoteToken,
    uint256 _amount,
    bool _isBuy,
    uint256 _maxPrice
) external returns (bytes32 orderId)
```

**⚠️ DEPRECATED**: Now redirects to `OrderRouterFacet.placeMarketOrder()`

## Active Functions (View/Query)

### `createMarket()`

Creates a new trading market. Requires owner.

```solidity
function createMarket(
    string memory _baseToken,
    uint256 _baseTokenId,
    string memory _quoteToken
) external returns (bytes32 marketId);
```

### `getOrder()`

Retrieves order details.

```solidity
function getOrder(bytes32 _orderId) external view returns (...);
```

### `getTrade()`

Retrieves trade details.

```solidity
function getTrade(bytes32 _tradeId) external view returns (...);
```

### `getPool()`

Retrieves liquidity pool details.

```solidity
function getPool(bytes32 _poolId) external view returns (...);
```

### `getMarket()`

Retrieves market details.

```solidity
function getMarket(bytes32 _marketId) external view returns (...);
```

### `getOpenOrders()`

Gets all open orders for a market.

```solidity
function getOpenOrders(
    address _baseToken,
    uint256 _baseTokenId,
    address _quoteToken
) external view returns (bytes32[] memory buyOrders, bytes32[] memory sellOrders);
```

### `cancelOrder()` / `cancelCLOBOrder()`

Cancels an order.

```solidity
function cancelOrder(bytes32 _orderHash) external;
function cancelCLOBOrder(bytes32 _orderId) external;
```

## Migration Guide

Replace deprecated calls:

| Old (CLOBFacet)                  | New (OrderRouterFacet)                     |
| -------------------------------- | ------------------------------------------ |
| `placeBuyOrder(a,b,c,d,e)`       | `placeOrder(a,b,c,d,e,true,0,0)`           |
| `placeMarketOrder(a,b,c,d,e,f)`  | `placeMarketOrder(a,b,c,d,e,f)`            |
| `placeOrder(mid,p,amt,buy,type)` | `placeOrder(token,id,quote,p,amt,buy,0,0)` |

## Related

- [OrderRouterFacet](./OrderRouterFacet.md) - Current order placement
- [CLOBFacetV2](./CLOBFacetV2.md) - Production CLOB
- [CLOBCoreFacet](./CLOBCoreFacet.md) - Core CLOB functions
