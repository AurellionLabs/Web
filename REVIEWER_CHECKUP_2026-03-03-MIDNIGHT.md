# Reviewer Checkup — Tuesday, March 3rd, 2026 — 12:36 AM

## Status: 🔴 CRITICAL ISSUES FOUND

---

## Executive Summary

Matthew is away. I did a proactive reviewer pass on the Aurellion codebase. **Two critical issues found that need immediate attention**:

1. **BLOCKING BUG**: TypeScript compilation errors in active branch
2. **UNFIXED SECURITY ISSUE**: Unsafe `.transfer()` calls still present (from March 2nd)

---

## 🔴 BLOCKER #1: TypeScript Compilation Errors (ACTIVE)

The current working branch `fix/rpc-call-deduplication` has **broken TypeScript** that will prevent builds:

### Error 1: Broken import in trading page

**File**: `app/(app)/customer/trading/class/[className]/page.tsx:179`

```
error TS2304: Cannot find name 'useAssetPrice'.
```

**What's broken**:

- Import was changed to `useUnifiedCLOB` (line 51)
- But line 179 still calls `useAssetPrice()` which no longer exists
- This is a partial refactoring - looks like work was interrupted

**Current code (broken)**:

```typescript
// Line 51: import changed
import { useUnifiedCLOB } from '@/hooks/useUnifiedCLOB';

// Line 179: still using old hook
const { priceData, isLoading: isPriceLoading } = useAssetPrice(
  selectedAsset?.tokenId || '0',
);
```

### Error 2: Type mismatch in useUnifiedCLOB

**File**: `hooks/useUnifiedCLOB.ts:251`

```
error TS2322: Type '() => void' is not assignable to type '() => Promise<void>'.
```

**The `refetch` function returns `void` but the interface expects `Promise<void>`**.

---

## 🔴 BLOCKER #2: UNFIXED Security Issue (From March 2nd)

The previous checkup identified **18 unsafe `.transfer()` calls** across 7 facets. **This has NOT been fixed**.

### Affected Files (unchanged from March 2nd):

| Facet                  | Unsafe Calls |
| ---------------------- | ------------ |
| CLOBFacet.sol          | 6            |
| OrderMatchingFacet.sol | 3            |
| CLOBFacetV2.sol        | 3            |
| CLOBMatchingFacet.sol  | 3            |
| CLOBAdminFacet.sol     | 1            |
| CLOBCoreFacet.sol      | 1            |
| OrderRouterFacet.sol   | 1            |
| **TOTAL**              | **18**       |

### Why This Matters:

- USDT, BNB, and similar tokens **don't return `bool`** on transfer
- These `.transfer()` calls will **revert** when used with such tokens
- The protocol cannot handle non-compliant ERC20 tokens

### Fix Required:

Replace all `IERC20(...).transfer(...)` with `IERC20(...).safeTransfer(...)` using OpenZeppelin's SafeERC20 library.

---

## Current Work Detected

**Branch**: `fix/rpc-call-deduplication`

**Intent**: Reduce RPC calls by merging `useAssetPrice` and `useOrderBook` into a single `useUnifiedCLOB` hook.

**New File**: `hooks/useUnifiedCLOB.ts` - Well-designed optimization that:

- Fetches order book once
- Derives both price and order book data from it
- Reduces RPC calls by ~50% for trading pages
- Has visibility-aware polling (only polls when page is visible)

**Problem**: The refactoring is incomplete - the page.tsx still references the old hook.

---

## Test Status

```
test-results/.last-run.json: { "status": "failed", "failedTests": [] }
```

Status shows "failed" but no failed tests listed - something may have crashed during test run.

---

## ✅ Good Patterns Observed

1. **No selfdestruct/suicide** calls found in contracts
2. **ReentrancyGuard** properly inherited in state-modifying facets
3. **Access control** using `onlyOwner` modifier correctly implemented
4. **Delegatecall patterns** in NodesFacet appear intentional (calling other facets within same diamond)

---

## ⚠️ Minor Notes

- **CLOBFacetV2.sol**: Appears to be deprecated (V2 of CLOBFacet) — dead code that could be removed
- **NodesFacet delegatecalls** at lines 953, 955, 969, 983, 1075, 1076 — verify these are intentional (they call other facets in the same diamond)

---

## Action Items for Matthew

### Immediate (BLOCKERS):

1. **Fix TypeScript errors**:

   - Either complete the refactoring: change line 179 to use `useUnifiedCLOB` properly
   - Or revert to `useAssetPrice` if the refactoring isn't ready
   - Fix the `refetch` return type in `useUnifiedCLOB.ts`

2. **Address the security issue**:
   - Replace all 18 `.transfer()` calls with `.safeTransfer()`
   - This was flagged on March 2nd and is still unfixed

### Future Improvements:

3. Add a CI check to prevent future `.transfer()` usage in contracts/
4. Consider removing deprecated CLOBFacetV2.sol

---

## Work Completed Without Matthew

- [x] Analyzed git status and current branch work
- [x] Verified TypeScript compilation status (found errors)
- [x] Re-audited unsafe `.transfer()` calls (still unfixed)
- [x] Checked for other security issues (selfdestruct, reentrancy)
- [x] Reviewed test status
- [x] Documented all findings

---

_Reviewer Agent — Operating autonomously at Matthew's request_
_Time: Tuesday, March 3rd, 2026 — 12:36 AM_
