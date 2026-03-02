---
tags: [roles, driver, logistics, delivery]
---

# Driver Role

[[🏠 Home]] > Roles > Driver

**Drivers** are the physical couriers of the Aurellion network. They transport real-world assets between nodes and receive bounty payments upon successful delivery. Drivers operate within a structured custody-signature system that provides cryptographic proof of every handoff.

---

## Driver Registration

Drivers must be granted `DRIVER_ROLE` by an admin before they can be assigned journeys:

```solidity
ausysRoles[DRIVER_ROLE][driverAddress] = true;
```

The registration process involves:

1. Identity verification (off-chain KYC)
2. Capability assessment (vehicle type, coverage area)
3. Admin grants DRIVER_ROLE on-chain
4. Driver can now be assigned journeys

---

## Driver Routes

| Route               | Description                                        |
| ------------------- | -------------------------------------------------- |
| `/driver/dashboard` | Main driver interface: assigned journeys, earnings |

---

## How Drivers Earn

Drivers earn **bounties** — a percentage of the order value paid immediately upon delivery:

```
Order value: 10,000 USDC
Bounty pool: 2% = 200 USDC

Multi-journey order:
  Journey 1 (local pickup):     75 USDC
  Journey 2 (long haul):       100 USDC
  Journey 3 (last mile):        25 USDC
  Total:                       200 USDC
```

Payment is **automatic** — when `handOff()` is called, the bounty transfers instantly without manual claims.

---

## Driver Journey Flow

### Step 1: Assignment

A dispatcher (with `DISPATCHER_ROLE`) assigns the driver:

```
AuSysFacet.assignDriverToJourney(journeyId, driverAddress)
→ journey.driver = driverAddress
→ DriverAssigned(journeyId, driver, sender, receiver, bounty, ETA, ...)
→ Driver dashboard shows new assignment
```

**Max concurrent journeys:** `MAX_DRIVER_JOURNEYS = 10`

---

### Step 2: Pickup Signature

Before collecting goods, both the driver AND the sender must sign:

**Driver signs (pickup):**

```
AuSysFacet.packageSign(journeyId)
→ driverPickupSigned[driver][journeyId] = true
→ EmitSig(driver, journeyId)
```

**Sender signs (handoff):**

```
AuSysFacet.packageSign(journeyId)  // called by sender
→ customerHandOff[sender][journeyId] = true
→ EmitSig(sender, journeyId)
```

Once **both** are signed:

- Journey transitions to `IN_TRANSIT`
- ERC-1155 tokens move into Diamond escrow
- `AuSysJourneyStatusUpdated(journeyId, IN_TRANSIT, ...)` emitted

---

### Step 3: Transport

The driver physically transports the goods. Off-chain tracking (GPS, status updates) happens via the platform mobile app. No on-chain transactions required during transit.

---

### Step 4: Delivery (handOff)

Upon arrival at the destination:

```
AuSysFacet.handOff(journeyId)
```

**Validates:**

- `driverPickupSigned[driver][journeyId] == true`
- `journey.status == IN_TRANSIT`
- `journeyRewardPaid[journeyId] == false` (not already paid)

**Executes:**

- `journey.status → DELIVERED`
- `IERC20(payToken).safeTransfer(driver, journey.bounty)`
- `journeyRewardPaid[journeyId] = true`

**Emits:**

```
AuSysJourneyStatusUpdated(journeyId, status=DELIVERED, driver, bounty, ...)
```

**💰 Bounty arrives in driver's wallet immediately upon this transaction.**

---

## Safety: Why Two Signatures?

The dual-signature requirement (sender + driver) prevents:

- **Driver claiming payment without collecting:** Can't call `handOff` without pickup signature
- **Sender falsely claiming delivery:** Sender can't sign for themselves as driver
- **Disputed custody:** On-chain proof of who had physical possession at each moment

The signature trail is permanent and auditable on-chain via `EmitSig` events.

---

## Multiple Journeys

A driver can have up to 10 concurrent journeys. Each is independent:

- Different senders/receivers
- Different locations
- Different bounties
- Independent signature flows

The driver dashboard shows all active journeys with their status.

---

## CLOB Driver System

In addition to AuSys journeys, drivers can be registered in the CLOB logistics system:

```solidity
struct DriverInfo {
    address driver;
    bool active;
    bool available;
    string location;  // Current location
    uint256 completedDeliveries;
    uint256 totalBountyEarned;
}
```

This enables the CLOB logistics system (`CLOBLogisticsFacet`) to query available drivers by location and assign them automatically.

---

## Indexer Data for Drivers

```graphql
query MyJourneys($driver: String!) {
  auSysJourneyStatusUpdatedEventss(
    where: { driver: $driver }
    orderBy: "block_timestamp"
    orderDirection: "desc"
  ) {
    items {
      journeyId
      newStatus
      sender
      receiver
      bounty
      ETA
      startName
      endName
      block_timestamp
      transaction_hash
    }
  }
}
```

---

## Earnings History

```graphql
query DriverEarnings($driver: String!) {
  driverAssignedEventss(where: { driver: $driver }) {
    items {
      journeyId
      bounty
      block_timestamp
    }
  }
}
```

Total earnings = sum of `bounty` for all DELIVERED journeys.

---

## Driver Conduct

While the smart contract enforces custody mechanics, the platform has additional conduct guidelines:

- Drivers must maintain physical goods in proper condition
- GPS tracking required during transit
- Photo evidence uploaded at pickup and delivery
- Response to assignment within configurable SLA

Repeated non-completion can result in `DRIVER_ROLE` revocation by admin.

---

## Related Pages

- [[Core Concepts/Journey and Logistics]]
- [[Smart Contracts/Facets/AuSysFacet]]
- [[Roles/Node Operator]]
- [[Frontend/Pages Reference]]
