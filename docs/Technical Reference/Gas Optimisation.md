---
tags: [reference, gas, optimisation, performance, solidity]
---

# Gas Optimisation

[[🏠 Home]] > Technical Reference > Gas Optimisation

How Aurellion optimises gas usage across its smart contract architecture, and practical guidance for integrators to minimise transaction costs.

---

## PackedOrder: 70% Storage Reduction

The most impactful gas optimisation in the codebase is the `PackedOrder` struct used in CLOB V2.

### Before (V1 CLOBOrder): 10 storage slots

```solidity
struct CLOBOrder {
    address maker;          // slot 0 (partial)
    bytes32 marketId;       // slot 1
    uint256 price;          // slot 2
    uint256 amount;         // slot 3
    uint256 filledAmount;   // slot 4
    bool isBuy;             // slot 5 (1 byte, whole slot used)
    uint8 orderType;        // slot 6
    uint8 status;           // slot 7
    uint8 timeInForce;      // slot 8
    uint256 nonce;          // slot 9
    uint40 expiry;          // slot 10
    uint40 createdAt;       // slot 10 (packed with expiry)
}
// Total: ~10 SSTORE operations = ~200,000 gas just to store
```

### After (V2 PackedOrder): 3 storage slots

```solidity
struct PackedOrder {
    // Slot 1: maker(160) | isBuy(1) | orderType(2) | status(2) | TIF(3) | nonce(88)
    uint256 makerAndFlags;
    // Slot 2: price(96) | amount(96) | filledAmount(64)
    uint256 priceAmountFilled;
    // Slot 3: expiry(40) | createdAt(40) | marketIndex(32) | baseToken(160)
    uint256 expiryCreatedMarket;
}
// Total: 3 SSTORE operations = ~60,000 gas
// Saving: ~140,000 gas per order creation
```

**Constraint imposed:** Price and amount limited to `uint96` (~79 billion in 18-decimal tokens). More than sufficient for commodity markets.

---

## Red-Black Tree: O(log n) vs O(n) Order Book

The V1 order book iterated arrays to find best bid/ask — O(n) with gas cost proportional to order book depth.

V2 uses a **Red-Black Tree** per price level:

| Operation                 | V1 Array        | V2 Red-Black Tree |
| ------------------------- | --------------- | ----------------- |
| Find best price           | O(n)            | O(log n)          |
| Insert price level        | O(n)            | O(log n)          |
| Delete price level        | O(n)            | O(log n)          |
| Gas at 100 price levels   | ~50k extra gas  | ~5k extra gas     |
| Gas at 1,000 price levels | ~500k extra gas | ~15k extra gas    |

The tree stays balanced automatically — no degenerate worst-case.

---

## Library Splitting for Facet Size

Each facet must be under 24KB. Logic is extracted into libraries to keep facets lean:

| Facet             | Library          | What's Extracted                        |
| ----------------- | ---------------- | --------------------------------------- |
| CLOBCoreFacet     | CLOBLib          | Quote amount calculation, ID generation |
| OrderRouterFacet  | OrderBookLib     | Order book insertion/removal            |
| OrderRouterFacet  | OrderMatchingLib | Matching algorithm                      |
| OrderRouterFacet  | OrderUtilsLib    | Param validation, market creation       |
| CLOBMatchingFacet | OrderMatchingLib | Reused matching logic                   |

Libraries are `internal` — they're inlined at the call site, so there's no `DELEGATECALL` overhead.

---

## SafeERC20 vs Raw Transfer

BridgeFacet and AuSysFacet use OpenZeppelin's `SafeERC20.safeTransfer` instead of raw `transfer`:

```solidity
// Raw (fails silently on non-standard tokens)
IERC20(token).transfer(recipient, amount);

// SafeERC20 (reverts on failure, handles non-standard returns)
SafeERC20.safeTransfer(IERC20(token), recipient, amount);
```

The gas overhead of `SafeERC20` is minimal (~200 gas) and worth it for safety.

---

## Separate RWY Storage Slot

Rather than bloating `AppStorage` with RWY-specific fields, RWY data lives at its own storage slot:

```solidity
bytes32 constant RWY_STORAGE_POSITION = keccak256('rwy.app.storage');
```

**Why it saves gas:**

- Smaller `AppStorage` means cheaper `SLOAD` on the struct base slot
- RWY fields don't pollute the main struct's memory layout
- Future upgrades don't risk accidental slot collision

---

## Batch Operations

Where possible, use batch functions to reduce transaction overhead:

```typescript
// Instead of individual calls:
await diamond.addSupportedAsset(nodeHash, token1, id1, price1, cap1);
await diamond.addSupportedAsset(nodeHash, token2, id2, price2, cap2);

// Use batch:
await diamond.updateSupportedAssets(nodeHash, [
  { token: token1, tokenId: id1, price: price1, capacity: cap1 },
  { token: token2, tokenId: id2, price: price2, capacity: cap2 },
]);
// Saves ~21,000 base gas per skipped transaction
```

Similarly:

- `balanceOfBatch` over multiple `balanceOf` calls
- `safeBatchTransferFrom` over multiple `safeTransferFrom`

---

## Gas Cost Reference (Approximate, Base Sepolia)

| Operation                           | Approximate Gas | Notes                                |
| ----------------------------------- | --------------- | ------------------------------------ |
| `placeOrder()` (limit, GTC)         | ~150,000        | Includes escrow transfer             |
| `placeOrder()` with immediate match | ~200,000        | +50k for matching + settlement       |
| `cancelOrder()`                     | ~80,000         | Includes escrow refund               |
| `nodeMint()`                        | ~120,000        | Includes 3 SSTORE for PackedOrder    |
| `registerNode()`                    | ~100,000        | 5 storage writes                     |
| `createUnifiedOrder()`              | ~180,000        | Includes ERC-20 escrow               |
| `packageSign()`                     | ~40,000         | One SSTORE                           |
| `handOff()`                         | ~80,000         | Includes ERC-20 transfer             |
| `settleOrder()`                     | ~150,000        | Includes ERC-1155 + ERC-20 transfers |
| `stakeToOpportunity()`              | ~100,000        | Includes ERC-1155 transfer           |
| `claimProfit()`                     | ~90,000         | Includes ERC-20 transfer             |
| `commitOrder()`                     | ~50,000         | One SSTORE for commitment            |
| `revealOrder()`                     | ~200,000        | Same as placeOrder                   |
| `registerDriver()`                  | ~70,000         | One SSTORE for DriverInfo            |
| `confirmPickup()`                   | ~80,000         | Includes ECDSA verification          |

> Costs vary by network congestion, storage slot warmth, and whether prior approvals exist.

---

## Integrator Gas Tips

### 1. Pre-warm approvals

Approvals are cheaper the second time (warm storage). Do a one-time `approve(MAX_UINT256)`:

```typescript
await quoteToken.approve(DIAMOND_ADDRESS, ethers.MaxUint256);
// Subsequent orders skip the approval step
```

### 2. Use `placeNodeSellOrder` for node operators

It skips one ERC-1155 transfer (tokens come from node's internal inventory):

```typescript
// Cheaper than placeOrder for nodes:
await diamond.placeNodeSellOrder(
  nodeOwner,
  baseToken,
  tokenId,
  quoteToken,
  price,
  amount,
  0,
  0,
);
```

### 3. GTC over GTD for gas savings

GTD orders store an expiry timestamp (extra bits in PackedOrder slot 3). GTC orders leave this field zero — slightly cheaper to write.

### 4. Batch balance checks

```typescript
// One call vs N calls
const balances = await diamond.balanceOfBatch(
  addresses, // [addr1, addr1, addr2, addr2]
  tokenIds, // [tokenId1, tokenId2, tokenId1, tokenId2]
);
```

### 5. Read from Ponder, not RPC

Ponder queries are free (no gas). Use the indexer for all historical and aggregate reads. Only call `diamond.view*()` for real-time data (best bid/ask, current status).

---

## Base L2 Gas Context

Aurellion runs on **Base** (Optimism-based L2). Key gas characteristics:

- L2 execution gas: same as Ethereum, but ~100x cheaper (typically 0.001-0.01 Gwei)
- L1 data posting cost: paid automatically, ~5-50% of total transaction cost
- Base block time: ~2 seconds — 30 blocks/minute. MAX_REVEAL_DELAY (50 blocks) ≈ 100 seconds.
- `minRevealDelay = 2 blocks` ≈ 4 seconds

---

## Related Pages

- [[Smart Contracts/Libraries/DiamondStorage]]
- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Architecture/Diamond Proxy Pattern]]
- [[Technical Reference/Developer Quickstart]]
