# Security Audit Report - CLOBMEVFacet & CLOBLogisticsFacet

**Date:** March 3, 2026  
**Auditor:** Sable (Security Agent)  
**Scope:** CLOBMEVFacet.sol, CLOBLogisticsFacet.sol

---

## Executive Summary

Audited CLOBMEVFacet (MEV protection via commit-reveal) and CLOBLogisticsFacet (driver/logistics management). Found **3 HIGH** and **3 MEDIUM** severity issues requiring attention.

---

## Findings

### HIGH-1: Missing Access Control on Logistics Order Creation

**Location:** `CLOBLogisticsFacet.sol:312` - `createLogisticsOrder()`

**Issue:** The function is marked `external` with **no access control**. Any external caller can create logistics orders, potentially creating fake orders or manipulating the escrow system.

**Impact:**

- Anyone can create logistics orders with arbitrary parameters
- Could be used to drain escrow or manipulate driver bounties
- No validation that the caller is an authorized system contract

**Recommendation:** Add access control:

```solidity
modifier onlyAuthorizedContract() {
    DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
    require(s.authorizedLogisticsCreators[msg.sender], "Not authorized");
    _;
}
```

---

### HIGH-2: Owner Signature Bypass in confirmPickup/confirmDelivery

**Location:** `CLOBLogisticsFacet.sol:384-400` and `431-449`

**Issue:** Both `confirmPickup()` and `confirmDelivery()` have an `isOwner` bypass that allows the contract owner to skip signature verification entirely:

```solidity
bool isOwner = msg.sender == LibDiamond.contractOwner();
if (!isOwner && order.assignedDriver != msg.sender) revert NotAssignedDriver();

if (!isOwner) {
    // Signature verification only happens for non-owners
    address signer = _verifyPickupSignature(...);
    ...
}
```

**Impact:**

- Contract owner can confirm pickup/delivery without any signature
- Creates centralization risk and potential for abuse
- Compromises the entire logistics signature scheme

**Recommendation:** Remove the owner bypass or add it only for emergency admin functions, not for normal operations:

```solidity
// Remove isOwner bypass - drivers must always provide valid signatures
if (order.assignedDriver != msg.sender) revert NotAssignedDriver();
```

---

### HIGH-3: Nonce Not Incremented on Owner Bypass

**Location:** `CLOBLogisticsFacet.sol:397` and `447`

**Issue:** When the owner bypass is used, the nonce is **never incremented**:

```solidity
if (!isOwner) {
    // ... signature verification ...
    pickupNonces[orderId]++;  // Only increments for non-owners
}
```

**Impact:** Combined with HIGH-2, this creates a signature replay vulnerability for non-owners after an owner uses the bypass (the same signature could be reused).

---

### MEDIUM-1: No Validation of Token Contract in createLogisticsOrder

**Location:** `CLOBLogisticsFacet.sol:321`

**Issue:** The `_token` parameter is not validated to be a valid ERC1155/ERC20 before creating the logistics order.

**Recommendation:** Add token validation:

```solidity
require(IERC165(token).supportsInterface(0x4e2312e0), "Token must support ERC1155");
```

---

### MEDIUM-2: Cancel Logic Allows Buyer to Cancel After Delivery

**Location:** `CLOBLogisticsFacet.sol:514`

**Issue:** The cancel function checks `order.status == OrderStatus.LOGISTICS_CREATED` for buyer cancellation, but there's a race condition - if buyer cancels before driver accepts, funds are returned. However, if driver already started, the check passes but state is inconsistent.

---

### MEDIUM-3: Unchecked Return Value in Token Transfers

**Location:** Multiple locations in CLOBLogisticsFacet

**Issue:** `IERC20.safeTransfer()` and `IERC1155.safeTransferFrom()` return are not checked for zero address (though SafeERC20 reverts on failure).

---

### LOW: Missing Event Emissions for Nonce Increments

**Location:** `CLOBLogisticsFacet.sol:397, 447`

**Issue:** Nonce increments happen silently without events, making on-chain tracking difficult.

---

## Positive Findings

1. **Reentrancy protection** - `nonReentrant` modifier on critical functions
2. **Deadline validation** - Signatures expire properly
3. **Domain separator** - Proper EIP-712 implementation
4. **Access control on driver management** - Driver registration/deactivation properly controlled
5. **Circuit breaker in CLOBMEVFacet** - Price protection mechanism present
6. **Commit-reveal delay** - Prevents immediate front-running

---

## Action Items

| Severity | Issue                                  | Fix Complexity | Status        |
| -------- | -------------------------------------- | -------------- | ------------- |
| HIGH-1   | Access control on createLogisticsOrder | Medium         | **FIXED** ✅  |
| HIGH-2   | Owner signature bypass                 | Easy           | **FIXED** ✅  |
| HIGH-3   | Nonce not incremented on owner         | Easy           | **FIXED** ✅  |
| MEDIUM-1 | Token validation                       | Easy           | Not fixed     |
| MEDIUM-2 | Cancel race condition                  | Medium         | Not fixed     |
| MEDIUM-3 | Unchecked returns                      | Low            | Documentation |

---

## Notes

- All HIGH issues can be fixed without breaking API changes
- The owner bypass (HIGH-2) appears intentional for admin emergency functions but should be removed or heavily restricted
- Consider adding a pausable feature for logistics in case of system issues
