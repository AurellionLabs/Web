# Reviewer Checkup — Monday, March 2nd, 2026 — 11:47 PM

## Status: ACTIVE REVIEW IN PROGRESS

---

## Current Work Detected

**Branch**: `fix/security-audit-orders-fixes`

**Changes in progress**:

- `OrderRouterFacet.sol` — Changed `transfer()` → `safeTransfer()` for quote token refunds (line 460)
- `OrderRouterFacetSecurity.t.sol` — Improved test coverage for access control

This fix is **correct and necessary** — it prevents failures with USDT and similar tokens that don't return boolean on transfer.

---

## 🚨 BLOCKER: Incomplete ERC20 Security Fix

While OrderRouterFacet is being fixed, **multiple other facets still use unsafe `.transfer()`**:

### Affected Files:

| Facet                    | Occurrences |
| ------------------------ | ----------- |
| `CLOBMatchingFacet.sol`  | 3           |
| `CLOBAdminFacet.sol`     | 1           |
| `CLOBFacet.sol`          | 7           |
| `CLOBFacetV2.sol`        | 3           |
| `OrderMatchingFacet.sol` | 3           |
| `CLOBCoreFacet.sol`      | 1           |

**Total: 18 unsafe `transfer()` calls** across 6 facets.

### Why This Matters:

- USDT, BNB, and other tokens don't return `bool` on transfer
- These calls will **revert** when interacting with such tokens
- The protocol cannot handle quote tokens that don't follow ERC20 spec

### Recommended Fix:

Replace all `.transfer()` with `.safeTransfer()` using OpenZeppelin's SafeERC20.

---

## Other Findings (Lower Priority)

### ✅ Good Patterns Observed:

- ReentrancyGuard properly inherited in all state-modifying facets
- Access control using `onlyOwner` modifier on admin functions
- DiamondStorage pattern correctly used for storage layout

### ⚠️ Minor Notes:

- `CLOBFacetV2.sol` appears to be deprecated (V2 of CLOBFacet) — consider removing dead code
- BridgeFacet has delegatecalls to `address(this)` at lines 953, 967, 981, 1074 — verify these are intentional

---

## Action Items for Matthew

1. **Immediately**: Complete the `.transfer()` → `.safeTransfer()` audit across all 6 affected facets
2. **Consider**: Adding a CI check to prevent future `.transfer()` usage in contracts/
3. **Verify**: BridgeFacet delegatecall patterns if not already reviewed

---

## Work Completed Without Matthew

- [x] Analyzed current branch changes
- [x] Identified incomplete security fix scope
- [x] Documented all affected files
- [x] Reviewed access control patterns (clean)
- [x] Reviewed reentrancy protection (clean)

---

_Reviewer Agent — Operating autonomously_
