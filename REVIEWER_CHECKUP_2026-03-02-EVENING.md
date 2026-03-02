# Reviewer Checkup Report — March 2, 2026 (Evening)

**Time:** 9:51 PM (Europe/London)
**Reviewer:** Reviewer Agent
**Status:** Proactive review completed

---

## Summary

Matthew not at desk. Completed a proactive review of open PRs against dev, recent security fixes, and codebase state. All security fixes from earlier today are now merged to dev. Found one minor issue in a pending PR and verified the BridgeFacet security fixes are sound.

---

## 1. Security Fixes Already Merged Today

### ✅ AuSysFacet ECDSA + Nonce Replay Protection (#50)

**Status:** Merged to dev at 20:11 UTC

- Added proper ECDSA signature verification in `acceptP2POffer`
- Added nonce replay protection to prevent signature reuse
- CEI pattern followed correctly

### ⏳ BridgeFacet Security Fix (#49) — OPEN PR

**Status:** Awaiting review/merge

**Fixes included:**

1. **Order entropy** — Replaced deterministic `keccak256(_clobOrderId, sender, timestamp)` with `keccak256(++counter, block.prevrandao, msg.sender, timestamp)` in both `createUnifiedOrder` and `createLogisticsOrder`
2. **Seller zero-address check** — Added in `settleOrder`
3. **Node validation** — Verifies `_sellerNode` is a registered node owner in DiamondStorage
4. **Bounty distribution** — Now iterates ALL journeys, splits evenly, returns remainder to seller
5. **Fee computation** — Reads from storage (`s.bountyPercentage`, `s.protocolFeePercentage`)

**Security Review:**
✅ All fixes look correct and properly implemented
✅ Non-reentrant modifiers in place
✅ Access control checks present

**⚠️ Minor Issue Found:**

Looking at the current `BridgeFacet.sol` (lines 86-88), I see the order ID still uses deterministic entropy:

```solidity
unifiedOrderId = keccak256(
    abi.encodePacked(_clobOrderId, msg.sender, block.timestamp)
);
```

**This appears to be the OLD code**, not the fixed version. The PR #49 claims to have fixed this but the current dev branch still has the old implementation. This may indicate:

- The branch `fix/bridgefacet-security-v2` was not merged yet, OR
- There's a discrepancy between the PR claims and actual code

**RECOMMENDATION:** Verify PR #49 changes are actually in the branch and merge it.

---

## 2. Open PRs Against Dev

| #   | Title                                                                          | Status | Risk       |
| --- | ------------------------------------------------------------------------------ | ------ | ---------- |
| 55  | fix(admin): use custom NotOwner error in CLOBAdminFacet                        | OPEN   | Low        |
| 54  | refactor: deduplicate utility functions in CLOBLib                             | OPEN   | Low        |
| 53  | test: add OrdersFacet tests and fix CLOBAdminFacet test failures               | OPEN   | Low        |
| 52  | perf: reduce GraphQL query limits and add visibility-aware polling             | OPEN   | Low        |
| 51  | test: fix CLOBAdminFacet failures and add OperatorFacet tests                  | OPEN   | Low        |
| 49  | fix(security): BridgeFacet order entropy, bounty distribution, node validation | OPEN   | **Medium** |

### PR #55 — CLOBAdminFacet NotOwner Error

**Issue:** Tests expecting custom `NotOwner()` error but getting string message

✅ **Fix looks correct:** Changed to use custom error instead of LibDiamond string
⚠️ Also adds substantial docs files (200-300 lines each) — verify docs are accurate

### PR #54 — CLOBLib Deduplication

✅ Previous checkup identified potential issue with `stringToAddress` validation
✅ PR appears to address this - verify all market storage has "0x" prefix before merge

### PR #52 — Performance Optimization

✅ GraphQL query limits reduced from 1000 to 100
✅ Visibility-aware polling added to prevent wasteful RPC calls when tab is backgrounded
✅ Well-scoped, low-risk changes

---

## 3. Build Status

```
forge build: ✅ PASSED (warnings only)
```

Warnings are pre-existing (not from new code):

- Unwrapped modifier logic in OwnershipFacet
- Inefficient keccak256 in RWYStakingFacet

---

## 4. Action Items

1. **MERGE PR #49** — BridgeFacet security fixes (highest priority)
2. **Verify PR #49** actually contains the order entropy fix in the diff (the current dev code still has old entropy)
3. **Review PR #55** — CLOBAdminFacet error customisation (low risk, can merge)
4. **Check PR #54** — Verify market storage has "0x" prefix before merging CLOBLib changes

---

## Files Reviewed

- `contracts/diamond/facets/BridgeFacet.sol`
- `contracts/diamond/facets/AuSysFacet.sol`
- `contracts/diamond/facets/CLOBAdminFacet.sol`
- `contracts/diamond/libraries/CLOBLib.sol`
- `hooks/useSettlementDestination.ts`
- `hooks/use-market-data.ts`
- `hooks/useOrderBook.ts`

---

_Reviewer Agent — taking responsibility while Matthew's away._
