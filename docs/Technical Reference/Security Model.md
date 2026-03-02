---
tags: [reference, security, auditing, rbac]
---

# Security Model

[[🏠 Home]] > Technical Reference > Security Model

A comprehensive breakdown of Aurellion's on-chain security architecture — access control, fund safety, reentrancy guards, MEV protection, and known risks.

---

## Threat Model

Aurellion must defend against:

| Threat                           | Where                                     | Mitigation                                                           |
| -------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Unauthorised minting             | AssetsFacet                               | `validNode` modifier — only verified node operators                  |
| Reentrancy attacks               | BridgeFacet, AuSysFacet, OrderRouterFacet | `ReentrancyGuard` on all state-changing functions                    |
| Double-spend / double-settlement | BridgeFacet                               | `journeyRewardPaid` flag + status checks                             |
| MEV front-running                | CLOB matching                             | Commit-reveal scheme for large orders                                |
| Flash loan manipulation          | CLOB circuit breaker                      | Price-change threshold trips market pause                            |
| Fake driver/dispatcher           | AuSysFacet                                | `DRIVER_ROLE` and `DISPATCHER_ROLE` required                         |
| Node impersonation               | NodesFacet, AssetsFacet                   | `validNode` flag gated by admin                                      |
| Capacity overselling             | NodesFacet                                | Atomic `reduceCapacityForOrder` with revert on insufficient capacity |
| Custody theft                    | AssetsFacet                               | `CannotRedeemOwnCustody` — custodian cannot self-redeem              |
| Storage collision (upgrades)     | DiamondStorage                            | Fixed storage slot + append-only struct                              |
| Facet upgrade abuse              | DiamondCutFacet                           | `onlyOwner` guard on `diamondCut`                                    |
| Operator rug (RWY)               | RWYStakingFacet                           | Collateral requirement (20%) + cancel mechanism                      |

---

## Access Control Layers

### Layer 1: Diamond Ownership

```
LibDiamond.enforceIsContractOwner()
```

The Diamond owner (deployer multisig on mainnet) controls:

- Adding/replacing/removing facets (`diamondCut`)
- Setting fee recipients
- Setting system parameters
- Approving operators
- Emergency pause

### Layer 2: RBAC Roles

Stored in `ausysRoles[role][address]` in AppStorage:

| Role              | Keccak                         | Who Holds It        | Capabilities                                              |
| ----------------- | ------------------------------ | ------------------- | --------------------------------------------------------- |
| `ADMIN_ROLE`      | `keccak256("ADMIN_ROLE")`      | Aurellion ops team  | Grant/revoke driver/dispatcher roles, manage AuSys config |
| `DRIVER_ROLE`     | `keccak256("DRIVER_ROLE")`     | Verified couriers   | Accept journeys, sign packages, complete deliveries       |
| `DISPATCHER_ROLE` | `keccak256("DISPATCHER_ROLE")` | Platform dispatcher | Assign drivers to journeys                                |

### Layer 3: Node Validation

```solidity
modifier validNode(address node) {
    bytes32[] storage ownerNodes = s.ownerNodes[node];
    bool hasActiveNode = false;
    for (uint256 i = 0; i < ownerNodes.length; i++) {
        if (s.nodes[ownerNodes[i]].active && s.nodes[ownerNodes[i]].validNode) {
            hasActiveNode = true; break;
        }
    }
    if (!hasActiveNode) revert InvalidNode();
    _;
}
```

Minting requires a verified node — admin must explicitly set `validNode=true` after off-chain verification.

### Layer 4: Participant Checks

AuSysFacet validates the caller is a party to the relevant order or journey before allowing action:

```solidity
if (msg.sender != journey.sender && msg.sender != journey.driver && msg.sender != journey.receiver)
    revert NotJourneyParticipant();
```

---

## Reentrancy Protection

| Facet               | Guard                            | Scope                                                    |
| ------------------- | -------------------------------- | -------------------------------------------------------- |
| `BridgeFacet`       | `ReentrancyGuard` (OpenZeppelin) | `createUnifiedOrder`, `settleOrder`, `cancelBridgeOrder` |
| `AuSysFacet`        | `ReentrancyGuard`                | `createOrder`, `handOff`, `settleOrder`                  |
| `OrderRouterFacet`  | `ReentrancyGuard`                | `placeOrder`, `placeMarketOrder`, `cancelOrder`          |
| `CLOBCoreFacet`     | `ReentrancyGuard`                | `placeLimitOrder`, `cancelOrder`                         |
| `CLOBMatchingFacet` | `ReentrancyGuard`                | `matchOrder`, `executeMatch`                             |
| `RWYStakingFacet`   | Custom reentrancy (RWYStorage)   | `stakeToOpportunity`, `claimProfit`                      |

All ERC-20 and ERC-1155 transfers use OpenZeppelin's `SafeERC20.safeTransfer` and the ERC-1155 callback pattern to handle malicious receiver contracts safely.

---

## Fund Safety

### Escrow Invariants

At any point, the Diamond's ERC-20 balance must be ≥ sum of all escrowed amounts:

```
diamond.quoteToken.balanceOf(diamond) ≥
  Σ unifiedOrder.escrowedAmount for all PENDING/MATCHED/IN_LOGISTICS orders
```

This is not enforced on-chain with an explicit invariant check — it is maintained by construction:

- `createUnifiedOrder` pulls `totalEscrow` in before creating the record
- `settleOrder` and `cancelBridgeOrder` are the only functions that release escrow
- Both are guarded by status checks preventing double-execution

### Settlement Checks

```solidity
// settleOrder validates:
require(order.status == UNIFIED_IN_LOGISTICS, "Wrong status");
// After settlement:
order.status = UNIFIED_SETTLED;
// Any second call reverts on the status check
```

### Journey Reward Guard

```solidity
require(!journeyRewardPaid[journeyId], "RewardAlreadyPaid");
journeyRewardPaid[journeyId] = true;
// Then transfer bounty — check-effect-interact pattern
IERC20(payToken).safeTransfer(driver, bounty);
```

---

## MEV Protection

### Commit-Reveal Scheme

Orders above `commitmentThreshold` (default: 10,000e18 quote tokens) must use two-phase placement:

**Phase 1 — Commit (public)**

```solidity
bytes32 commitment = keccak256(abi.encode(salt, orderParams));
CLOBMEVFacet.commitOrder(commitment);
// Stored: committedOrders[commitment] = { committer, blockNumber }
```

**Phase 2 — Reveal (after minRevealDelay blocks)**

```solidity
CLOBMEVFacet.revealOrder(salt, orderParams);
// Validates: keccak256(salt, orderParams) == commitment
// Validates: block.number >= commitBlock + minRevealDelay
// Executes the order
```

This prevents front-running: bots see the commitment but can't know the order direction/price until it's too late.

### Rate Limiting

Per-address per-block limits:

- `maxOrdersPerBlock = 100` — prevents spam attacks
- `maxVolumePerBlock = 1,000,000e18` — caps single-block volume

### Circuit Breakers

Each market has a `CircuitBreaker` that monitors price velocity:

```
if |fillPrice - lastPrice| / lastPrice > priceChangeThreshold:
    market.paused = true
    market.pausedUntilBlock = block.number + cooldownPeriod
```

Emits `CircuitBreakerTripped` and reverts the triggering transaction.

---

## Upgrade Safety

### Storage Append-Only Rule

`AppStorage` must only ever be **appended to**. Never:

- Reorder fields
- Remove fields (use tombstone booleans)
- Change field types

Violation would corrupt storage for all existing data.

### Facet Replacement

Replacing a facet (logic upgrade) is safe as long as the new implementation reads/writes storage identically. New storage fields can be appended to `AppStorage` alongside the new facet.

### Initialisation

Facets that require initialisation use `Initializable` from OpenZeppelin:

```solidity
function initialize() public initializer {}
```

This prevents double-initialisation which could reset state.

---

## Known Risks & Mitigations

| Risk                                      | Severity | Mitigation Status                                                                      |
| ----------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| Admin key compromise                      | Critical | Planned: multisig ownership on mainnet                                                 |
| Oracle-free price discovery               | Medium   | CLOB is self-pricing — no oracle dependency or manipulation vector                     |
| Large order sandwich attacks              | Medium   | Commit-reveal for orders > threshold                                                   |
| Node operator minting inflation           | Low      | Admin must validate each node; classes controlled by owner                             |
| Gas limit on large node arrays            | Low      | `MAX_NODES_PER_ORDER = 20`, `MAX_JOURNEYS_PER_ORDER = 10`                              |
| Timestamp manipulation                    | Low      | ETAs are non-binding hints; status transitions don't depend on timestamps for finality |
| ERC-1155 callback reentrancy              | Low      | ReentrancyGuard on all external-call functions                                         |
| Custody griefing (sender refuses to sign) | Low      | Admin can override journey status; order can be cancelled with refund                  |

---

## Audit Recommendations

Before mainnet launch, the following facets require independent security audit:

1. **BridgeFacet** — handles escrow of user funds
2. **CLOBMatchingFacet** — complex matching logic with token transfers
3. **AuSysFacet** — custody signature system and settlement
4. **RWYStakingFacet** — staking and profit distribution
5. **DiamondStorage** — storage layout correctness across all facets

---

## Related Pages

- [[Architecture/Diamond Proxy Pattern]]
- [[Smart Contracts/Facets/BridgeFacet]]
- [[Smart Contracts/Facets/AuSysFacet]]
- [[Technical Reference/Error Reference]]
