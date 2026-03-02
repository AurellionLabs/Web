---
tags: [smart-contracts, facets, rwy, staking, yield]
---

# RWYStakingFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > RWYStakingFacet

`RWYStakingFacet.sol` implements **Real World Yield (RWY)** — a mechanism for commodity staking where users commit physical-asset tokens to processing operations and receive a share of the resulting profits.

---

## Overview

| Property       | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| File           | `contracts/diamond/facets/RWYStakingFacet.sol`                         |
| Storage        | `RWYStorage` (separate storage slot from AppStorage)                   |
| Default config | Collateral: 20%, Max yield: 50%, Protocol fee: 1%, Processing: 30 days |
| Role           | `approvedOperators` mapping in AppStorage                              |

---

## The RWY Model

```
Commodity Operator (e.g., grain processor)
  │
  │  createOpportunity(name, inputToken, targetAmount, promisedYieldBps)
  ▼
RWY Opportunity (status=OPEN)
  │
  │  Stakers commit tokens: stakeToOpportunity(id, amount)
  ▼
Opportunity FUNDED (targetAmount reached)
  │
  │  Operator: startProcessing(id) → Delivery to processing facility
  │  Operator: confirmProcessingComplete(id, outputAmount, outputTokenId)
  │  Operator: recordSaleProceeds(id, proceeds)
  ▼
Profits Available
  │
  │  Stakers: claimProfit(id)
  │  → receives: principal + proportional profit share
  ▼
Opportunity COMPLETE
```

---

## Opportunity Lifecycle States

| State        | Description                             |
| ------------ | --------------------------------------- |
| OPEN         | Accepting stakes, not yet funded        |
| FUNDED       | Target amount reached, ready to process |
| DELIVERY     | Goods in transit to processing facility |
| PROCESSING   | Transformation in progress              |
| PROCESSED    | Processing complete, awaiting sale      |
| SOLD         | Proceeds recorded                       |
| DISTRIBUTING | Profits being claimed                   |
| COMPLETE     | All stakers claimed                     |
| CANCELLED    | Opportunity cancelled, stakes refunded  |

---

## Functions

### Operator Functions

#### `createOpportunity(string name, string description, address inputToken, uint256 inputTokenId, uint256 targetAmount, uint256 promisedYieldBps, uint256 fundingDeadline, uint256 processingDeadline) → bytes32 id`

Creates a new RWY opportunity.

**Modifiers:** `onlyApprovedOperator`

**Parameters:**

| Parameter            | Description                                    |
| -------------------- | ---------------------------------------------- |
| `name`               | Human-readable opportunity name                |
| `description`        | Description of the processing operation        |
| `inputToken`         | ERC-1155 asset token to be staked              |
| `inputTokenId`       | Token ID of the asset                          |
| `targetAmount`       | Total tokens needed to fund the opportunity    |
| `promisedYieldBps`   | Expected yield in basis points (1234 = 12.34%) |
| `fundingDeadline`    | Unix timestamp after which funding closes      |
| `processingDeadline` | Deadline for processing completion             |

**Validates:** `promisedYieldBps <= maxYieldBps` (default 5000 = 50%)

**Emits:** `OpportunityCreated(id, operator, inputToken, inputTokenId, targetAmount, promisedYieldBps)`

---

#### `startProcessing(bytes32 opportunityId)`

Transitions opportunity from FUNDED to DELIVERY/PROCESSING.

**Modifiers:** `onlyOperator(opportunityId)`

**Emits:** `ProcessingStarted(opportunityId)`, `DeliveryStarted(opportunityId, journeyId)`

---

#### `confirmProcessingComplete(bytes32 opportunityId, uint256 outputAmount, uint256 outputTokenId)`

Records completion of the processing step.

**Emits:** `ProcessingCompleted(opportunityId, outputAmount, outputTokenId)`

---

#### `recordSaleProceeds(bytes32 opportunityId, uint256 proceeds)`

Records revenue from selling the processed commodity.

**Emits:** `SaleProceedsRecorded(opportunityId, proceeds)`

---

#### `cancelOpportunity(bytes32 opportunityId, string reason)`

Cancels an opportunity and triggers stake refunds.

**Validates:** Must be OPEN or FUNDED status (not already processing).

**Emits:** `OpportunityCancelled(opportunityId, reason)`

---

### Staker Functions

#### `stakeToOpportunity(bytes32 opportunityId, uint256 amount)`

Stakes ERC-1155 tokens into an opportunity.

**Modifiers:** `nonReentrant`, `whenNotPaused`

**Validates:**

- Opportunity status == OPEN
- `block.timestamp < fundingDeadline`
- `totalStaked + amount <= targetAmount` (cannot overfund)

**Process:**

1. Transfers `amount` of `inputToken` (ERC-1155) from staker to Diamond
2. Records `stakerPositions[opportunityId][staker] += amount`
3. Increments `opportunity.totalStaked`
4. If `totalStaked == targetAmount`: status → FUNDED

**Emits:** `CommodityStaked(opportunityId, staker, amount, totalStaked)`
If funded: `OpportunityFunded(opportunityId, totalStaked)`

---

#### `unstakeFromOpportunity(bytes32 opportunityId, uint256 amount)`

Withdraws stake from an OPEN opportunity.

**Validates:** Opportunity must be OPEN (cannot unstake once funded).

**Emits:** `CommodityUnstaked(opportunityId, staker, amount)`

---

#### `claimProfit(bytes32 opportunityId)`

Claims principal + proportional profit share.

**Validates:**

- Opportunity status == DISTRIBUTING or SOLD
- Staker has unclaimed stake
- Not already claimed

**Calculation:**

```
userStake   = stakerPositions[opportunityId][staker]
totalStaked = opportunity.totalStaked
totalProfit = opportunity.saleProceeds - (totalStaked cost basis)
userProfit  = (userStake / totalStaked) * totalProfit
payout      = userStake (returned) + userProfit (yield)
              minus protocolFee (1% of profit)
```

**Emits:** `ProfitDistributed(opportunityId, staker, stakedAmount, profitShare)`

---

### View Functions

#### `getOpportunity(bytes32 opportunityId) → RWYOpportunity`

Returns full opportunity data.

#### `getStakerPosition(bytes32 opportunityId, address staker) → uint256`

Returns a staker's committed amount.

#### `getOpportunityCount() → uint256`

Total opportunities created.

#### `getAllOpportunities() → bytes32[]`

All opportunity IDs.

---

## Configuration (Owner-Only)

| Function                      | Parameter    | Default    |
| ----------------------------- | ------------ | ---------- |
| `setMinOperatorCollateralBps` | Basis points | 2000 (20%) |
| `setMaxYieldBps`              | Basis points | 5000 (50%) |
| `setProtocolFeeBps`           | Basis points | 100 (1%)   |
| `setDefaultProcessingDays`    | Days         | 30         |

**Emits:** `ConfigUpdated(param, oldValue, newValue)`

---

## Events

| Event                                                                                | When                          |
| ------------------------------------------------------------------------------------ | ----------------------------- |
| `OpportunityCreated(id, operator, inputToken, inputTokenId, targetAmount, yieldBps)` | Opportunity created           |
| `OpportunityFunded(id, totalStaked)`                                                 | Funding target reached        |
| `OpportunityCancelled(id, reason)`                                                   | Opportunity cancelled         |
| `CommodityStaked(opportunityId, staker, amount, totalStaked)`                        | Tokens staked                 |
| `CommodityUnstaked(opportunityId, staker, amount)`                                   | Tokens withdrawn              |
| `DeliveryStarted(opportunityId, journeyId)`                                          | Delivery to processor started |
| `DeliveryConfirmed(opportunityId, deliveredAmount)`                                  | Delivery confirmed            |
| `ProcessingStarted(opportunityId)`                                                   | Processing begun              |
| `ProcessingCompleted(opportunityId, outputAmount, outputTokenId)`                    | Processing done               |
| `SaleProceedsRecorded(opportunityId, proceeds)`                                      | Revenue recorded              |
| `ProfitDistributed(opportunityId, staker, stakedAmount, profitShare)`                | Profit claimed                |
| `ConfigUpdated(param, oldValue, newValue)`                                           | Config changed                |

---

## Errors

| Error                        | Condition                            |
| ---------------------------- | ------------------------------------ |
| `NotContractOwner()`         | Not the Diamond owner                |
| `NotApprovedOperator()`      | Not in `approvedOperators` mapping   |
| `NotOperator()`              | Caller not the opportunity's creator |
| `OpportunityNotFound()`      | Unknown opportunity ID               |
| `InvalidStatus()`            | Wrong lifecycle state for action     |
| `InvalidAmount()`            | Zero amount                          |
| `FundingDeadlinePassed()`    | Staking after deadline               |
| `ProcessingDeadlinePassed()` | Processing overdue                   |
| `ExceedsTarget()`            | Stake would exceed target            |
| `InsufficientStake()`        | Not enough staked                    |
| `AlreadyClaimed()`           | Profit already claimed               |
| `NoStake()`                  | No staking position                  |
| `CannotUnstake()`            | Opportunity no longer OPEN           |
| `ContractPaused()`           | Diamond is paused                    |

---

## Related Pages

- [[Core Concepts/RWY Staking]]
- [[Roles/Node Operator]]
- [[Roles/Customer]]
- [[Frontend/Pages Reference]]
