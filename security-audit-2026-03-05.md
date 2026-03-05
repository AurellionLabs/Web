# Security Audit Report - AuSysFacet & OperatorFacet

**Date:** March 5, 2026  
**Auditor:** Sable (Security Agent)  
**Scope:** AuSysFacet.sol, OperatorFacet.sol  
**Previous Audit:** BridgeFacet & NodesFacet (March 3, 2026)

---

## Executive Summary

Audited AuSysFacet (logistics/journey/P2P management) and OperatorFacet (RWY operator management). Found **1 CRITICAL**, **3 MEDIUM**, and **1 LOW** severity issues in Solidity. Also catalogued TypeScript `as any` cast usage.

---

## AuSysFacet Findings

### CRITICAL-1: Missing Reentrancy Guard on createOrderJourney

**Location:** `AuSysFacet.sol:644` - `createOrderJourney()`

**Issue:** The function performs an external call (`IERC20.safeTransferFrom`) but lacks `nonReentrant` modifier. While `createJourney` has the guard, this related function does not.

```solidity
function createOrderJourney(
    bytes32 orderId,
    ...
) external {  // MISSING: nonReentrant
    // ...
    IERC20(s.payToken).safeTransferFrom(O.buyer, address(this), bounty);  // External call
    // ...
}
```

**Impact:** A malicious receiver could implement a receiver hook that re-enters the contract during the `safeTransferFrom`, potentially manipulating state.

**Recommendation:** Add `nonReentrant` modifier:

```solidity
function createOrderJourney(...) external nonReentrant { ... }
```

---

### MEDIUM-1: P2P Offer Acceptance Has No Signature Verification

**Location:** `AuSysFacet.sol:441-503` - `acceptP2POffer()`

**Issue:** The function accepts P2P offers without requiring EIP-712 signature verification from the acceptor. The code comments say "msg.sender is the authorization — no additional signature needed." A `setTrustedP2PSigner` function exists (line 569) but is never used.

```solidity
function acceptP2POffer(bytes32 orderId) external nonReentrant {
    // No signature verification!
    // Just checks msg.sender vs targetCounterparty
}
```

**Impact:**

- No cryptographic proof that the acceptor intended to accept this specific offer
- Susceptible to front-running in public mempool
- If offer has `targetCounterparty == address(0)`, anyone can accept (design for public offers, but no protection against griefing)

**Recommendation:** Implement EIP-712 signature verification using the trusted signer:

```solidity
function acceptP2POffer(
    bytes32 orderId,
    bytes calldata signature  // Add signature parameter
) external nonReentrant {
    // Verify signature from trusted signer
    if (s.trustedP2PSigner != address(0)) {
        bytes32 hash = keccak256(abi.encode(_domainSeparator(), orderId, msg.sender));
        if (hash.recover(signature) != s.trustedP2PSigner) revert InvalidSignature();
    }
    // ... rest of function
}
```

---

### MEDIUM-2: Public P2P Offers Vulnerable to Front-Running

**Location:** `AuSysFacet.sol:455-460`

**Issue:** When `targetCounterparty == address(0)`, the offer is public and any address (except creator) can accept. This creates sandwich attack vectors:

```solidity
// If targetCounterparty is address(0), anyone can accept
if (order.targetCounterparty != address(0) && msg.sender != order.targetCounterparty) {
    revert NotTargetCounterparty();
}
```

**Impact:**

- MEV searchers can front-run accept transactions
- Creator's intended counterparty might be displaced
- No slippage protection on price

**Recommendation:** Either:

1. Require signature for all acceptances
2. Add deadline/valid-until timestamp to offers
3. Document this as intentional design for market-making offers

---

### MEDIUM-3: Journey ID Uses Predictable Counter

**Location:** `AuSysFacet.sol:1027-1030`

**Issue:** `_getHashedJourneyId` uses only a counter (`++s.ausysJourneyIdCounter`) without additional entropy:

```solidity
function _getHashedJourneyId(DiamondStorage.AppStorage storage s) internal returns (bytes32) {
    return keccak256(abi.encode(++s.ausysJourneyIdCounter));
}
```

Note: `_getHashedOrderId` was fixed in a previous commit (uses `prevrandao` + creator + timestamp), but journey ID was not updated.

**Impact:** Predictable journey IDs could enable:

- Transaction ordering manipulation
- ID collision attacks if counter resets

**Recommendation:** Apply same fix as order ID:

```solidity
function _getHashedJourneyId(DiamondStorage.AppStorage storage s) internal returns (bytes32) {
    return keccak256(abi.encodePacked(++s.ausysJourneyIdCounter, block.prevrandao, msg.sender, block.timestamp));
}
```

---

### LOW-1: Unused Trusted Signer Infrastructure

**Location:** `AuSysFacet.sol:569-580`

**Issue:** `setTrustedP2PSigner` function exists and stores a signer, but `acceptP2POffer` never verifies signatures against it.

**Impact:** Dead code that could confuse developers; may have been intended for future use.

**Recommendation:** Either implement signature verification (MEDIUM-1) or remove the unused function.

---

## OperatorFacet Findings

### No Critical Issues Found

OperatorFacet is well-audited:

- All admin functions use `onlyOwner` modifier
- Slash function has proper access control
- No reentrancy risks (no external calls in admin functions)

---

## TypeScript `as any` Casts

Found **27 instances** across the codebase:

| File                                                    | Count | Risk                    |
| ------------------------------------------------------- | ----- | ----------------------- |
| `infrastructure/diamond/diamond-p2p-service.ts`         | 6     | Medium - error handling |
| `infrastructure/factories/repository-factory.ts`        | 4     | Medium - type safety    |
| `infrastructure/shared/tx-helper.ts`                    | 2     | Medium - contract calls |
| `app/components/layout/client-header.tsx`               | 2     | Low - window.ethereum   |
| `app/(app)/customer/trading/class/[className]/page.tsx` | 1     | Low - error fallback    |
| Others                                                  | 12    | Various                 |

**Recommendation:** Prioritize fixing `infrastructure/diamond/diamond-p2p-service.ts` and `tx-helper.ts` as these handle core contract interactions.

---

## GitHub Actions Status

| Workflow         | Status         | Notes         |
| ---------------- | -------------- | ------------- |
| CI               | ✅ In Progress | On dev branch |
| Deploy Contracts | ✅ In Progress | On dev branch |
| Deploy Indexer   | ✅ In Progress | On dev branch |
| Schema Reset     | ✅ Queued      | On dev branch |

**Note:** Previous run (commit `revert(security)`) had Deploy Contracts fail due to manifest.json SHA race condition between concurrent runs. Not a security issue - CI concurrency problem. CI itself passed.

---

## Remediation Summary

| Issue                                       | Severity | Status    |
| ------------------------------------------- | -------- | --------- |
| createOrderJourney missing reentrancy guard | CRITICAL | **FIXED** |
| P2P accept no signature verification        | MEDIUM   | Open      |
| Public P2P offers front-runnable            | MEDIUM   | Open      |
| Journey ID predictable                      | MEDIUM   | Open      |
| Unused trustedP2PSigner                     | LOW      | Open      |
| TypeScript as any casts                     | LOW      | Open      |

---

## Fix Applied

Created branch `fix/security-reaudit-2026-03-05` with reentrancy guard fix on `createOrderJourney`.
