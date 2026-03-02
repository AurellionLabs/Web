---
tags: [smart-contracts, facets, logistics, orders, journeys]
---

# AuSysFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > AuSysFacet

`AuSysFacet.sol` is Aurellion's **logistics orchestration engine**. It manages the complete lifecycle of physical delivery: order creation, journey definition, driver assignment, custody signature collection, settlement, and P2P offer management.

This facet mirrors the original `AuSys.sol` contract but operates within the shared Diamond storage.

---

## Overview

| Property | Value                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------- |
| File     | `contracts/diamond/facets/AuSysFacet.sol`                                                            |
| Inherits | `ReentrancyGuard`                                                                                    |
| Storage  | [[Smart Contracts/Libraries/DiamondStorage]] — AuSys section                                         |
| Roles    | `ADMIN_ROLE`, `DRIVER_ROLE`, `DISPATCHER_ROLE`                                                       |
| Limits   | `MAX_ORDERS=10,000`, `MAX_JOURNEYS_PER_ORDER=10`, `MAX_NODES_PER_ORDER=20`, `MAX_DRIVER_JOURNEYS=10` |

---

## RBAC

```
ADMIN_ROLE:      Set admins, configure system
DRIVER_ROLE:     Accept journeys, sign packages, complete deliveries
DISPATCHER_ROLE: Assign drivers to journeys
```

Roles are stored as `ausysRoles[role][address]` in AppStorage.

---

## Order Management

### `createOrder(address token, uint256 tokenId, uint256 tokenQuantity, uint256 price, address[] nodes, ParcelData locationData, address seller) → bytes32 orderId`

Creates a logistics order with escrowed payment.

**Process:**

1. Validates all addresses non-zero, amounts > 0
2. Generates `orderId = keccak256(buyer, seller, block.timestamp, ...)`
3. Calculates `txFee = (price * tokenQuantity * 2) / 100` (2%)
4. Total escrow = `price * tokenQuantity + txFee`
5. Transfers from buyer via `IERC20(payToken).safeTransferFrom`
6. Stores `AuSysOrder` in AppStorage
7. Emits `AuSysOrderCreated`

**Emits:**

```
AuSysOrderCreated(orderId, buyer, seller, token, tokenId,
                  tokenQuantity, price, txFee, currentStatus, nodes)
```

### `cancelOrder(bytes32 orderId)`

Cancels an order in CREATED status. Refunds escrowed payment to buyer.

**Reverts:** If status is not CREATED, or caller is not buyer/admin.
**Emits:** `FundsRefunded(buyer, amount)`

---

## Journey Management

### `createJourney(bytes32 orderId, address sender, address receiver, uint256 bounty, uint256 ETA, ParcelData locationData) → bytes32 journeyId`

Creates a delivery leg for an order. Multiple journeys can exist per order (multi-hop delivery).

**Limits:** `MAX_JOURNEYS_PER_ORDER = 10`

**Emits:**

```
JourneyCreated(journeyId, sender, receiver, driver=address(0),
               bounty, ETA, orderId, startLat, startLng, endLat, endLng, startName, endName)
```

### `assignDriverToJourney(bytes32 journeyId, address driver)`

Assigns a verified driver to a pending journey.

**Modifiers:** Caller must have `DISPATCHER_ROLE`
**Validates:** Driver must have `DRIVER_ROLE`, journey must be PENDING

**Emits:**

```
DriverAssigned(journeyId, driver, sender, receiver, bounty, ETA,
               startLat, startLng, endLat, endLng, startName, endName)
```

---

## Custody Signatures (Package Handoff)

The three-signature system ensures cryptographic proof of custody transfer:

### Signature Flow

```
Sender signs → Driver signs → Journey goes IN_TRANSIT
                                     ↓
                              Driver delivers
                                     ↓
                         Driver signs delivery → Journey DELIVERED
                                     ↓
                              Settlement triggered
```

### `packageSign(bytes32 journeyId)`

Called by sender, driver, or receiver to record their custody signature.

**Logic:**

- If `msg.sender == journey.sender`: sets `customerHandOff[sender][journeyId] = true`
- If `msg.sender == journey.driver`: sets `driverPickupSigned[driver][journeyId] = true`
- Emits `EmitSig(msg.sender, journeyId)`

**Transition to IN_TRANSIT:**
Once both sender and driver have signed:

- Journey status → IN_TRANSIT
- Tokens transferred into Diamond escrow via `IERC1155.safeTransferFrom`
- Emits `AuSysJourneyStatusUpdated(journeyId, status=IN_TRANSIT, ...)`

### `handOff(bytes32 journeyId)`

Called by driver to complete delivery and trigger payment.

**Validates:**

- `driverPickupSigned[driver][journeyId] == true`
- Journey status == IN_TRANSIT

**Executes:**

1. Sets `driverDeliverySigned[driver][journeyId] = true`
2. Journey status → DELIVERED
3. Transfers bounty: `IERC20(payToken).safeTransfer(driver, journey.bounty)`
4. Marks journey reward as paid: `journeyRewardPaid[journeyId] = true`
5. If this is the final journey → triggers order settlement

**Emits:**

```
AuSysJourneyStatusUpdated(journeyId, status=DELIVERED, ...)
```

---

## Order Settlement

### `settleOrder(bytes32 orderId)`

Called automatically when the final journey is delivered. Distributes payments.

**Process:**

1. Validates: `currentStatus == PROCESSING`, all journeys DELIVERED
2. Transfers ERC-1155 tokens from Diamond custody to buyer
3. Pays seller: `price * quantity` in `payToken`
4. Distributes `txFee` proportionally across all nodes
5. Updates order status → SETTLED
6. Emits `AuSysOrderSettled(orderId)`, `SellerPaid(seller, amount)`, `NodeFeeDistributed(node, amount)`

---

## P2P Trading

AuSysFacet supports direct peer-to-peer trades without the CLOB:

### `createP2POffer(address token, uint256 tokenId, uint256 tokenQuantity, uint256 price, bool isSellerInitiated, address targetCounterparty, uint256 expiresAt) → bytes32 orderId`

Creates a directed offer between two parties.

- **Seller-initiated:** Seller offers tokens for a price. Buyer accepts and pays.
- **Buyer-initiated:** Buyer offers payment. Seller accepts and delivers tokens.
- `targetCounterparty == address(0)` = open offer (anyone can accept)

**Emits:** `P2POfferCreated(orderId, creator, isSellerInitiated, token, tokenId, tokenQuantity, price, targetCounterparty, expiresAt)`

### `acceptP2POffer(bytes32 orderId)`

Accepts a P2P offer as the counterparty.

**Validates:**

- Offer not expired (`expiresAt > block.timestamp`)
- If `targetCounterparty != address(0)`, caller must match
- Appropriate tokens escrowed

**Emits:** `P2POfferAccepted(orderId, acceptor, isSellerInitiated)`

### `cancelP2POffer(bytes32 orderId)`

Creator cancels an open offer and recovers escrowed tokens.
**Emits:** `P2POfferCanceled(orderId, creator)`

---

## Events

| Event                       | Description                           |
| --------------------------- | ------------------------------------- |
| `AuSysOrderCreated`         | New logistics order                   |
| `JourneyCreated`            | New journey leg                       |
| `DriverAssigned`            | Driver assigned to journey            |
| `EmitSig`                   | Custody signature recorded            |
| `AuSysJourneyStatusUpdated` | Journey status changed (full context) |
| `JourneyCanceled`           | Journey cancelled with refund         |
| `AuSysOrderStatusUpdated`   | Order status changed                  |
| `AuSysOrderSettled`         | Order fully settled                   |
| `FundsEscrowed`             | Payment locked in contract            |
| `FundsRefunded`             | Payment returned to buyer             |
| `SellerPaid`                | Seller received payment               |
| `NodeFeeDistributed`        | Node received fee share               |
| `P2POfferCreated`           | New P2P offer                         |
| `P2POfferAccepted`          | P2P offer accepted                    |
| `P2POfferCanceled`          | P2P offer cancelled                   |

---

## Errors

| Error                        | Condition                                |
| ---------------------------- | ---------------------------------------- |
| `NotJourneyParticipant()`    | Caller not sender/driver/receiver        |
| `JourneyNotInProgress()`     | Journey not IN_TRANSIT for handoff       |
| `JourneyNotPending()`        | Journey not PENDING for assignment       |
| `JourneyIncomplete()`        | Not all journeys delivered at settlement |
| `AlreadySettled()`           | Order already settled                    |
| `DriverNotSigned()`          | Driver hasn't signed before handoff      |
| `SenderNotSigned()`          | Sender hasn't signed custody             |
| `ReceiverNotSigned()`        | Receiver signature missing               |
| `InvalidAddress()`           | Zero address passed                      |
| `InvalidAmount()`            | Zero amount                              |
| `InvalidETA()`               | ETA in the past                          |
| `QuantityExceedsRequested()` | Delivery exceeds order quantity          |
| `InvalidNode()`              | Node address not valid                   |
| `RewardAlreadyPaid()`        | Bounty already distributed               |
| `ArrayLimitExceeded()`       | Too many journeys or nodes               |

---

## Status Enums

### Order Status

| Value | Name       | Meaning                                   |
| ----- | ---------- | ----------------------------------------- |
| 0     | CREATED    | Order placed, escrowed, awaiting journeys |
| 1     | PROCESSING | At least one journey in progress          |
| 2     | SETTLED    | All journeys complete, funds distributed  |
| 3     | CANCELLED  | Order cancelled, funds refunded           |

### Journey Status

| Value | Name       | Meaning                                   |
| ----- | ---------- | ----------------------------------------- |
| 0     | PENDING    | Awaiting driver assignment and signatures |
| 1     | IN_TRANSIT | Both signatures collected, goods moving   |
| 2     | DELIVERED  | Driver has completed handoff              |
| 3     | CANCELLED  | Journey cancelled                         |

---

## Related Pages

- [[Core Concepts/Journey and Logistics]]
- [[Smart Contracts/Facets/BridgeFacet]]
- [[Roles/Driver]]
- [[Roles/Node Operator]]
- [[Technical Reference/Events Reference]]
