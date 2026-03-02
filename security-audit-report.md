# Security Audit Report - March 2, 2026

## Executive Summary

Conducted a security audit of the Aurellion DeFi codebase focusing on recently modified facets (BridgeFacet, AuSysFacet, CLOBCoreFacet) and related components. Identified several vulnerabilities ranging from critical economic issues to medium-severity access control gaps.

---

## Findings

### CRITICAL

#### 1. Missing Fee Collection in CLOBCoreFacet Order Matching

**Location:** `contracts/diamond/facets/CLOBCoreFacet.sol` + `contracts/diamond/libraries/OrderMatchingLib.sol`

**Description:**
Orders placed via `CLOBCoreFacet.placeLimitOrder()` and `placeNodeSellOrderV2()` use `OrderMatchingLib.matchOrder()` for order execution. However, `OrderMatchingLib._executeTrade()` does NOT collect any maker/taker fees - it simply transfers full quote amounts between maker and taker.

**Impact:**

- Protocol loses all fees on trades executed through CLOBCoreFacet
- Attacker can place large orders and systematically drain protocol revenue
- Compare: `CLOBMatchingFacet` and `CLOBFacetV2` correctly implement fee collection

**Proof of Concept:**

```solidity
// OrderMatchingLib.sol _executeTrade():
function _executeTrade(...) private {
    // ... get buyer, seller, quoteAmount ...

    // NO FEE DEDUCTION - full amount transferred!
    IERC1155(ctx.baseToken).safeTransferFrom(address(this), buyer, ctx.baseTokenId, amount, "");
    IERC20(ctx.quoteToken).transfer(seller, quoteAmount);  // 100% to seller

    // Should deduct: uint256 makerFee = (quoteAmount * s.makerFeeBps) / BASIS_POINTS;
}
```

**Remediation:**
Add fee collection to `OrderMatchingLib._executeTrade()`:

```solidity
uint256 makerFee = s.makerFeeBps > 0 ? (quoteAmount * s.makerFeeBps) / BASIS_POINTS : 0;
uint256 takerFee = s.takerFeeBps > 0 ? (quoteAmount * s.takerFeeBps) / BASIS_POINTS : 0;
```

**Status:** FIX APPLIED - Added fee collection to OrderMatchingLib.\_executeTrade()

---

### HIGH

#### 2. Double Settlement Risk in AuSysFacet.handOff()

**Location:** `contracts/diamond/facets/AuSysFacet.sol:829-880`

**Description:**
In `handOff()`, the order settlement check (`O.currentStatus == OrderStatus.AUSYS_SETTLED`) happens AFTER validating driver and receiver signatures. If an order is already settled, users lose their signatures (driverDeliverySigned/receiverHandOff marked true) without receiving payout.

**Impact:**

- Drivers/receivers waste gas and lose signature credentials
- No direct fund loss but enables griefing

**Remediation:**
Move settlement status check BEFORE signature validation.

**Status:** DOCUMENTED - Needs fix

---

#### 3. Front-Running Risk in BridgeFacet.bridgeTradeToLogistics()

**Location:** `contracts/diamond/facets/BridgeFacet.sol:185-245`

**Description:**
The `bridgeTradeToLogistics` function has no protection against front-running.

**Status:** DOCUMENTED - Needs fix

---

### MEDIUM

#### 4. Duplicate Journey Creation in BridgeFacet.createLogisticsOrder()

**Status:** DOCUMENTED - Needs fix

#### 5. Token Destination Admin Recovery Window Abuse

**Status:** DOCUMENTED - Needs fix

#### 6. P2P Offer Expiration Not Validated Consistently

**Status:** DOCUMENTED - Needs fix

---

## Summary Table

| Severity | Finding                                 | Status        |
| -------- | --------------------------------------- | ------------- |
| CRITICAL | Missing fee collection in CLOBCoreFacet | **FIXED**     |
| HIGH     | Double settlement risk in handOff()     | **NEEDS FIX** |
| HIGH     | Front-running in bridgeTradeToLogistics | **NEEDS FIX** |
| MEDIUM   | Duplicate journey creation              | **NEEDS FIX** |
| MEDIUM   | Admin recovery window                   | **NEEDS FIX** |
| MEDIUM   | P2P offer expiration handling           | **NEEDS FIX** |

---

## Recommendations

1. **Immediate:** Fix missing fee collection in OrderMatchingLib - this is actively draining protocol revenue - DONE
2. **High Priority:** Fix handOff() settlement check ordering
3. **Medium Priority:** Add journey duplicate protection, improve admin recovery

---

_Report generated: March 2, 2026_
_Auditor: Security Agent_
