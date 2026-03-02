---
tags: [smart-contracts, facets, bridge, settlement, logistics]
---

# BridgeFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > BridgeFacet

`BridgeFacet.sol` is the **connective tissue** between Aurellion's CLOB trading system and its physical logistics system. When a buyer matches with a seller on the CLOB, the BridgeFacet creates a `UnifiedOrder` that tracks the combined commercial + physical delivery lifecycle and handles final settlement.

---

## Overview

| Property      | Value                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| File          | `contracts/diamond/facets/BridgeFacet.sol`                             |
| Inherits      | `Initializable`, `ReentrancyGuard`                                     |
| Storage       | [[Smart Contracts/Libraries/DiamondStorage]] — Bridge section          |
| Fee constants | `BOUNTY_PERCENTAGE = 200` (2%), `PROTOCOL_FEE_PERCENTAGE = 25` (0.25%) |

---

## The Unified Order Concept

A `UnifiedOrder` represents the complete lifecycle of a physical asset trade:

```
CLOB Match (digital)
    ↓
UnifiedOrder created → status: PENDING_TRADE
    ↓
Trade confirmed      → status: TRADE_MATCHED
    ↓
Logistics created    → status: IN_LOGISTICS
    ↓
Journey delivered    → status: SETTLED
```

Each `UnifiedOrder` links:

- `clobOrderId` — the buyer's CLOB order
- `clobTradeId` — the matching trade
- `ausysOrderId` — the linked logistics order
- Journey array with delivery status

---

## Escrow Model

When a `UnifiedOrder` is created, the buyer's payment is fully escrowed:

```
totalEscrow = orderValue + bounty + protocolFee
            = (price × quantity) + (orderValue × 2%) + (orderValue × 0.25%)
            = orderValue × 102.25%
```

These funds stay in the Diamond until settlement. If the order is cancelled, the escrow is refunded minus any protocol costs.

---

## Functions

### `createUnifiedOrder(bytes32 clobOrderId, address sellerNode, uint256 price, uint256 quantity, ParcelData deliveryData) → bytes32 unifiedOrderId`

Creates a new unified order when a buyer initiates a trade that requires physical delivery.

**Who calls it:** The buyer, after identifying a seller's CLOB listing.

**Process:**

1. Validates: `sellerNode != address(0)`, `price > 0`, `quantity > 0`
2. Calculates escrow amounts
3. Transfers `totalEscrow` from buyer (ERC-20 `quoteTokenAddress`)
4. Creates `UnifiedOrder` record with `status = UNIFIED_PENDING_TRADE`
5. Adds to `buyerUnifiedOrders[buyer]` and `clobOrderToUnifiedOrder[clobOrderId]`

**Emits:**

- `UnifiedOrderCreated(unifiedOrderId, clobOrderId, buyer, seller=0, token=0, tokenId=0, quantity, price)`
- `FundsEscrowed(buyer, totalEscrow)`

---

### `bridgeTradeToLogistics(bytes32 unifiedOrderId, bytes32 clobTradeId, bytes32 ausysOrderId, address seller, address token, uint256 tokenId)`

Called once a CLOB trade is matched to update the unified order with seller/token details.

**Who calls it:** Buyer or contract owner (auto-triggered by matching system).

**Validates:** `order.status == UNIFIED_PENDING_TRADE`

**Updates:**

- `order.clobTradeId`, `order.ausysOrderId`
- `order.seller`, `order.token`, `order.tokenId`
- `order.status = UNIFIED_TRADE_MATCHED`
- `order.matchedAt = block.timestamp`

**Emits:** `TradeMatched(unifiedOrderId, clobTradeId, clobOrderId, seller, price, amount)`

---

### `createLogisticsOrder(bytes32 unifiedOrderId) → bytes32 journeyId`

Called by the seller/seller node after trade matching to initiate physical delivery.

**Who calls it:** `order.seller || order.sellerNode`

**Validates:** `order.status == UNIFIED_TRADE_MATCHED`

**Process:**

1. Generates `journeyId`
2. Creates `Journey` record: `phase = JOURNEY_PENDING`, linked to `unifiedOrderId`
3. Updates `order.status = UNIFIED_IN_LOGISTICS`

**Emits:** `LogisticsOrderCreated(unifiedOrderId, ausysOrderId, journeyIds, bounty, node)`

---

### `updateJourneyStatus(bytes32 unifiedOrderId, bytes32 journeyId, uint8 phase)`

Updates the phase of a logistics journey within a unified order.

**Who calls it:** AuSysFacet (internal cross-facet call) when journey status changes.

**Emits:** `JourneyStatusUpdated(unifiedOrderId, journeyId, phase)`

---

### `settleOrder(bytes32 unifiedOrderId)`

Executes final settlement once all journeys are delivered.

**Who calls it:** Auto-triggered when last journey completes, or manually by buyer/owner.

**Validates:** `order.status == UNIFIED_IN_LOGISTICS`, all journeys in DELIVERED phase.

**Settlement execution:**

1. Calculates payments:
   - `sellerAmount = escrowedAmount - bounty - protocolFee`
   - `driverAmount = bounty` (distributed to driver(s))
   - `protocolAmount = protocolFee`
2. Transfers ERC-1155 tokens to buyer
3. Transfers `sellerAmount` (ERC-20) to seller
4. Transfers `driverAmount` (ERC-20) to driver
5. Transfers `protocolAmount` to `feeRecipient`
6. Updates `order.status = UNIFIED_SETTLED`, `order.settledAt = block.timestamp`

**Emits:**

- `OrderSettled(unifiedOrderId, seller, sellerAmount, driver, driverAmount)`
- `BountyPaid(unifiedOrderId, bounty)`

---

### `cancelBridgeOrder(bytes32 unifiedOrderId)`

Cancels a unified order and refunds the escrowed payment.

**Validates:** Order must be in `PENDING_TRADE` or `TRADE_MATCHED` status (not already in logistics).

**Emits:** `BridgeOrderCancelled(unifiedOrderId, previousStatus)`, `FundsRefunded(buyer, amount)`

---

## Unified Order Status Values

| Status | Constant                | Description                         |
| ------ | ----------------------- | ----------------------------------- |
| 0      | `UNIFIED_PENDING_TRADE` | Created, waiting for CLOB match     |
| 1      | `UNIFIED_TRADE_MATCHED` | CLOB matched, waiting for logistics |
| 2      | `UNIFIED_IN_LOGISTICS`  | Physical delivery in progress       |
| 3      | `UNIFIED_SETTLED`       | Complete, all funds distributed     |
| 4      | `UNIFIED_CANCELLED`     | Cancelled, funds refunded           |

---

## Journey Phases (within Bridge)

| Phase | Constant             | Description                    |
| ----- | -------------------- | ------------------------------ |
| 0     | `JOURNEY_PENDING`    | Awaiting driver and signatures |
| 1     | `JOURNEY_IN_TRANSIT` | Goods in transit               |
| 2     | `JOURNEY_DELIVERED`  | Successfully delivered         |
| 3     | `JOURNEY_CANCELLED`  | Journey cancelled              |

---

## Events

| Event                       | Parameters                                                                    |
| --------------------------- | ----------------------------------------------------------------------------- |
| `UnifiedOrderCreated`       | `unifiedOrderId, clobOrderId, buyer, seller, token, tokenId, quantity, price` |
| `TradeMatched`              | `unifiedOrderId, clobTradeId, clobOrderId, maker, price, amount`              |
| `LogisticsOrderCreated`     | `unifiedOrderId, ausysOrderId, journeyIds, bounty, node`                      |
| `JourneyStatusUpdated`      | `unifiedOrderId, journeyId, phase`                                            |
| `OrderSettled`              | `unifiedOrderId, seller, sellerAmount, driver, driverAmount`                  |
| `BridgeOrderCancelled`      | `unifiedOrderId, previousStatus`                                              |
| `BountyPaid`                | `unifiedOrderId, amount`                                                      |
| `FundsEscrowed`             | `buyer, amount`                                                               |
| `FundsRefunded`             | `recipient, amount`                                                           |
| `BridgeFeeRecipientUpdated` | `oldRecipient, newRecipient`                                                  |

---

## Security

- `nonReentrant` on all state-mutating functions
- Payment token validated: `quoteTokenAddress != address(0)` required during init
- `feeRecipient` defaults to contract owner; updateable via owner
- Status guards prevent double-settlement and double-cancellation

---

## Related Pages

- [[Core Concepts/Order Lifecycle]]
- [[Smart Contracts/Facets/AuSysFacet]]
- [[Smart Contracts/Facets/CLOBMatchingFacet]]
- [[Architecture/Data Flow]]
