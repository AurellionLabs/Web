# Security Audit Report - BridgeFacet & NodesFacet

**Date:** March 3, 2026  
**Auditor:** Sable (Security Agent)  
**Scope:** BridgeFacet.sol, NodesFacet.sol  
**Previous Audit:** CLOBMEVFacet & CLOBLogisticsFacet (same date)

---

## Executive Summary

Audited BridgeFacet (cross-system order bridging) and NodesFacet (node registration/asset management). Found **4 HIGH** and **4 MEDIUM** severity issues. Also catalogued TypeScript `as any` cast usage in production code.

---

## BridgeFacet Findings

### HIGH-1: Missing Reentrancy Guard on bridgeTradeToLogistics

**Location:** `BridgeFacet.sol:182` - `bridgeTradeToLogistics()`

**Issue:** The function is `external` with **no reentrancy guard**. It performs multiple state changes and interacts with external contracts (signature verification, storage updates). While it doesn't directly transfer tokens, a malicious contract could re-enter via a callback in a future update.

```solidity
function bridgeTradeToLogistics(...) external {  // MISSING: nonReentrant
    // ... state modifications ...
    // ... external calls ...
}
```

**Impact:** Potential reentrancy exploitation if the contract is upgraded or if there's a callback mechanism.

**Recommendation:** Add `nonReentrant` modifier:

```solidity
function bridgeTradeToLogistics(...) external nonReentrant { ... }
```

---

### HIGH-2: No Deadline/Expiration on Trade Signatures

**Location:** `BridgeFacet.sol:193-208`

**Issue:** The signature verification in `bridgeTradeToLogistics` has no expiration. Once signed, a signature remains valid forever:

```solidity
bytes32 messageHash = keccak256(
    abi.encodePacked(
        order.clobOrderId,
        _seller,
        _tokenId,
        order.tokenQuantity,
        address(this),
        block.chainid
    )
);
```

**Impact:** If a seller's private key is compromised after signing (but before bridging), the attacker can bridge the trade at any time in the future.

**Recommendation:** Add deadline/expiry:

```solidity
function bridgeTradeToLogistics(
    bytes32 _unifiedOrderId,
    ...
    uint256 _deadline  // Add deadline parameter
) external {
    require(block.timestamp <= _deadline, 'Signature expired');
    ...
}
```

---

### HIGH-3: createLogisticsOrder Can Create Duplicate Journeys

**Location:** `BridgeFacet.sol:254-287`

**Issue:** No check prevents calling `createLogisticsOrder` multiple times for the same unified order. Each call creates a new journey ID and increments `totalJourneys`:

```solidity
journeyId = keccak256(
    abi.encodePacked(_unifiedOrderId, block.prevrandao, msg.sender, block.timestamp)
);
s.journeys[journeyId] = ...;
s.totalJourneys[_unifiedOrderId]++;
```

**Impact:** Seller or seller node can create multiple journeys for a single order, potentially claiming multiple bounties or gaming the logistics system.

**Recommendation:** Add duplicate check:

```solidity
require(order.journeyIds.length == 0, 'Journey already created');
```

---

### HIGH-4: No Validation of AuSys Order ID

**Location:** `BridgeFacet.sol:182` - `_ausysOrderId` parameter

**Issue:** The `_ausysOrderId` parameter is stored directly without any validation that it corresponds to a real AuSys order:

```solidity
order.ausysOrderId = _ausysOrderId;  // No validation!
```

**Impact:** Invalid or fake AuSys order IDs can be recorded, breaking cross-system state consistency.

**Recommendation:** Validate against AuSys:

```solidity
require(s.ausysAddress != address(0), 'AuSys not set');
require(IAuSys(s.ausysAddress).orderExists(_ausysOrderId), 'Invalid AuSys order');
```

---

### MEDIUM-1: Owner Can Bypass All Authorization Checks

**Location:** Multiple functions in BridgeFacet

**Issue:** Contract owner can bypass authorization in critical functions:

- `bridgeTradeToLogistics`: `order.buyer == msg.sender || LibDiamond.contractOwner() == msg.sender`
- `updateJourneyStatus`: `journey.driver == msg.sender || LibDiamond.contractOwner() == msg.sender`
- `cancelUnifiedOrder`: `order.buyer == msg.sender || LibDiamond.contractOwner() == msg.sender`

**Impact:** Single point of failure. Owner can:

- Bridge any trade without signature
- Update any journey status
- Cancel any order

**Recommendation:** Remove owner bypasses for critical operations, or implement:

1. Multi-sig requirement for owner actions
2. Timelock on sensitive owner functions
3. Separate emergency admin role with limited powers

---

### MEDIUM-2: No Token Validation Before Transfer

**Location:** `BridgeFacet.sol:314-380` - `settleOrder()`

**Issue:** The function transfers ERC1155 tokens without validating the token contract:

```solidity
if (order.token != address(0) && order.tokenQuantity > 0) {
    IERC1155(order.token).safeTransferFrom(...);  // No validation!
}
```

**Impact:** If a non-ERC1155 token address is stored in `order.token`, the call will fail with a confusing error.

**Recommendation:** Add token validation in `bridgeTradeToLogistics`:

```solidity
require(IERC165(_token).supportsInterface(0x4e2312e0), 'Token must support ERC1155');
```

---

### MEDIUM-3: Fee Recipient Change Has No Timelock

**Location:** `BridgeFacet.sol:490-495`

**Issue:** `setFeeRecipient()` changes the protocol fee destination immediately with no timelock or multisig:

```solidity
function setFeeRecipient(address _newRecipient) external {
    LibDiamond.enforceIsContractOwner();  // Only owner check
    ...
}
```

**Impact:** Compromised owner can redirect all protocol fees to a malicious address.

**Recommendation:** Add timelock:

```solidity
uint256 public feeRecipientChangeDelay = 2 days;
mapping(address => uint256) public pendingFeeRecipientChanges;

function setFeeRecipient(address _newRecipient) external {
    LibDiamond.enforceIsContractOwner();
    pendingFeeRecipientChanges[_newRecipient] = block.timestamp + feeRecipientChangeDelay;
}

function confirmFeeRecipientChange() external {
    require(block.timestamp >= pendingFeeRecipientChanges[msg.sender], 'Timelock active');
    feeRecipient = msg.sender;
}
```

---

### MEDIUM-4: Missing Events for Critical State Changes

**Location:** `BridgeFacet.sol`

**Issue:** Several state modifications lack events:

- `usedSignatures` mapping updates (no event emitted)
- Journey creation (event exists but doesn't include all relevant data)

**Impact:** Frontend/off-chain tracking more difficult.

---

## NodesFacet Findings

### HIGH-5: depositTokensToNode Missing Reentrancy Guard

**Location:** `NodesFacet.sol:563-585`

**Issue:** Token deposit performs external call without reentrancy protection:

```solidity
function depositTokensToNode(...) external {
    // Transfer tokens from caller to Diamond
    IERC1155(s.auraAssetAddress).safeTransferFrom(...);  // External call

    // Update internal balance (effects)
    s.nodeTokenBalances[_node][_tokenId] += _amount;
}
```

**Impact:** Though checks-effects-interactions pattern is followed, future upgrades or callback-enabled tokens could introduce reentrancy.

**Recommendation:** Add `nonReentrant` modifier.

---

### HIGH-6: withdrawTokensFromNode Has Incorrect Pattern

**Location:** `NodesFacet.sol:597-616`

**Issue:** Function updates balance AFTER external call:

```solidity
function withdrawTokensFromNode(...) external {
    // Transfer tokens from Diamond to caller
    IERC1155(s.auraAssetAddress).safeTransferFrom(...);  // External call FIRST

    // Update internal balance (effects) - WRONG ORDER!
    s.nodeTokenBalances[_node][_tokenId] -= _amount;
}
```

**Impact:** Reentrancy vulnerability! If the token contract callbacks into this contract, the balance hasn't been deducted yet, allowing multiple withdrawals.

**Recommendation:** Fix order - update balance before transfer:

```solidity
function withdrawTokensFromNode(...) external {
    require(s.nodeTokenBalances[_node][_tokenId] >= _amount, 'Insufficient node balance');

    // Update balance FIRST
    s.nodeTokenBalances[_node][_tokenId] -= _amount;

    // THEN transfer
    IERC1155(s.auraAssetAddress).safeTransferFrom(...);
}
```

---

### MEDIUM-5: verifyTokenAccounting Only Checks Specified Nodes

**Location:** `NodesFacet.sol:711-732`

**Issue:** The function only verifies balances for node hashes provided by caller, not all nodes:

```solidity
function verifyTokenAccounting(
    uint256 _tokenId,
    bytes32[] calldata _nodeHashes  // Caller provides nodes!
) external view returns (...) {
```

**Impact:** Incomplete verification - caller could exclude problematic nodes.

**Recommendation:** Add version that checks all nodes:

```solidity
function verifyAllNodeAccounting(uint256 _tokenId) external view returns (...);
```

---

### MEDIUM-6: No Pausability for Node Operations

**Location:** NodesFacet.sol

**Issue:** No pause mechanism for node registration or token operations. In case of critical vulnerability, cannot halt.

**Recommendation:** Implement `Pausable` from OpenZeppelin for:

- Node registration
- Token deposits/withdrawals
- Order placement

---

## TypeScript `as any` Cast Findings

Found **27 instances** of unsafe `as any` casts in production code:

### Critical (User-Facing)

| File                                                    | Line    | Issue                                                                 |
| ------------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| `app/(app)/customer/trading/class/[className]/page.tsx` | 536     | `bids: [] as any[]` - type assertion hiding potential error           |
| `app/components/trading/user-orders.tsx`                | 332-333 | `(order as any).timeInForce` - accessing potentially missing property |
| `app/components/trading/order-progress.tsx`             | 196     | `mockOrder as any` - bypassing type safety                            |

### Service Layer

| File                                            | Line                            | Issue                                    |
| ----------------------------------------------- | ------------------------------- | ---------------------------------------- |
| `app/providers/customer.provider.tsx`           | 241,249,322,330,338,420,426,477 | Multiple `journeyId as any` casts        |
| `infrastructure/diamond/diamond-p2p-service.ts` | Multiple                        | `(wrapped as any).originalError` pattern |
| `infrastructure/contexts/service-context.ts`    | 40                              | `ausys as any`, `signer as any`          |

### Recommended Fixes

1. **Define proper interfaces** for journey types, order types
2. **Use type guards** instead of `as any`
3. **Fix root cause** - API responses should match expected types

---

## Summary

| Severity | BridgeFacet | NodesFacet | TypeScript |
| -------- | ----------- | ---------- | ---------- |
| HIGH     | 4           | 2          | -          |
| MEDIUM   | 4           | 2          | -          |
| LOW      | 1           | 1          | 27 casts   |

### Fixes That Can Be Applied Now:

1. ✅ Add `nonReentrant` to `bridgeTradeToLogistics`
2. ✅ Fix `withdrawTokensFromNode` pattern (checks-effects-interactions)
3. ✅ Add duplicate journey check in `createLogisticsOrder`
4. ✅ Add deadline parameter to signature verification
5. ⚠️ Owner bypasses (requires design decision)
6. ⚠️ Token validation (requires interface change)

---

## Positive Findings

1. **Signature replay protection** - `usedSignatures` mapping prevents reuse
2. **Chain ID in signature** - Prevents cross-chain signature replay
3. **NonReentrant on critical functions** - `settleOrder`, `createUnifiedOrder`, `cancelUnifiedOrder` protected
4. **Proper access control on node ownership** - Node functions check `owner == msg.sender`
5. **Internal balance accounting** - Tokens held by Diamond, node balances tracked separately
6. **Escrow model** - Funds held in contract, released only on delivery

---

**Recommendation:** Apply HIGH severity fixes before next mainnet deployment. Address TypeScript `as any` casts in sprint planning.
