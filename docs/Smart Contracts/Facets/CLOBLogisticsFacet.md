---
tags: [smart-contracts, facets, clob, logistics, driver, ecdsa]
---

# CLOBLogisticsFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > CLOBLogisticsFacet

`CLOBLogisticsFacet.sol` is the **CLOB-native driver management and logistics system**. Unlike `AuSysFacet` (which is the general-purpose logistics contract), this facet is tightly integrated with CLOB trades — drivers register on-chain, accept CLOB-matched orders directly, and use **ECDSA signature verification** for cryptographically-proven pickup and delivery confirmations.

This is the most recently deployed facet (block `38304361`, 2026-03-01).

---

## Overview

| Property                       | Value                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------- |
| File                           | `contracts/diamond/facets/CLOBLogisticsFacet.sol`                               |
| Deployed                       | `0x66fD1A58dd7d0097bFb558F083b750748e7dd8DD` (Base Sepolia)                     |
| Inherits                       | `ReentrancyGuard`                                                               |
| Signature scheme               | EIP-712 typed structured data                                                   |
| Key difference from AuSysFacet | Signature-verified GPS proofs, on-chain driver availability, CLOB trade linkage |

---

## What Makes It Different

| Feature             | AuSysFacet                       | CLOBLogisticsFacet                           |
| ------------------- | -------------------------------- | -------------------------------------------- |
| Custody model       | `packageSign()` — dual signature | ECDSA-signed GPS confirmations               |
| Driver registration | Off-chain (DRIVER_ROLE grant)    | On-chain `registerDriver()`                  |
| Driver availability | Not tracked                      | `isAvailable` flag, location-queryable       |
| Integration         | Standalone logistics             | Linked to CLOB `tradeId`                     |
| GPS proof           | String stored in event           | EIP-712 signed lat/lng with nonce + deadline |
| Dispute mechanism   | Admin intervention               | `disputeOrder()` with reason                 |

---

## Driver Registry

### `registerDriver()`

Any address can self-register as a driver.

```solidity
s.clobDrivers[msg.sender] = DriverInfo({
    driver: msg.sender,
    active: true,
    available: true,
    location: '',
    completedDeliveries: 0,
    totalBountyEarned: 0
});
```

**Emits:** `DriverRegistered(driver)`

### `deactivateDriver(address driver)`

Owner-only. Permanently deactivates a driver.
**Emits:** `DriverDeactivated(driver)`

### `setAvailability(bool isAvailable)`

Driver self-manages availability — toggle on/off between jobs.
**Emits:** `DriverAvailabilityUpdated(driver, isAvailable)`

### `updateLocation(string lat, string lng)`

Driver updates their current GPS coordinates (off-chain tracking complement).
**Emits:** `DriverLocationUpdated(driver, lat, lng)`

---

## Logistics Order Lifecycle

### `createLogisticsOrder(bytes32 tradeId, address buyer, address seller, uint256 quantity, uint256 driverBounty) → bytes32 orderId`

Creates a CLOB-linked logistics order after a trade is matched.

**Parameters:**

| Parameter      | Description                                       |
| -------------- | ------------------------------------------------- |
| `tradeId`      | The CLOB trade ID linking this to a matched order |
| `buyer`        | Receiving party                                   |
| `seller`       | Shipping party                                    |
| `quantity`     | Token quantity to deliver                         |
| `driverBounty` | Total bounty pool for the delivery                |

**Emits:** `LogisticsOrderCreated(orderId, tradeId, buyer, seller, quantity, driverBounty)`

---

### `acceptDelivery(bytes32 orderId, uint256 estimatedPickupTime, uint256 estimatedDeliveryTime)`

An available driver accepts a logistics order.

**Validates:**

- `clobDrivers[msg.sender].active && clobDrivers[msg.sender].available`
- Order status == `LOGISTICS_CREATED`

**Process:**

1. Links driver to order
2. Marks driver as unavailable: `available = false`
3. Order status → `LOGISTICS_ASSIGNED`

**Emits:** `DeliveryAccepted(orderId, driver, estimatedPickupTime, estimatedDeliveryTime)`

---

### `confirmPickup(bytes32 orderId, string lat, string lng, uint256 nonce, uint256 deadline, bytes signature)`

Driver confirms pickup with a **signed GPS proof**.

**Signature Verification:**

```solidity
bytes32 structHash = keccak256(abi.encode(
    PICKUP_TYPEHASH,
    orderId,
    msg.sender,      // driver
    keccak256(bytes(lat)),
    keccak256(bytes(lng)),
    nonce,
    deadline
));
bytes32 hash = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
address signer = ECDSA.recover(hash, signature);
require(signer == msg.sender, "InvalidSignature");
```

- `deadline` must be in the future (replay protection)
- `nonce` must match `pickupNonces[orderId]` (prevents replay)
- GPS coordinates are included in the signed message — the blockchain records a verified GPS proof

**Emits:** `PickupConfirmed(orderId, driver, lat, lng)`

---

### `updateDeliveryLocation(bytes32 orderId, string lat, string lng)`

Driver pushes real-time location updates during transit. No signature required — informational only.

**Emits:** `DeliveryLocationUpdated(orderId, driver, lat, lng)`

---

### `confirmDelivery(bytes32 orderId, string lat, string lng, uint256 nonce, uint256 deadline, bytes signature)`

Driver confirms delivery with a **signed GPS proof** at the destination.

Same signature scheme as `confirmPickup` but uses `DELIVERY_TYPEHASH` and `deliveryNonces`.

**Triggers settlement:**

1. Order status → `LOGISTICS_DELIVERED`
2. `_settleOrder(orderId)` called automatically

**Emits:** `DeliveryConfirmed(orderId, driver, lat, lng)`

---

### Internal Settlement

After delivery confirmed:

```
sellerPayout = order.price × order.quantity - driverBounty - protocolFee
driverPayout  = driverBounty

Transfers:
  ERC-1155 tokens → buyer
  sellerPayout USDC → seller
  driverBounty USDC → driver
  protocolFee USDC → feeRecipient

driver.completedDeliveries++
driver.totalBountyEarned += driverBounty
driver.available = true  ← driver freed up
```

**Emits:** `LogisticsOrderSettled(orderId, driverPayout)`

---

### `disputeOrder(bytes32 orderId, string reason)`

Either the buyer or seller can raise a dispute.

**Validates:** Order status is `LOGISTICS_ASSIGNED`, `LOGISTICS_PICKED_UP`, or `LOGISTICS_IN_TRANSIT`

**Emits:** `LogisticsOrderDisputed(orderId, reason)`

Admin resolves disputes manually via owner functions.

---

### `cancelLogisticsOrder(bytes32 orderId, string reason)`

Owner-only cancellation. Refunds escrow to buyer.

**Emits:** `LogisticsOrderCancelled(orderId, reason)`

---

## EIP-712 Domain Separator

```solidity
function _domainSeparator() internal view returns (bytes32) {
    return keccak256(abi.encode(
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
        keccak256("AurellionCLOBLogistics"),
        keccak256("1"),
        block.chainid,
        address(this)
    ));
}
```

Type hashes:

```
PICKUP_TYPEHASH   = keccak256("PickupConfirmation(bytes32 orderId,address driver,string lat,string lng,uint256 nonce,uint256 deadline)")
DELIVERY_TYPEHASH = keccak256("DeliveryConfirmation(bytes32 orderId,address driver,string lat,string lng,uint256 nonce,uint256 deadline)")
```

---

## Generating Signatures (Frontend)

```typescript
import { ethers } from 'ethers';

async function signPickup(
  signer: ethers.Signer,
  diamondAddress: string,
  chainId: number,
  orderId: string,
  lat: string,
  lng: string,
  nonce: bigint,
  deadline: bigint,
): Promise<string> {
  const domain = {
    name: 'AurellionCLOBLogistics',
    version: '1',
    chainId,
    verifyingContract: diamondAddress,
  };

  const types = {
    PickupConfirmation: [
      { name: 'orderId', type: 'bytes32' },
      { name: 'driver', type: 'address' },
      { name: 'lat', type: 'string' },
      { name: 'lng', type: 'string' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  };

  const value = {
    orderId,
    driver: await signer.getAddress(),
    lat,
    lng,
    nonce,
    deadline,
  };

  return signer.signTypedData(domain, types, value);
}
```

---

## Order Status Flow

```
createLogisticsOrder() → LOGISTICS_CREATED
        ↓ acceptDelivery()
LOGISTICS_ASSIGNED
        ↓ confirmPickup()
LOGISTICS_PICKED_UP
        ↓ updateDeliveryLocation() [optional, any time]
LOGISTICS_IN_TRANSIT
        ↓ confirmDelivery()
LOGISTICS_DELIVERED → auto-settles → LOGISTICS_SETTLED

At any point:
        ↓ disputeOrder()
LOGISTICS_DISPUTED → admin resolves
        ↓ cancelLogisticsOrder() [owner]
LOGISTICS_CANCELLED
```

---

## Events

| Event                       | Parameters                                                    |
| --------------------------- | ------------------------------------------------------------- |
| `DriverRegistered`          | `driver`                                                      |
| `DriverDeactivated`         | `driver`                                                      |
| `DriverAvailabilityUpdated` | `driver, isAvailable`                                         |
| `DriverLocationUpdated`     | `driver, lat, lng`                                            |
| `LogisticsOrderCreated`     | `orderId, tradeId, buyer, seller, quantity, driverBounty`     |
| `DeliveryAccepted`          | `orderId, driver, estimatedPickupTime, estimatedDeliveryTime` |
| `PickupConfirmed`           | `orderId, driver, lat, lng`                                   |
| `DeliveryLocationUpdated`   | `orderId, driver, lat, lng`                                   |
| `DeliveryConfirmed`         | `orderId, driver, lat, lng`                                   |
| `LogisticsOrderSettled`     | `orderId, driverPayout`                                       |
| `LogisticsOrderDisputed`    | `orderId, reason`                                             |
| `LogisticsOrderCancelled`   | `orderId, reason`                                             |

---

## Errors

| Error                       | Condition                             |
| --------------------------- | ------------------------------------- |
| `DriverAlreadyRegistered()` | `registerDriver` called twice         |
| `DriverNotRegistered()`     | Unregistered driver tries to act      |
| `DriverNotAvailable()`      | Driver's `available == false`         |
| `DriverNotAssigned()`       | Non-assigned driver tries to confirm  |
| `OrderNotFound()`           | Unknown orderId                       |
| `InvalidOrderStatus()`      | Wrong status for action               |
| `NotOrderParticipant()`     | Not buyer or seller                   |
| `NotAssignedDriver()`       | Not the driver assigned to this order |
| `InvalidLocation()`         | Empty lat/lng strings                 |
| `AlreadySettled()`          | Order already settled                 |
| `InvalidSignature()`        | ECDSA recovery doesn't match driver   |
| `SignatureExpired()`        | `deadline < block.timestamp`          |

---

## Related Pages

- [[Smart Contracts/Facets/AuSysFacet]]
- [[Smart Contracts/Facets/BridgeFacet]]
- [[Core Concepts/Journey and Logistics]]
- [[Roles/Driver]]
- [[Technical Reference/Security Model]]
