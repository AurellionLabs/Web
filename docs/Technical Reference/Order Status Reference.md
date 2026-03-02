---
tags: [reference, status, orders, journeys, enums]
---

# Order & Journey Status Reference

[[🏠 Home]] > Technical Reference > Order Status Reference

Complete reference of every status code and enum used across Aurellion's order and logistics systems. Multiple systems track status independently — this page clarifies all of them.

---

## System Overview

Aurellion has **four distinct status systems**:

| System                   | Contract                    | What it tracks                       |
| ------------------------ | --------------------------- | ------------------------------------ |
| **CLOB Order Status**    | PackedOrder (CLOBCoreFacet) | Digital order book state             |
| **Unified Order Status** | UnifiedOrder (BridgeFacet)  | Combined trade + logistics lifecycle |
| **AuSys Order Status**   | AuSysOrder (AuSysFacet)     | Physical logistics order             |
| **Journey Status**       | Journey/AuSysJourney        | Single delivery leg                  |

---

## 1. CLOB Order Status

Stored in bits [164:163] of `PackedOrder.makerAndFlags`.

| Value | Name               | Description                                  |
| ----- | ------------------ | -------------------------------------------- |
| `0`   | `ACTIVE`           | In the order book, available to match        |
| `1`   | `PARTIALLY_FILLED` | Some quantity filled, remainder still active |
| `2`   | `FILLED`           | Fully matched and settled                    |
| `3`   | `CANCELLED`        | Cancelled by maker or expired                |

**Cancellation reasons** (emitted in `CLOBOrderCancelled.reason`):

| Value | Reason                                          |
| ----- | ----------------------------------------------- |
| `0`   | `USER_CANCELLED` — maker called `cancelOrder()` |
| `1`   | `EXPIRED` — GTD order past expiry               |
| `2`   | `IOC_REMAINDER` — IOC unfilled portion          |
| `3`   | `ADMIN_CANCELLED` — cancelled by admin          |

---

## 2. Unified Order Status (BridgeFacet)

Defined in `OrderStatus.sol`. Stored in `UnifiedOrder.status`.

| Value | Constant                | Description                                          |
| ----- | ----------------------- | ---------------------------------------------------- |
| `0`   | `UNIFIED_PENDING_TRADE` | Created, waiting for CLOB match confirmation         |
| `1`   | `UNIFIED_TRADE_MATCHED` | CLOB trade confirmed, waiting for logistics setup    |
| `2`   | `UNIFIED_IN_LOGISTICS`  | Physical delivery in progress                        |
| `3`   | `UNIFIED_SETTLED`       | Fully complete — tokens delivered, funds distributed |
| `4`   | `UNIFIED_CANCELLED`     | Cancelled, escrow refunded to buyer                  |

**Transitions:**

```
PENDING_TRADE ──bridgeTradeToLogistics()──▶ TRADE_MATCHED
TRADE_MATCHED ──createLogisticsOrder()───▶ IN_LOGISTICS
IN_LOGISTICS  ──settleOrder() (auto)──────▶ SETTLED
PENDING_TRADE ──cancelBridgeOrder()───────▶ CANCELLED
TRADE_MATCHED ──cancelBridgeOrder()───────▶ CANCELLED
```

---

## 3. AuSys Order Status

Stored in `AuSysOrder.currentStatus`.

| Value | Name         | Domain Type              | Description                                |
| ----- | ------------ | ------------------------ | ------------------------------------------ |
| `0`   | `CREATED`    | `OrderStatus.CREATED`    | Order placed, escrowed, no active journeys |
| `1`   | `PROCESSING` | `OrderStatus.PROCESSING` | At least one journey active                |
| `2`   | `SETTLED`    | `OrderStatus.SETTLED`    | All journeys delivered, funds paid out     |
| `3`   | `CANCELLED`  | `OrderStatus.CANCELLED`  | Cancelled, funds refunded                  |

**Domain TypeScript enum:**

```typescript
export enum OrderStatus {
  CREATED = 'created', // contract: 0
  PROCESSING = 'processing', // contract: 1
  SETTLED = 'settled', // contract: 2
  CANCELLED = 'cancelled', // contract: 3
}
```

---

## 4. Journey Status

### Bridge Journey (BridgeFacet)

Stored in `Journey.phase`.

| Value | Constant             | Description                               |
| ----- | -------------------- | ----------------------------------------- |
| `0`   | `JOURNEY_PENDING`    | Awaiting driver assignment and signatures |
| `1`   | `JOURNEY_IN_TRANSIT` | Both signatures collected, goods moving   |
| `2`   | `JOURNEY_DELIVERED`  | Driver delivered, bounty paid             |
| `3`   | `JOURNEY_CANCELLED`  | Journey cancelled                         |

### AuSys Journey (AuSysFacet)

Emitted as `newStatus` in `AuSysJourneyStatusUpdated`.

| Value | Name         | Domain Type                | Description                    |
| ----- | ------------ | -------------------------- | ------------------------------ |
| `0`   | `PENDING`    | `JourneyStatus.PENDING`    | Awaiting driver and signatures |
| `1`   | `IN_TRANSIT` | `JourneyStatus.IN_TRANSIT` | Package picked up, in transit  |
| `2`   | `DELIVERED`  | `JourneyStatus.DELIVERED`  | Successfully delivered         |
| `3`   | `CANCELLED`  | `JourneyStatus.CANCELLED`  | Journey cancelled              |

**Domain TypeScript enum:**

```typescript
export enum JourneyStatus {
  PENDING = 'pending', // contract: 0
  IN_TRANSIT = 'in_transit', // contract: 1
  DELIVERED = 'delivered', // contract: 2
  CANCELLED = 'cancelled', // contract: 3
}
```

---

## 5. RWY Opportunity Status

Stored in `RWYOpportunity.status` in `RWYStorage`.

| Value | Name           | Description                             |
| ----- | -------------- | --------------------------------------- |
| `0`   | `OPEN`         | Accepting stakes                        |
| `1`   | `FUNDED`       | Target reached, ready to process        |
| `2`   | `DELIVERY`     | Goods in transit to processing facility |
| `3`   | `PROCESSING`   | Transformation in progress              |
| `4`   | `PROCESSED`    | Processing complete, awaiting sale      |
| `5`   | `SOLD`         | Proceeds recorded                       |
| `6`   | `DISTRIBUTING` | Profits available for claiming          |
| `7`   | `COMPLETE`     | All stakers claimed                     |
| `8`   | `CANCELLED`    | Cancelled, stakes refundable            |

---

## Status in the Indexer

When querying the Ponder indexer, status values are returned as integers (the raw on-chain value). The repository layer handles conversion to domain enums:

```typescript
// Raw from indexer:
{
  newStatus: 1;
} // IN_TRANSIT

// Repository converts:
const domainStatus = contractStatusToDomain(raw.newStatus);
// → JourneyStatus.IN_TRANSIT
```

**Filtering by status in GraphQL:**

```graphql
# Get all IN_TRANSIT journeys
query {
  auSysJourneyStatusUpdatedEventss(where: { newStatus: 1 }) {
    items {
      journeyId
      driver
      sender
      receiver
      bounty
    }
  }
}
```

---

## Status Flow Diagrams

### Full Order → Journey → Settlement Flow

```
CLOB Order: ACTIVE
    ↓ (match found)
CLOB Order: FILLED

Unified Order: PENDING_TRADE
    ↓ bridgeTradeToLogistics()
Unified Order: TRADE_MATCHED
    ↓ createLogisticsOrder()
Unified Order: IN_LOGISTICS

Journey: PENDING
    ↓ sender + driver packageSign()
Journey: IN_TRANSIT
    ↓ driver handOff()
Journey: DELIVERED

    ↓ (all journeys DELIVERED)
Unified Order: SETTLED
AuSys Order: SETTLED
```

---

## Helper: Status to Human String

```typescript
export function orderStatusToLabel(status: number): string {
  const labels = {
    0: 'Pending Trade',
    1: 'Trade Matched',
    2: 'In Delivery',
    3: 'Settled',
    4: 'Cancelled',
  };
  return labels[status] ?? 'Unknown';
}

export function journeyStatusToLabel(status: number): string {
  const labels = {
    0: 'Awaiting Pickup',
    1: 'In Transit',
    2: 'Delivered',
    3: 'Cancelled',
  };
  return labels[status] ?? 'Unknown';
}

export function clobOrderStatusToLabel(status: number): string {
  const labels = {
    0: 'Open',
    1: 'Partially Filled',
    2: 'Filled',
    3: 'Cancelled',
  };
  return labels[status] ?? 'Unknown';
}
```

---

## Related Pages

- [[Core Concepts/Order Lifecycle]]
- [[Smart Contracts/Facets/BridgeFacet]]
- [[Smart Contracts/Facets/AuSysFacet]]
- [[Technical Reference/Events Reference]]
