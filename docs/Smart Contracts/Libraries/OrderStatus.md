# OrderStatus

Shared status constants for all order types across facets. Use these instead of magic numbers for consistency.

## Overview

Defines standardized status codes for different order systems in the Aurellion protocol:

- AuSys Orders
- Unified Orders (Bridge)
- Logistics Orders
- Journey Status
- CLOB Orders

## AuSys Order Status

| Constant | Value | Description |
|----------|-------|-------------|
| `AUSYS_CREATED` | 0 | Order created, not yet processed |
| `AUSYS_PROCESSING` | 1 | Order is being processed |
| `AUSYS_SETTLED` | 2 | Order successfully settled |
| `AUSYS_CANCELED` | 3 | Order was cancelled |
| `AUSYS_EXPIRED` | 4 | Order expired before execution |

## Unified Order Status (Bridge)

| Constant | Value | Description |
|----------|-------|-------------|
| `UNIFIED_PENDING_TRADE` | 0 | Awaiting trade match |
| `UNIFIED_TRADE_MATCHED` | 1 | Trade has been matched |
| `UNIFIED_LOGISTICS_CREATED` | 2 | Logistics order created |
| `UNIFIED_IN_TRANSIT` | 3 | Assets in transit |
| `UNIFIED_DELIVERED` | 4 | Assets delivered |
| `UNIFIED_SETTLED` | 5 | Complete settlement |
| `UNIFIED_CANCELLED` | 6 | Order cancelled |

## Logistics Order Status

| Constant | Value | Description |
|----------|-------|-------------|
| `LOGISTICS_CREATED` | 0 | Logistics order created |
| `LOGISTICS_ASSIGNED` | 1 | Driver assigned |
| `LOGISTICS_PICKED_UP` | 2 | Package picked up |
| `LOGISTICS_IN_TRANSIT` | 3 | Package in transit |
| `LOGISTICS_DELIVERED` | 4 | Package delivered |
| `LOGISTICS_SETTLED` | 5 | Payment settled |
| `LOGISTICS_CANCELLED` | 6 | Order cancelled |
| `LOGISTICS_DISPUTED` | 7 | Dispute opened |

## Journey Status

| Constant | Value | Description |
|----------|-------|-------------|
| `JOURNEY_PENDING` | 0 | Journey not started |
| `JOURNEY_IN_TRANSIT` | 1 | Currently in transit |
| `JOURNEY_DELIVERED` | 2 | Delivered successfully |
| `JOURNEY_CANCELED` | 3 | Journey cancelled |

## CLOB Order Status

| Constant | Value | Description |
|----------|-------|-------------|
| `CLOB_OPEN` | 0 | Order open, not filled |
| `CLOB_PARTIALLY_FILLED` | 1 | Order partially filled |
| `CLOB_FILLED` | 2 | Order fully filled |
| `CLOB_CANCELLED` | 3 | Order cancelled |
| `CLOB_EXPIRED` | 4 | Order expired |

## Helper Functions

### `ausysStatusName()`

```solidity
function ausysStatusName(uint8 status) internal pure returns (string memory)
```

Returns human-readable name for AuSys status.

### `unifiedStatusName()`

```solidity
function unifiedStatusName(uint8 status) internal pure returns (string memory)
```

Returns human-readable name for Unified/Bridge status.

### `logisticsStatusName()`

```solidity
function logisticsStatusName(uint8 status) internal pure returns (string memory)
```

Returns human-readable name for Logistics status.

## Usage

```solidity
import { OrderStatus } from './libraries/OrderStatus.sol';

// Using constants
if (order.status == OrderStatus.CLOB_OPEN) {
    // Order is open
}

// Getting status name
string memory statusName = OrderStatus.logisticsStatusName(order.status);
```

## Related

- [BridgeFacet](./BridgeFacet.md) - Unified orders
- [CLOBFacetV2](./CLOBFacetV2.md) - CLOB orders
- [CLOBLogisticsFacet](./CLOBLogisticsFacet.md) - Logistics
