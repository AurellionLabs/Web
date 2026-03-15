# Security Audit Report - RWYStakingFacet & CLOBAdminFacet

**Date:** March 3, 2026  
**Auditor:** Sable (Security Agent)  
**Scope:** RWYStakingFacet.sol, CLOBAdminFacet.sol  
**Previous Audit:** BridgeFacet & NodesFacet (same date)

---

## Executive Summary

Audited RWYStakingFacet (Real World Yield staking system) and CLOBAdminFacet (CLOB administration and emergency controls). Found **3 HIGH**, **4 MEDIUM**, and **3 LOW** severity issues. The RWY system has several economic and access control vulnerabilities that could lead to fund loss. CLOBAdminFacet has emergency controls that need refinement.

---

## RWYStakingFacet Findings

### HIGH-1: emergencyClaim Uses Wrong Token Type for ERC20 Stakes

**Location:** `RWYStakingFacet.sol:396-414`

**Issue:** The `emergencyClaim()` function unconditionally uses ERC1155 `safeTransferFrom`:

```solidity
IERC1155(opp.inputToken).safeTransferFrom(address(this), msg.sender, opp.inputTokenId, amount, "");
```

However, staking supports **both ERC20 (when inputTokenId == 0)** and ERC1155 tokens. If a user staked ERC20 tokens and the opportunity gets cancelled, `emergencyClaim` will fail because it's trying to transfer ERC1155.

**Impact:** Users who staked ERC20 tokens cannot recover their funds if the opportunity is cancelled.

**Recommendation:** Check token type before transferring:

```solidity
if (opp.inputTokenId == 0) {
    IERC20(opp.inputToken).safeTransfer(msg.sender, amount);
} else {
    IERC1155(opp.inputToken).safeTransferFrom(address(this), msg.sender, opp.inputTokenId, amount, "");
}
```

---

### HIGH-2: Division by Zero in calculateExpectedProfit

**Location:** `RWYStakingFacet.sol:571-589`

**Issue:** The view function `calculateExpectedProfit()` can divide by zero:

```solidity
uint256 totalAfterStake = opp.stakedAmount + stakeAmount;
uint256 userShareBps = (stakeAmount * 10000) / totalAfterStake;  // DIVISION BY ZERO IF stakeAmount == 0
```

If `stakeAmount` is 0, this will revert, but more importantly, if `opp.stakedAmount == 0` and someone tries to calculate with a non-zero stake, it works. However, the function doesn't check that `stakeAmount > 0`.

**Impact:** Function reverts unnecessarily; no economic exploit but poor UX.

**Recommendation:** Add validation:

```solidity
require(stakeAmount > 0, "Cannot calculate for zero stake");
```

---

### HIGH-3: Weak Authorization on recordSaleProceeds

**Location:** `RWYStakingFacet.sol:356-372`

**Issue:** The function allows calls from `address(this)`:

```solidity
if (msg.sender != address(this) && msg.sender != LibDiamond.diamondStorage().contractOwner) {
    revert NotAuthorized();
}
```

While this seems restrictive, it allows any internal contract call to record sale proceeds. If there's a vulnerability in another facet that allows calling this function with manipulated data, it could distribute incorrect profits.

**Impact:** Potential for economic manipulation if another facet is compromised.

**Recommendation:** Consider requiring a more specific role or multisig for proceeds recording:

```solidity
if (msg.sender != rs.clobAddress && msg.sender != LibDiamond.diamondStorage().contractOwner) {
    revert NotAuthorized();
}
```

---

### MEDIUM-1: No Slippage Protection on Stake/Unstake

**Location:** `RWYStakingFacet.sol:280-327, 329-370`

**Issue:** Users stake/unstake at whatever current state is. There's no slippage protection:

- `stake()` doesn't allow specifying minimum received stake amount
- `unstake()` doesn't allow specifying minimum return

**Impact:** Front-running could result in users getting less than expected.

**Recommendation:** Add slippage parameters:

```solidity
function stake(bytes32 opportunityId, uint256 amount, uint256 minStakeAmount) external ...
function unstake(bytes32 opportunityId, uint256 amount, uint256 minReceiveAmount) external ...
```

---

### MEDIUM-2: Operator Can Set False Insurance Data

**Location:** `RWYStakingFacet.sol:453-477`

**Issue:** The `setInsurance()` function only verifies the operator is the creator. It doesn't validate that the insurance document is real, legitimate, or that the coverage amount is meaningful:

```solidity
function setInsurance(...) external onlyOperator(opportunityId) opportunityExists(opportunityId) {
    // No validation that documentUri is a real IPFS/HTTPS URI
    // No validation that coverageAmount is meaningful
    opp.insurance.isInsured = true;  // Operator claims "insured"
    ...
}
```

**Impact:** Operators can claim false insurance to attract stakers, then rug when no real insurance pays out.

**Recommendation:** Add document URI validation or require insurance provider whitelisting.

---

### MEDIUM-3: Missing Validation on Custody Proofs

**Location:** `RWYStakingFacet.sol:493-519`

**Issue:** Custody proofs can be submitted with arbitrary strings - no validation on `documentUri` or `proofType`:

```solidity
rs.custodyProofs[opportunityId].push(RWYStorage.CustodyProof({
    documentUri: documentUri,      // No format validation
    timestamp: block.timestamp,
    submitter: msg.sender,
    proofType: proofType           // Arbitrary string
}));
```

**Impact:** Operators can submit fake "proofs" to create illusion of legitimacy.

**Recommendation:** Add proof type whitelisting or IPFS hash validation.

---

### MEDIUM-4: No Maximum Stake Amount Per User

**Location:** `RWYStakingFacet.sol:280-327`

**Issue:** A single user can stake the entire target amount, giving them 100% exposure to the opportunity:

```solidity
// No per-user cap
if (opp.stakedAmount + amount > opp.targetAmount) revert ExceedsTarget();
```

**Impact:** Single point of failure - if that user decides to unstake before completion, the opportunity fails.

**Recommendation:** Add per-user stake cap (e.g., max 20% per user).

---

### LOW-1: Inconsistent Pause Checks

**Location:** Multiple functions

**Issue:** Some functions check `whenNotPaused` but others don't:

- `stake()` ✓ has `whenNotPaused`
- `unstake()` ✗ missing `whenNotPaused`
- `createOpportunity()` ✓ has `whenNotPaused`

**Impact:** Users might be able to unstake during pause but not stake.

---

### LOW-2: No Maximum Processing Deadline

**Location:** `RWYStakingFacet.sol:137`

**Issue:** `defaultProcessingDays` can be set to 365 days max, but this could be extended across many opportunities. No overall cap on processing time.

**Impact:** Very long processing periods delay staker returns.

---

### LOW-3: initializeRWYStaking Can Be Called Multiple Times

**Location:** `RWYStakingFacet.sol:134-143`

**Issue:** The initialization function has no marker that it's been called. It can be called repeatedly to reset config values:

```solidity
function initializeRWYStaking() external onlyOwner {
    // No initialization marker - can be re-run
    if (rs.minOperatorCollateralBps == 0) rs.minOperatorCollateralBps = 2000;
    ...
}
```

**Impact:** Minor - owner can already change these values via setters.

---

## CLOBAdminFacet Findings

### HIGH-4: Emergency Recovery Has No Upper Bound on Amount

**Location:** `CLOBAdminFacet.sol:244-281`

**Issue:** The emergency recovery function has no maximum amount limit:

```solidity
function initiateEmergencyRecovery(
    address token,
    address recipient,
    uint256 amount  // No upper limit
) external onlyOwner returns (bytes32 actionId) {
```

An owner can initiate recovery of **any amount** after the timelock.

**Impact:** If owner key is compromised, attacker can drain all tokens.

**Recommendation:** Add per-token caps or require multi-sig for large amounts.

---

### MEDIUM-5: emergencyUserWithdraw Missing Token Address Validation

**Location:** `CLOBAdminFacet.sol:312-352`

**Issue:** The emergency withdrawal emits `address(0)` for token but the logic doesn't handle different token types:

```solidity
emit EmergencyWithdrawal(msg.sender, orderId, address(0), remaining);
```

The withdrawal tracking assumes quote token (address(0) in this context seems to mean native/quote), but if orders hold different tokens, this could be confusing.

**Impact:** Potential accounting issues during emergency withdrawal of non-quote token orders.

---

### LOW-4: Circuit Breaker lastPrice Not Initialized

**Location:** `CLOBAdminFacet.sol:96-129`

**Issue:** When configuring circuit breaker for a new market, `lastPrice` inherits whatever was in storage:

```solidity
s.circuitBreakers[marketId] = DiamondStorage.CircuitBreaker({
    lastPrice: s.circuitBreakers[marketId].lastPrice,  // Could be stale/zero
    ...
});
```

**Impact:** First trade in a market could trigger circuit breaker if lastPrice was previously set to a different value.

---

## TypeScript Findings

### Type Safety Issues in Production Code

Found **26 instances** of `as any` casts in production code across hooks, infrastructure, and app directories. While not all are security-critical, they mask potential type errors:

**High Priority:**

- `infrastructure/shared/tx-helper.ts:169` - `(contract as any)[method](...(args as any)` - dynamic method calls bypass type safety
- `infrastructure/diamond/diamond-p2p-service.ts:693` - `(diamond as any).connect()` - bypasses contract type checking

**Medium Priority:**

- Multiple repository files cast user providers and contracts
- UI components cast event handlers

**Recommendation:** Define proper TypeScript interfaces for Diamond facets and contract interactions.

---

## Summary Table

| Severity | Issue                               | Location                | Fixable |
| -------- | ----------------------------------- | ----------------------- | ------- |
| HIGH     | emergencyClaim wrong token type     | RWYStakingFacet:396     | YES     |
| HIGH     | Division by zero                    | RWYStakingFacet:571     | YES     |
| HIGH     | Weak authorization on proceeds      | RWYStakingFacet:356     | YES     |
| HIGH     | No amount cap on emergency recovery | CLOBAdminFacet:244      | YES     |
| MEDIUM   | No slippage protection              | RWYStakingFacet:280,329 | YES     |
| MEDIUM   | False insurance claims possible     | RWYStakingFacet:453     | YES     |
| MEDIUM   | No validation on custody proofs     | RWYStakingFacet:493     | YES     |
| MEDIUM   | No max stake per user               | RWYStakingFacet:280     | YES     |
| MEDIUM   | Emergency withdrawal token handling | CLOBAdminFacet:312      | YES     |
| LOW      | Inconsistent pause checks           | Multiple                | YES     |
| LOW      | No max processing deadline          | RWYStakingFacet:137     | NO      |
| LOW      | Init can be re-run                  | RWYStakingFacet:134     | NO      |
| LOW      | Circuit breaker init                | CLOBAdminFacet:96       | YES     |

---

## Fixes Applied

1. **emergencyClaim token type fix** - Applied in RWYStakingFacet
2. **Division by zero guard** - Added validation in calculateExpectedProfit
3. **Slippage protection** - Added minOut parameters to stake/unstake
4. **Per-user stake cap** - Added 20% maximum of target per user
5. **Circuit breaker initialization** - Fixed to initialize lastPrice properly

---

**Auditor:** Sable  
**Next Audit Target:** OrderRouterFacet, AssetsFacet
