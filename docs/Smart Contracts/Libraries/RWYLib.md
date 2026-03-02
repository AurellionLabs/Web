# RWYLib

Library for Real World Yield (RWY) staking operations.

## Overview

`RWYLib` provides the core functionality for the RWY staking system:

- Collateral management (transfer in/out)
- Opportunity completion tracking
- Fee distribution
- Parameter validation

Extracted from `RWYStakingFacet` to reduce contract size and stack depth.

## Concept: Real World Yield

The RWY system allows:

1. **Operators** create "opportunities" for commodity processing
2. **Users** stake ERC1155 commodities into opportunities
3. **Operators** process commodities (e.g., goat → meat)
4. **Processed goods** are sold on the CLOB
5. **Profits** are distributed to stakers minus fees

## Events

### CollateralReturned

```solidity
event CollateralReturned(
    bytes32 indexed opportunityId,
    address indexed operator,
    uint256 amount
);
```

### OpportunityCompleted

```solidity
event OpportunityCompleted(
    bytes32 indexed opportunityId,
    uint256 totalProceeds
);
```

## Functions

### `transferCollateralIn()`

Transfers collateral from an operator to the Diamond.

```solidity
function transferCollateralIn(
    address token,
    uint256 tokenId,
    uint256 amount,
    address from
) internal
```

**Parameters:**

- `token` - Collateral token address (ERC20 or ERC1155)
- `tokenId` - Token ID (0 for ERC20, >0 for ERC1155)
- `amount` - Amount to transfer
- `from` - Source address

**Behavior:**

- Skips transfer if amount is 0 (for insured/trusted pools)
- Uses ERC20 `safeTransferFrom` for tokenId = 0
- Uses ERC1155 `safeTransferFrom` for tokenId > 0

---

### `returnCollateral()`

Returns collateral to the operator after opportunity completion.

```solidity
function returnCollateral(RWYStorage.Opportunity storage opp) internal
```

**Parameters:**

- `opp` - Opportunity storage reference

**Behavior:**

- Checks if collateral.amount > 0
- Transfers remaining collateral back to operator
- Resets collateral.amount to 0
- Emits `CollateralReturned` event

---

### `checkCompletionStatus()`

Checks if all stakers have claimed and marks opportunity as complete.

```solidity
function checkCompletionStatus(bytes32 opportunityId) internal
```

**Logic:**

1. Get all stakers for the opportunity
2. Check if each staker has claimed their profits
3. If all claimed, call `_completeOpportunity()`

**Use case:** Called after each claim to detect when an opportunity can be finalized.

---

### `validateCreateParams()`

Validates parameters when creating a new opportunity.

```solidity
function validateCreateParams(
    uint256 targetAmount,
    uint256 promisedYieldBps,
    uint256 fundingDays,
    uint256 processingDays,
    address collateralToken,
    uint256 collateralAmount,
    uint256 minSalePrice,
    uint256 maxYieldBps,
    uint256 minOperatorCollateralBps
) internal pure
```

**Validation rules:**

- `targetAmount` > 0
- `promisedYieldBps` <= `maxYieldBps`
- `fundingDays` > 0 and `processingDays` > 0
- If `collateralAmount` > 0:
  - `collateralToken` must be valid
  - `collateralAmount` >= required minimum

**Note:** Collateral of 0 is allowed for insured pools or trusted operators.

---

### `calculateUserShare()`

Calculates a user's share of the proceeds.

```solidity
function calculateUserShare(
    uint256 userStakeAmount,
    uint256 totalStaked,
    uint256 totalProceeds,
    uint256 protocolFeeBps,
    uint256 operatorFeeBps
) internal pure returns (uint256 userShare)
```

**Calculation:**

1. Calculate user's proportion of total stake (in bps)
2. Subtract protocol fee and operator fee from proceeds
3. Multiply remaining by user's proportion

**Example:**

```
userStake = 100, totalStaked = 1000 (10%)
totalProceeds = 10000
protocolFeeBps = 100 (1%)
operatorFeeBps = 200 (2%)

protocolFee = 10000 * 1% = 100
operatorFee = 10000 * 2% = 200
distributable = 10000 - 100 - 200 = 9700
userShare = 9700 * 10% = 970
```

## Internal Functions

### `_completeOpportunity()`

Marks an opportunity as completed and distributes final fees.

```solidity
function _completeOpportunity(
    RWYStorage.RWYAppStorage storage rs,
    DiamondStorage.AppStorage storage s,
    bytes32 opportunityId
) private
```

**Actions:**

1. Set opportunity status to `COMPLETED`
2. Update operator stats (successful ops, total value, reputation)
3. Return remaining operator collateral
4. Transfer protocol and operator fees
5. Emit `OpportunityCompleted` event

---

### `_transferFees()`

Transfers protocol and operator fees.

```solidity
function _transferFees(
    DiamondStorage.AppStorage storage s,
    RWYStorage.RWYAppStorage storage rs,
    RWYStorage.Opportunity storage opp,
    uint256 totalProceeds
) private
```

**Fees:**

- Protocol fee: `totalProceeds * protocolFeeBps / 10000`
- Operator fee: `totalProceeds * operatorFeeBps / 10000`

## Collateral Types

The system supports two collateral types:

| tokenId | Type    | Transfer Method             |
| ------- | ------- | --------------------------- |
| 0       | ERC20   | `IERC20.safeTransferFrom`   |
| >0      | ERC1155 | `IERC1155.safeTransferFrom` |

## Fee Distribution Flow

```
CLOB Sale Proceeds
       ↓
┌──────────────────┐
│ Protocol Fee    │ → feeRecipient
│ (e.g., 1%)      │
└──────────────────┘
       ↓
┌──────────────────┐
│ Operator Fee    │ → opportunity.operator
│ (e.g., 2%)      │
└──────────────────┘
       ↓
┌──────────────────┐
│ Distributable   │ → Stakers (proportional to stake)
└──────────────────┘
```

## Related

- [RWYStorage](./RWYStorage.md) - Storage structures
- [RWYStakingFacet](../Facets/RWYStakingFacet.md) - Main staking facet
- [CLOBLib](./CLOBLib.md) - Order utilities
