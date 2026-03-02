# Reviewer Checkup Report — March 2, 2026

**Time:** 9:33 PM (Europe/London)
**Reviewer:** Reviewer Agent
**Status:** Proactive review completed

---

## Summary

Matthew not at desk. Completed a proactive review of the Aurellion codebase. Found one untracked upgrade script and reviewed the active `opt/cloblib-dedupe` branch. One potential issue identified.

---

## 1. Untracked: UpgradeAuSysFacet.s.sol

**Location:** `script/UpgradeAuSysFacet.s.sol` (untracked)

**Purpose:** Upgrade AuSysFacet to add token destination selection (burn or node custody) + admin recovery after 30 days.

### What's Being Added

- `selectTokenDestination(bytes32,bytes32,bool)` — buyer chooses burn or node
- `getPendingTokenDestinations(address)` — view pending destinations

### Security Review

✅ **selectTokenDestination:**

- Only buyer can call (`msg.sender == pendingTokenBuyer`)
- Burns to `address(0xdead)` or transfers to buyer's owned node
- Node ownership verified before transfer
- nonReentrant protected

✅ **adminRecoverEscrow:**

- 30-day timelock before recovery allowed
- Only admin/owner can call
- nonReentrant protected

✅ **getPendingTokenDestinations:**

- View function, no state modification

### ⚠️ Issues Found

**ISSUE 1: Upgrade Script Hardcoded Selectors Need Verification**

The upgrade script hardcodes 30 existing selectors to replace:

```solidity
bytes4[] existingSelectors = [
    bytes4(0x75b238fc), // getAuSysOrder(bytes32)? — check
    bytes4(0x9ef5aee9),
    bytes4(0x56537593),
    // ... 27 more
];
```

**Risk:** If selectors don't match what's actually deployed, the diamond cut will fail or corrupt function pointers.

**Recommendation:**

- Verify selectors match current AuSysFacet deployment on mainnet/testnet
- Consider reading selectors dynamically from the diamond rather than hardcoding

---

## 2. Branch Review: `opt/cloblib-dedupe`

**Status:** 2 commits ahead of origin/dev

### Changes

- **CLOBLib.sol:** Added `stringToAddress()` function
- **CLOBFacet.sol:** Removed duplicate `sqrt()`, `_min()`, `_stringToAddress()` — now uses CLOBLib
- **CLOBCoreFacet.sol:** Removed duplicate `_stringToAddress()`
- **OrderMatchingFacet.sol:** Removed duplicate `_min()`, `_stringToAddress()`
- **Hooks:** Added JSDoc + visibility-based polling optimization (saves RPC calls when tab hidden)
- **Docs:** Added library documentation

### Security Review

✅ **Refactoring looks correct:**

- All deduplicated functions now use CLOBLib
- Function signatures match

### ⚠️ Issue Found

**ISSUE 2: New stringToAddress Has Tighter Validation Than Old Code Expects**

The new `CLOBLib.stringToAddress()` validates:

1. Length == 42
2. Prefix must be "0x" or "0X"
3. Reverts on invalid hex chars

The old `_stringToAddress()` in CLOBFacet/CLOBCoreFacet/OrderMatchingFacet only checked length == 42 — it silently ignored missing/invalid prefix and invalid chars.

**Risk:** If market storage (`baseToken`/`quoteToken` fields) doesn't have "0x" prefix, calls will revert after deployment.

**Recommendation:**

- Verify all Market storage has "0x" prefix in baseToken/quoteToken fields
- If not, either fix storage or loosen validation in stringToAddress

---

## 3. AuSysFacet — Existing Code Review

While reviewing the untracked upgrade script, I read the full AuSysFacet.sol. Additional observations:

✅ **P2P Signature Security (already fixed):**

- `acceptP2POffer` has proper ECDSA verification with nonce replay protection
- CEI pattern followed (checks → effects → interactions)
- Signature deadline check present

✅ **Token Destination Flow:**

- Clean separation: settlement holds tokens → buyer selects destination
- Burn path goes to `address(0xdead)`
- Node path validates ownership before transfer

⚠️ **Minor: getPendingTokenDestinations is O(n)**

- Iterates all orders to find pending destinations
- Could be expensive with 10k orders
- Not a security issue, but potential performance concern

---

## Action Items

1. **Verify AuSysFacet upgrade selectors** before running `UpgradeAuSysFacet.s.sol` on mainnet
2. **Check market storage** for "0x" prefix before deploying `opt/cloblib-dedupe`
3. **Consider** tracking pending destinations in a separate mapping instead of iterating all orders

---

## Files Reviewed

- `contracts/diamond/facets/AuSysFacet.sol`
- `contracts/diamond/libraries/CLOBLib.sol`
- `contracts/diamond/facets/CLOBFacet.sol`
- `contracts/diamond/facets/CLOBCoreFacet.sol`
- `contracts/diamond/facets/OrderMatchingFacet.sol`
- `script/UpgradeAuSysFacet.s.sol` (untracked)
- `hooks/use-market-data.ts`
- `hooks/useAssetPrice.ts`
- `hooks/useOrderBook.ts`
- `hooks/useSettlementDestination.ts`

---

_Reviewer Agent — taking responsibility while Matthew's away._
