---
tags: [concepts, logistics, journey, delivery, driver]
---

# Journey & Logistics System

[[🏠 Home]] > Core Concepts > Journey & Logistics

Aurellion's logistics system is the physical layer of the protocol — it ensures that when a buyer purchases tokens, actual physical goods are transported and delivered. The system uses cryptographic custody signatures to create an auditable, trustless chain of custody.

---

## Core Components

| Component     | Role                                           |
| ------------- | ---------------------------------------------- |
| **Journey**   | A single delivery leg from sender to receiver  |
| **Driver**    | Registered courier who transports goods        |
| **Node**      | Physical storage location (sender or receiver) |
| **Bounty**    | ERC-20 payment to driver upon delivery         |
| **Signature** | Custody proof collected at each handoff        |

---

## Multi-Hop Delivery

Real-world logistics often requires multiple transfer points. Aurellion models this as a sequence of journeys:

```
Origin Node (Kenya)
    │
    │ Journey 1: Node Nairobi → Hub Mombasa
    │ (Driver A, Bounty 50 USDC)
    ▼
Hub Node (Mombasa)
    │
    │ Journey 2: Hub Mombasa → Port Freight
    │ (Driver B, Bounty 75 USDC)
    ▼
Port Node (Mombasa Port)
    │
    │ Journey 3: Freight → Destination
    │ (Shipping + Driver C, Bounty 200 USDC)
    ▼
Destination Node (Dubai)
    │ Final delivery to buyer
    ▼
Settlement triggered
```

Each journey has its own driver, bounty, and signature flow. The order is only settled when **all journeys are DELIVERED**.

---

## Custody Signature Flow

The three-party signature system creates a cryptographic handoff proof:

```
JOURNEY STATE: PENDING
        │
        │ Sender (Node Operator) calls packageSign(journeyId)
        │ → customerHandOff[sender][journeyId] = true
        │ → EmitSig(sender, journeyId)
        │
        │ Driver calls packageSign(journeyId)
        │ → driverPickupSigned[driver][journeyId] = true
        │ → EmitSig(driver, journeyId)
        │
        ▼ Both signed → automatic transition
JOURNEY STATE: IN_TRANSIT
        │ ERC-1155 tokens transferred to Diamond escrow
        │ AuSysJourneyStatusUpdated(journeyId, IN_TRANSIT, ...)
        │
        │ Driver transports goods...
        │
        │ Driver calls handOff(journeyId)
        │ → Validates: driverPickupSigned == true
        │ → Bounty transferred: IERC20(payToken).safeTransfer(driver, bounty)
        │ → journeyRewardPaid[journeyId] = true
        │
        ▼
JOURNEY STATE: DELIVERED
        │ AuSysJourneyStatusUpdated(journeyId, DELIVERED, ...)
        │
        ▼ If last journey → settleOrder()
```

---

## Journey Data Structure

```typescript
type Journey = {
  parcelData: {
    startLocation: { lat: string; lng: string };
    endLocation: { lat: string; lng: string };
    startName: string; // E.g., "Nairobi Livestock Market"
    endName: string; // E.g., "Mombasa Port Hub"
  };
  journeyId: string; // bytes32 hash
  currentStatus: JourneyStatus;
  sender: string; // Node operator address
  receiver: string; // Next node or buyer
  driver: string; // Assigned driver
  journeyStart: bigint; // Unix timestamp
  journeyEnd: bigint; // Unix timestamp
  bounty: bigint; // Payment to driver (wei)
  ETA: bigint; // Estimated arrival
};
```

---

## Driver Registration

Drivers must be registered before they can be assigned journeys:

1. Admin calls `AuSysFacet` to grant `DRIVER_ROLE`:
   ```solidity
   ausysRoles[DRIVER_ROLE][driverAddress] = true;
   ```
2. Driver appears in `clobDrivers` mapping for the CLOB logistics system
3. Driver's dashboard shows assigned journeys via `driverToJourneyIds[driver]`
4. Driver can have at most `MAX_DRIVER_JOURNEYS = 10` concurrent journeys

---

## Dispatcher Role

Dispatchers are responsible for assigning drivers to journeys. They hold `DISPATCHER_ROLE`:

```solidity
assignDriverToJourney(journeyId, driverAddress)
```

**Validates:**

- Caller has `DISPATCHER_ROLE`
- `driverAddress` has `DRIVER_ROLE`
- Journey status is PENDING

In practice, the Aurellion platform may auto-assign drivers based on location proximity and availability. The dispatcher role can be held by the platform admin or a smart contract.

---

## Bounty Calculation

The driver bounty is set when the order is created and flows through the system:

```
Order value (price × quantity) = 10,000 USDC
Bounty percentage              = 2%
Driver bounty                  = 200 USDC

For multi-journey orders, bounty splits across journeys:
  Journey 1 bounty = 75 USDC
  Journey 2 bounty = 50 USDC
  Journey 3 bounty = 75 USDC
  Total             = 200 USDC
```

Bounties are paid **immediately upon each handOff()** call. Drivers don't wait for final settlement.

---

## ETA and Location Data

Every journey carries geographic data as strings (to avoid coordinate precision issues on-chain):

```solidity
struct ParcelData {
    string startLat;    // E.g., "-1.286389"
    string startLng;    // E.g., "36.817223"
    string endLat;
    string endLng;
    string startName;   // Human-readable location
    string endName;
}
```

The `ETA` field is a Unix timestamp. The platform UI converts this to a human-readable date/time. Drivers update their progress off-chain via the platform; the on-chain record reflects the final confirmed statuses.

---

## Error Cases & Reversions

| Scenario                                         | Behaviour                                             |
| ------------------------------------------------ | ----------------------------------------------------- |
| Driver signs before sender                       | Only driver signature recorded; journey stays PENDING |
| Driver attempts handOff without pickup signature | Reverts `DriverNotSigned()`                           |
| Journey cancelled before signatures              | Escrow refunded; `JourneyCanceled` emitted            |
| Driver already on 10 journeys                    | `ArrayLimitExceeded()` reverts assignment             |
| handOff called twice                             | `RewardAlreadyPaid()` reverts                         |

---

## Cancellation

A journey can only be cancelled while in PENDING state (before signatures):

```
cancelJourney(journeyId)
  → Validates: status == PENDING
  → Refunds bounty escrow to order buyer
  → Emits JourneyCanceled(journeyId, sender, receiver, driver, refundedAmount, ...)
  → Sets journey status → CANCELLED
```

If a journey is cancelled after delivery has started (IN_TRANSIT), the system requires manual admin intervention.

---

## On-Chain vs Off-Chain

| Aspect             | On-Chain                     | Off-Chain             |
| ------------------ | ---------------------------- | --------------------- |
| Journey creation   | ✅ `createJourney()`         |                       |
| Driver assignment  | ✅ `assignDriverToJourney()` |                       |
| Pickup signature   | ✅ `packageSign()`           |                       |
| Delivery signature | ✅ `handOff()`               |                       |
| GPS tracking       |                              | ✅ Mobile app / API   |
| ETA updates        |                              | ✅ Platform database  |
| Photo evidence     |                              | ✅ IPFS               |
| Communication      |                              | ✅ Platform messaging |

---

## Indexer Events for Logistics

The Ponder indexer captures all journey events and maintains aggregate state:

```graphql
query GetJourneysForDriver($driver: String!) {
  journeyStatusUpdatedEventss(
    where: { driver: $driver }
    orderBy: "block_timestamp"
  ) {
    items {
      journeyId
      newStatus
      sender
      receiver
      bounty
      startLat
      startLng
      endLat
      endLng
      startName
      endName
      block_timestamp
    }
  }
}
```

---

## Related Pages

- [[Smart Contracts/Facets/AuSysFacet]]
- [[Smart Contracts/Facets/BridgeFacet]]
- [[Roles/Driver]]
- [[Roles/Node Operator]]
- [[Core Concepts/Order Lifecycle]]
