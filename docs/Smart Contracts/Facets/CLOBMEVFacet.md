---
tags: [smart-contracts, facets, clob, mev, commit-reveal]
---

# CLOBMEVFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > CLOBMEVFacet

`CLOBMEVFacet.sol` implements **MEV (Maximal Extractable Value) protection** for large CLOB orders via a commit-reveal scheme. Large orders must be committed in one transaction and revealed in a later block, preventing front-running bots from seeing and exploiting the order before it executes.

---

## Overview

| Property | Value                                                                                     |
| -------- | ----------------------------------------------------------------------------------------- |
| File     | `contracts/diamond/facets/CLOBMEVFacet.sol`                                               |
| Inherits | `ReentrancyGuard`                                                                         |
| Trigger  | Orders with `quoteAmount >= commitmentThreshold` (default 10,000e18)                      |
| Timing   | Min `minRevealDelay` blocks between commit and reveal; max `MAX_REVEAL_DELAY = 50` blocks |

---

## Why Commit-Reveal?

Without MEV protection, a large buy order of 100,000 USDC is visible in the mempool before inclusion. A bot can:

1. See the large buy order
2. Front-run it with their own buy
3. Sell back at a higher price immediately after the large order fills

The commit-reveal scheme hides the order parameters until it's too late to front-run:

```
Block N:   Trader commits hash(salt + orderParams)
           → Bot sees commitment hash but NOT order direction/price/amount

Block N+2: Trader reveals actual orderParams
           → By the time bots react, the order is already executing
```

---

## The CommittedOrder Struct

```solidity
struct CommittedOrder {
    address committer;      // Who made the commitment
    bytes32 commitment;     // keccak256(salt, orderParams)
    uint256 commitBlock;    // Block when committed
    bool revealed;          // Has this been revealed?
}
```

---

## Functions

### `commitOrder(bytes32 commitment)`

Phase 1: Record a commitment to place an order.

**Parameters:**

- `commitment` = `keccak256(abi.encode(salt, baseToken, baseTokenId, quoteToken, price, amount, isBuy, timeInForce, expiry))`

**Process:**

1. Stores `committedOrders[commitment] = CommittedOrder(msg.sender, commitment, block.number, false)`
2. Emits `OrderCommitted(commitment, msg.sender, block.number)`

**Can be called anytime** — no minimum wait. The wait constraint is on the reveal side.

**Modifiers:** `whenNotPaused`

---

### `revealOrder(bytes32 salt, address baseToken, uint256 baseTokenId, address quoteToken, uint96 price, uint96 amount, bool isBuy, uint8 timeInForce, uint40 expiry) → bytes32 orderId`

Phase 2: Reveal the order parameters and execute.

**Modifiers:** `nonReentrant`, `whenNotPaused`

**Validates:**

1. Recomputes `commitment = keccak256(salt, params)` and finds it in storage
2. `committer == msg.sender`
3. `block.number >= commitBlock + minRevealDelay` → `RevealTooEarly`
4. `block.number <= commitBlock + MAX_REVEAL_DELAY` → `RevealTooLate`
5. `!revealed` → `CommitmentAlreadyRevealed`

**Process:**

1. Marks commitment as revealed
2. Creates `PackedOrder` (identical flow to `CLOBCoreFacet.placeLimitOrder`)
3. Escrows tokens
4. Attempts matching via `CLOBMatchingFacet`
5. Returns `orderId`

**Emits:** `OrderRevealed(commitment, orderId, maker)`, `OrderCreated(orderId, ...)`

---

## Timing Constraints

```
Block N   ─── commitOrder() called
              commitment stored

Block N+1 ─── Too early (block.number < N + minRevealDelay)
Block N+2 ─── ✅ Can reveal (if minRevealDelay = 2)
    ...
Block N+51 ── ❌ Too late (block.number > N + MAX_REVEAL_DELAY=50, ~100s on Base)
              Commitment expired. Must commit again.
```

| Parameter          | Default            | Configured By                        |
| ------------------ | ------------------ | ------------------------------------ |
| `minRevealDelay`   | 2 blocks (~4s)     | `CLOBAdminFacet.setMinRevealDelay()` |
| `MAX_REVEAL_DELAY` | 50 blocks (~10min) | Hardcoded constant                   |

---

## Events

| Event            | Parameters                             | When                 |
| ---------------- | -------------------------------------- | -------------------- |
| `OrderCommitted` | `commitmentId, committer, commitBlock` | Phase 1 complete     |
| `OrderRevealed`  | `commitmentId, orderId, maker`         | Phase 2 complete     |
| `OrderCreated`   | Full order params                      | Order placed in book |

---

## Errors

| Error                                | Condition                                       |
| ------------------------------------ | ----------------------------------------------- |
| `CommitmentNotFound()`               | Commitment hash not in storage                  |
| `CommitmentAlreadyRevealed()`        | Already revealed this commitment                |
| `RevealTooEarly()`                   | `block.number < commitBlock + minRevealDelay`   |
| `RevealTooLate()`                    | `block.number > commitBlock + MAX_REVEAL_DELAY` |
| `InvalidCommitment()`                | Recomputed hash doesn't match stored hash       |
| `NotOrderMaker()`                    | Revealer is not the committer                   |
| `MarketPaused()`                     | Circuit breaker active                          |
| `InvalidPrice()` / `InvalidAmount()` | Zero values                                     |
| `OrderExpiredError()`                | GTD expiry already passed                       |

---

## Frontend Integration

```typescript
import { ethers } from 'ethers';

async function placeLargeOrder(diamond: any, params: OrderParams) {
  const salt = ethers.randomBytes(32);

  // Compute commitment
  const commitment = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      [
        'bytes32',
        'address',
        'uint256',
        'address',
        'uint96',
        'uint96',
        'bool',
        'uint8',
        'uint40',
      ],
      [
        salt,
        params.baseToken,
        params.baseTokenId,
        params.quoteToken,
        params.price,
        params.amount,
        params.isBuy,
        params.timeInForce,
        params.expiry,
      ],
    ),
  );

  // Phase 1: Commit
  const commitTx = await diamond.commitOrder(commitment);
  const commitReceipt = await commitTx.wait();
  const commitBlock = commitReceipt.blockNumber;

  console.log(
    `Committed at block ${commitBlock}. Reveal after block ${commitBlock + 2}`,
  );

  // Wait for minRevealDelay blocks
  await waitForBlock(commitBlock + 2);

  // Phase 2: Reveal + execute
  const revealTx = await diamond.revealOrder(
    salt,
    params.baseToken,
    params.baseTokenId,
    params.quoteToken,
    params.price,
    params.amount,
    params.isBuy,
    params.timeInForce,
    params.expiry,
  );
  const revealReceipt = await revealTx.wait();
  return revealReceipt;
}
```

---

## Security Considerations

- **Salt must be random and secret** — if the salt is predictable, an attacker can brute-force the commitment pre-image
- **Commitment is public** — the hash is visible on-chain; only the actual params are hidden
- **MAX_REVEAL_DELAY prevents griefing** — if a trader commits and never reveals, the commitment slot expires (but escrowed tokens are not yet committed at commit time, so no funds are locked during the dark period)
- **Tokens are only escrowed at reveal** — the commit phase has no token transfers; only the reveal executes the actual escrow and order placement

---

## Related Pages

- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Smart Contracts/Facets/OrderRouterFacet]]
- [[Core Concepts/CLOB Trading]]
- [[Technical Reference/Security Model]]
