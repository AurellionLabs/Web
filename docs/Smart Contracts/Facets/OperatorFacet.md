---
tags: [smart-contracts, facets, operator, reputation]
---

# OperatorFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > OperatorFacet

`OperatorFacet.sol` manages **approved operators** — entities authorised to create RWY staking opportunities and participate as processing intermediaries in the Aurellion network.

---

## Overview

| Property    | Value                                                            |
| ----------- | ---------------------------------------------------------------- |
| File        | `contracts/diamond/facets/OperatorFacet.sol`                     |
| Storage     | [[Smart Contracts/Libraries/DiamondStorage]] — Operators section |
| Key mapping | `approvedOperators[address] → bool`                              |

---

## What is an Operator?

An **Operator** is an entity with special permissions beyond a standard node operator:

- Can create RWY staking opportunities (`RWYStakingFacet.createOpportunity`)
- Represents a processing facility (grain mill, abattoir, refinery)
- Must maintain reputation score and collateral
- Subject to additional vetting by Aurellion admin

---

## Functions

### `approveOperator(address operator)`

Owner-only. Grants operator status.

```solidity
approvedOperators[operator] = true;
emit OperatorApproved(operator);
```

### `revokeOperator(address operator)`

Owner-only. Removes operator status. Active opportunities created by the operator are not automatically cancelled.

```solidity
approvedOperators[operator] = false;
emit OperatorRevoked(operator);
```

### `isApprovedOperator(address operator) → bool`

Returns whether an address is an approved operator.

### `setOperatorReputation(address operator, uint256 score)`

Owner-only. Sets a reputation score (0-10000) for an operator. Used for display and potential future collateral requirements.

```solidity
operatorReputation[operator] = score;
```

### `recordOperatorSuccess(address operator)`

Records a successful operation completion. Increments `operatorSuccessfulOps[operator]` and `operatorTotalValueProcessed[operator]`.

Called internally by `RWYStakingFacet` when an opportunity completes successfully.

### `getOperatorStats(address operator) → (uint256 reputation, uint256 successfulOps, uint256 totalValueProcessed)`

Returns operator performance statistics.

---

## Operator Data (AppStorage)

```solidity
mapping(address => bool) approvedOperators;
mapping(address => uint256) operatorReputation;           // 0-10000
mapping(address => uint256) operatorSuccessfulOps;        // count
mapping(address => uint256) operatorTotalValueProcessed;  // cumulative value
```

---

## Events

| Event                                                        | When             |
| ------------------------------------------------------------ | ---------------- |
| `OperatorApproved(address operator)`                         | Operator granted |
| `OperatorRevoked(address operator)`                          | Operator revoked |
| `OperatorReputationUpdated(address operator, uint256 score)` | Score changed    |

---

## Operator Onboarding Flow

```
1. Entity applies to Aurellion (off-chain: company docs, processing facility, licences)
2. Aurellion admin verifies legitimacy
3. Admin calls: OperatorFacet.approveOperator(entityAddress)
4. Operator now has approvedOperators[entityAddress] = true
5. Operator can call: RWYStakingFacet.createOpportunity(...)
6. After successful opportunities: operatorReputation increases
```

---

## Related Pages

- [[Smart Contracts/Facets/RWYStakingFacet]]
- [[Core Concepts/RWY Staking]]
- [[Roles/Node Operator]]
