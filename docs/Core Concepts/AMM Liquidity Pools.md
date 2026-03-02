---
tags: [concepts, amm, pools, liquidity, defi]
---

# AMM Liquidity Pools

[[🏠 Home]] > Core Concepts > AMM Liquidity Pools

Aurellion operates a hybrid market structure: a **Central Limit Order Book (CLOB)** for price discovery and **Automated Market Maker (AMM) pools** for passive liquidity. Pools ensure there's always a price available for any token pair, even when the order book is thin.

---

## Why Pools Alongside a CLOB?

| Feature            | CLOB                            | AMM Pool                                   |
| ------------------ | ------------------------------- | ------------------------------------------ |
| Price discovery    | ✅ Precise                      | ❌ Approximate (constant product)          |
| Capital efficiency | ✅ High (only at desired price) | ❌ Lower (spread across all prices)        |
| Always available   | ❌ Needs counterpart orders     | ✅ Always liquid                           |
| Good for           | Active traders, large orders    | Small trades, thin markets, passive income |

In practice: active markets use the CLOB for execution; new or illiquid markets rely on the pool as a price floor.

---

## Constant Product Formula

Aurellion's pools use the same `x × y = k` formula as Uniswap v2:

```
baseReserve × quoteReserve = k (constant)

To buy Δbase tokens:
  Δquote = (k / (baseReserve - Δbase)) - quoteReserve
         = quoteReserve × Δbase / (baseReserve - Δbase)
         + slippage
```

Price impact increases with trade size relative to pool reserves. This creates a natural slippage mechanism that protects the pool from being drained.

---

## Pool Mechanics

### Creating a Pool

```
CLOBFacet.createPool(baseToken, baseTokenId, quoteToken)
→ poolId = keccak256(baseToken, baseTokenId, quoteToken)
→ Emits: PoolCreated(poolId, baseToken, baseTokenId, quoteToken)
```

Anyone can create a pool for any token pair. The pool starts empty — liquidity must be added separately.

### Adding Liquidity

```
diamond.addLiquidity(poolId, baseAmount, quoteAmount)
```

**Requirements:**

- Caller approves both ERC-1155 (`setApprovalForAll`) and ERC-20 (`approve`) transfers
- Amounts must maintain the current price ratio (if pool is non-empty)

**Receives:** LP tokens minted proportional to share of pool:

```
lpTokensMinted = totalLPSupply × min(baseAmount/baseReserve, quoteAmount/quoteReserve)
```

**Emits:** `LiquidityAdded(poolId, provider, baseAmount, quoteAmount, lpTokensMinted)`

### Removing Liquidity

```
diamond.removeLiquidity(poolId, lpAmount)
```

Burns `lpAmount` LP tokens and returns proportional share of both reserves:

```
baseOut = baseReserve × lpAmount / totalLPSupply
quoteOut = quoteReserve × lpAmount / totalLPSupply
```

**Emits:** `LiquidityRemoved(poolId, provider, baseAmount, quoteAmount, lpTokensBurned)`

### Claiming Fees

Trading fees accumulate in the pool. LP token holders claim their share:

```
diamond.claimFees(poolId)
→ feeShare = accumulatedFees × (userLPBalance / totalLPSupply)
→ Emits: FeesCollected(tradeId, takerFeeAmount, makerFeeAmount, lpFeeAmount)
```

LP fee rate: **5 basis points (0.05%)** per trade routed through the pool.

---

## Pool State

```typescript
struct LiquidityPool {
    string baseToken;      // ERC-1155 contract (as string for legacy V1)
    uint256 baseTokenId;   // Token ID
    string quoteToken;     // ERC-20 contract (as string for legacy V1)
    uint256 baseReserve;   // Current base token reserve
    uint256 quoteReserve;  // Current quote token reserve
    uint256 totalLPSupply; // Outstanding LP token supply
    bool active;
    uint256 createdAt;
}
```

---

## Reading Pool Data

### Via Contract

```typescript
const pool = await diamond.getPool(poolId);
console.log('Base reserve:', pool.baseReserve.toString());
console.log('Quote reserve:', pool.quoteReserve.toString());
console.log(
  'Price:',
  ((pool.quoteReserve * BigInt(1e18)) / pool.baseReserve).toString(),
);
```

### Via Indexer

```graphql
query GetPools {
  poolCreatedEventss {
    items {
      poolId
      baseToken
      baseTokenId
      quoteToken
      block_timestamp
    }
  }
}

query GetPoolActivity($poolId: String!) {
  liquidityAddedEventss(where: { poolId: $poolId }) {
    items {
      provider
      baseAmount
      quoteAmount
      lpTokensMinted
      block_timestamp
    }
  }
}
```

---

## Frontend Pages

| Route                                | Description                                 |
| ------------------------------------ | ------------------------------------------- |
| `/customer/pools`                    | Browse all pools with TVL and estimated APR |
| `/customer/pools/[id]`               | Pool detail: reserves, your position, chart |
| `/customer/pools/[id]/add-liquidity` | Add liquidity form                          |
| `/customer/pools/create-pool`        | Create a new pool                           |

---

## Impermanent Loss

LP providers are exposed to impermanent loss when the price ratio of the pool diverges from when they entered:

```
If you add: 100 AURA + 10 goat tokens (ratio: 10 AURA/goat)
Later price moves to: 20 AURA/goat

Your pool share is now worth less than holding outright.
Loss = holding value - pool value
     = (hold 100 AURA + 10 goats) - (pool share value)
```

LP fees compensate for impermanent loss over time in active pools. For low-volatility commodity markets, impermanent loss risk is lower than typical DeFi pools.

---

## Related Pages

- [[Core Concepts/CLOB Trading]]
- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Roles/Customer]]
- [[Frontend/Pages Reference]]
