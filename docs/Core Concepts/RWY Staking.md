---
tags: [concepts, rwy, staking, yield, commodities]
---

# Real World Yield (RWY) Staking

[[🏠 Home]] > Core Concepts > RWY Staking

**Real World Yield (RWY)** is Aurellion's mechanism for generating on-chain yield from real-world commodity processing. Users stake physical-asset tokens into processing opportunities and receive their principal back plus a share of the profits when the goods are sold.

---

## The Core Concept

Traditional DeFi yield comes from protocol fees, token inflation, or lending. RWY yield comes from **real economic activity**:

```
10 farmers each stake 100kg of wheat tokens
→ Total: 1,000kg wheat in the Diamond
→ Grain processor collects, mills, sells flour
→ Flour sold for 15% more than raw wheat value
→ 15% profit distributed proportionally to stakers
```

The yield is backed by physical transformation — wheat into flour, livestock into meat products, raw gemstones into cut stones. This creates genuine, inflation-resistant returns.

---

## Roles in RWY

| Role         | Description                                                          |
| ------------ | -------------------------------------------------------------------- |
| **Operator** | Approved entity (processor, manufacturer) that creates opportunities |
| **Staker**   | Node operator or user who commits asset tokens                       |
| **Protocol** | Takes 1% of profits as protocol fee                                  |

Operators must be approved by the contract owner (`approvedOperators[address] = true`). They post collateral (minimum 20% of opportunity value) to demonstrate commitment.

---

## Opportunity Parameters

When an operator creates an opportunity:

| Parameter            | Description                       | Constraints                   |
| -------------------- | --------------------------------- | ----------------------------- |
| `name`               | Human-readable label              | —                             |
| `description`        | What will be done with the assets | —                             |
| `inputToken`         | ERC-1155 token address            | Must be valid Aurellion asset |
| `inputTokenId`       | Token ID of the commodity         | —                             |
| `targetAmount`       | Total tokens needed               | Must be > 0                   |
| `promisedYieldBps`   | Expected return in bps            | Max 5000 (50%)                |
| `fundingDeadline`    | When staking window closes        | Future timestamp              |
| `processingDeadline` | When processing must complete     | After fundingDeadline         |

---

## Full Lifecycle Example

**Scenario:** A grain processor wants to mill 1,000kg of wheat into flour.

```
Day 0: Operator creates opportunity
  createOpportunity("Wheat → Flour Q1 2026", "WHEAT", tokenId=1,
                    targetAmount=1000, promisedYieldBps=1500, ...)
  → Status: OPEN
  → OpportunityCreated event

Days 1-7: Staking period
  Staker A: stakeToOpportunity(id, 200)  → 200 wheat tokens transferred
  Staker B: stakeToOpportunity(id, 500)  → 500 wheat tokens transferred
  Staker C: stakeToOpportunity(id, 300)  → 300 wheat tokens transferred
  → totalStaked = 1,000 (target reached)
  → Status: FUNDED
  → OpportunityFunded event

Day 8: Operator triggers processing
  startProcessing(id)
  → Journey created to deliver wheat to mill
  → Status: DELIVERY → PROCESSING

Day 30: Processing complete
  confirmProcessingComplete(id, outputAmount=950kg_flour, outputTokenId=2)
  → 950kg flour tokens minted to operator
  → Status: PROCESSED

Day 35: Flour sold
  recordSaleProceeds(id, proceeds=13,000_USDC)
  → Original wheat value: 10,000 USDC (1000kg × 10 USDC/kg)
  → Profit: 3,000 USDC
  → Yield: 30% (vs. promised 15% — stakers got more)
  → Status: SOLD → DISTRIBUTING

Days 36+: Stakers claim
  Staker A: claimProfit(id)
    → stakedAmount = 200, proportion = 20%
    → principal = 200 wheat tokens back
    → profit share = 20% × 3,000 × (1 - 1% protocol) = 594 USDC
    → ProfitDistributed(id, stakerA, 200, 594)

  Staker B: claimProfit(id) → 1485 USDC
  Staker C: claimProfit(id) → 891 USDC
  Protocol receives: 30 USDC (1% of 3,000)
```

---

## Profit Calculation Detail

```
userStake         = 200 tokens
totalStaked       = 1,000 tokens
proportion        = 200 / 1,000 = 20%

totalProceeds     = 13,000 USDC
costBasis         = 10,000 USDC (what the wheat was worth)
totalProfit       = 3,000 USDC

protocolFee       = 3,000 × 1% = 30 USDC
distributableProfit = 2,970 USDC

userProfitShare   = 2,970 × 20% = 594 USDC
userPayout        = 594 USDC (yield) + 200 wheat tokens (principal)
```

---

## Staking Rules

| Rule                     | Details                                             |
| ------------------------ | --------------------------------------------------- |
| Only during OPEN         | Cannot stake after `fundingDeadline` or when FUNDED |
| Cannot overfund          | `totalStaked + amount <= targetAmount`              |
| Can unstake if OPEN      | `unstakeFromOpportunity()` available before FUNDED  |
| Cannot unstake if FUNDED | Committed once processing begins                    |
| Claim only once          | `AlreadyClaimed()` error on second attempt          |

---

## Risk Model

| Risk                       | Mitigation                                                   |
| -------------------------- | ------------------------------------------------------------ |
| Operator disappears        | Operator collateral (20%) slashed                            |
| Processing fails           | Cancel mechanism; stakes refunded                            |
| Market price drops         | Yield is proportional to actual proceeds — can be < promised |
| Processing deadline missed | Owner can cancel opportunity                                 |

If an opportunity is cancelled at any stage before PROCESSING completes, stakers receive their tokens back in full.

---

## Operator Collateral

Operators must hold collateral to create opportunities:

```
minOperatorCollateralBps = 2000 (20% of opportunity value)

For a 10,000 USDC opportunity:
  Required collateral = 2,000 USDC
  Operator must have this in their account or staked in OperatorFacet
```

Collateral is locked for the duration of the opportunity and released upon successful completion or slashed upon misconduct.

---

## Integration with AuSys Logistics

When an opportunity moves to DELIVERY status, it creates a logistics journey via `AuSysFacet`:

```
startProcessing(opportunityId)
  → createJourney(...) with nodes = [operatorFacility]
  → Journey tracks physical transport to processing facility
  → DeliveryStarted(opportunityId, journeyId)
```

This means the same journey mechanics (driver assignment, signatures, handoff) apply to RWY deliveries.

---

## UI Entry Points

| Action                    | Route                     |
| ------------------------- | ------------------------- |
| Browse opportunities      | `/customer/rwy`           |
| View single opportunity   | `/customer/rwy/[id]`      |
| My stakes                 | `/customer/rwy/my-stakes` |
| Create opportunity (node) | `/node/rwy/create`        |
| Manage opportunity (node) | `/node/rwy`               |

---

## Related Pages

- [[Smart Contracts/Facets/RWYStakingFacet]]
- [[Core Concepts/Node Network]]
- [[Roles/Node Operator]]
- [[Roles/Customer]]
