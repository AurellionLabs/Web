---
tags: [reference, troubleshooting, debugging, errors]
---

# Troubleshooting

[[🏠 Home]] > Technical Reference > Troubleshooting

Common issues encountered when building with or using Aurellion, with step-by-step solutions.

---

## Transaction Reverts

### `InvalidNode()` — Cannot Mint Tokens

**Symptom:** `nodeMint()` reverts with `InvalidNode`.

**Causes & Fixes:**

1. **Node not registered** → Call `NodesFacet.registerNode()` first
2. **Node not validated** → Admin must call `NodesFacet.validateNode(nodeHash)` — this is an off-chain process; contact Aurellion team
3. **Node deactivated** → Check `diamond.getNode(nodeHash).active` — may need reactivation
4. **Wrong address** → The `validNode` check iterates `ownerNodes[msg.sender]` — make sure you're calling from the node owner's address

```typescript
// Debug: check all nodes for an address
const nodeHashes = await diamond.getOwnerNodes(yourAddress);
for (const hash of nodeHashes) {
  const node = await diamond.getNode(hash);
  console.log(hash, { active: node.active, validNode: node.validNode });
}
```

---

### `OrderRequiresCommitReveal()` — Order Too Large

**Symptom:** `placeOrder()` reverts when placing a large order.

**Cause:** Order's quote amount ≥ `commitmentThreshold` (default 10,000e18).

**Fix:** Use the two-phase commit-reveal flow via `CLOBMEVFacet`.

```typescript
// Check if your order requires commit-reveal
const commitmentThreshold =
  (await diamond.getCommitmentThreshold?.()) ?? ethers.parseUnits('10000', 18);
const orderQuoteAmount = (price * amount) / BigInt(1e18);

if (orderQuoteAmount >= commitmentThreshold) {
  // Use commitOrder() + revealOrder() instead
}
```

See [[Smart Contracts/Facets/CLOBMEVFacet]] for the full flow.

---

### `RateLimitExceeded()` — Too Many Orders Per Block

**Symptom:** Orders succeed then suddenly revert with `RateLimitExceeded`.

**Cause:** Placing more than `maxOrdersPerBlock` (default 100) orders from the same address in one block.

**Fix:** Space orders across multiple blocks, or batch them differently.

---

### `ERC1155MissingApprovalForAll` — Approval Not Set

**Symptom:** Sell order reverts on ERC-1155 transfer.

**Fix:**

```typescript
const auraAsset = new ethers.Contract(AURA_ASSET_ADDRESS, ERC1155_ABI, signer);
await auraAsset.setApprovalForAll(DIAMOND_ADDRESS, true);
// Wait for confirmation before placing sell order
```

---

### `InsufficientNodeBalance()` — Node Inventory Empty

**Symptom:** `placeNodeSellOrder()` reverts.

**Cause:** `nodeTokenBalances[nodeHash][tokenId]` is zero or less than the order amount.

**Fix:** Deposit tokens into the node's internal inventory first:

```typescript
// Approve ERC-1155 transfer
await auraAsset.setApprovalForAll(DIAMOND_ADDRESS, true);
// Deposit
await diamond.depositTokensToNode(nodeHash, tokenId, amount);
// Now placeNodeSellOrder will succeed
```

---

### `RewardAlreadyPaid()` — Cannot Call handOff Twice

**Symptom:** Second call to `handOff(journeyId)` reverts.

**Cause:** `journeyRewardPaid[journeyId]` is already `true`.

**This is expected behaviour** — bounty is a one-time payment. If you believe there's an error, check which address called `handOff` first via `AuSysJourneyStatusUpdated` events.

---

### `FOKNotFilled()` — Fill-or-Kill Failed

**Symptom:** FOK order transaction reverts.

**Cause:** Not enough liquidity on the opposite side to fill the entire order.

**Fix:**

- Switch to GTC or IOC time-in-force
- Check order book depth before placing FOK
- Reduce order size

```typescript
const { bestAskSize } = await diamond.getBestBidAsk(marketId);
if (amount > bestAskSize) {
  // Not enough liquidity for FOK, use GTC instead
  timeInForce = 0; // GTC
}
```

---

## Indexer Issues

### Queries Returning No Data

**Symptom:** GraphQL queries return empty `items` arrays.

**Causes:**

1. **Indexer not synced** — check `/health` endpoint
2. **Wrong field names** — Ponder uses double `ss` suffix: `mintedAssetEventss` not `mintedAssetEvents`
3. **Address case mismatch** — Ponder stores addresses lowercase; query with lowercase address
4. **Events not emitted** — verify the transaction actually emitted the event on Basescan

```typescript
// Always lowercase addresses in where clauses
const data = await request(INDEXER_URL, QUERY, {
  account: address.toLowerCase(), // ← Critical
});
```

---

### `Cannot read properties of undefined (reading 'items')`

**Symptom:** Frontend crashes when reading indexer response.

**Cause:** The table name in the query is wrong — no data returned.

**Fix:** Double-check table names against [[Indexer/Schema and Queries]]. Common mistake:

```graphql
# Wrong:
mintedAssetEvents { items { ... } }

# Correct:
mintedAssetEventss { items { ... } }
```

---

### Indexer Behind Latest Block

**Symptom:** Recent transactions not appearing in queries.

**Causes:**

1. RPC rate limiting — check Alchemy/QuickNode dashboard
2. Indexer process crashed — `docker compose -f docker-compose.prod.yml ps`
3. Database disk full

```bash
# Check indexer health
curl http://indexer.aurellionlabs.com/health

# Check Docker logs
docker compose -f docker-compose.prod.yml logs --tail=50 indexer

# Restart if needed
docker compose -f docker-compose.prod.yml restart indexer
```

---

## Wallet & Connection Issues

### Wallet Not Connecting (Privy)

**Symptom:** Privy modal opens but wallet doesn't connect.

**Fixes:**

1. Check `NEXT_PUBLIC_PRIVY_APP_ID` env var is set correctly
2. Verify the domain is whitelisted in the Privy dashboard
3. Try a different browser / disable wallet extensions that conflict

---

### Wrong Network (Chain ID Mismatch)

**Symptom:** Transactions fail or go to wrong chain.

**Fix:** Prompt user to switch to Base Sepolia (chainId 84532):

```typescript
const { wallets } = useWallets();
const wallet = wallets[0];
await wallet.switchChain(84532);
```

---

### Gas Estimation Fails

**Symptom:** `estimateGas` reverts before the transaction is submitted.

**Cause:** Usually a pre-condition failure (e.g., not approved, wrong status).

**Debug:**

```typescript
try {
  await diamond.callStatic.placeOrder(...params); // Simulates without sending
} catch (err) {
  // Decoded error tells you what's wrong before you waste gas
  const decoded = diamond.interface.parseError(err.data);
  console.log('Pre-flight error:', decoded.name);
}
```

---

## Frontend Issues

### Provider Not Found Error

**Symptom:** `useNodes()` or similar hook throws "must be used within Provider".

**Cause:** A component is rendering outside the provider tree.

**Fix:** Check the provider wrapping order in `main.provider.tsx` — all pages must be wrapped by the full provider chain.

---

### Stale Data After Transaction

**Symptom:** UI doesn't update after a transaction completes.

**Cause:** Data fetched at mount isn't refetching after state changes.

**Fix:** Call `refreshAll()` or the specific `refresh` function from the relevant provider:

```typescript
const { refreshNodes } = useNodesProvider();
const tx = await diamond.registerNode(...);
await tx.wait();
refreshNodes(); // Trigger re-fetch
```

---

### Orders Not Appearing in Dashboard

**Symptom:** Placed orders don't show in customer dashboard.

**Cause:** Indexer hasn't processed the block yet (1-5 second lag).

**Fix:** Add a short delay after transaction confirmation before querying:

```typescript
await tx.wait();
await new Promise((r) => setTimeout(r, 3000)); // 3 second indexer lag
await refreshOrders();
```

Or implement optimistic updates — add the order to local state immediately after `tx.wait()`.

---

## Contract Upgrade Issues

### Function Does Not Exist

**Symptom:** Calling a function reverts with `Diamond: Function does not exist`.

**Cause:** Either the function was never added to the Diamond, or it was removed in an upgrade.

**Debug:**

```typescript
// Check which facet handles a selector
const selector = diamond.interface.getFunction('placeOrder').selector;
const facetAddress = await diamond.facetAddress(selector);
console.log('Handled by:', facetAddress);
// If 0x000...000, the function doesn't exist on this Diamond
```

---

### Storage Corruption After Upgrade

**Symptom:** Functions return wrong data after a facet upgrade.

**Cause:** AppStorage was modified incorrectly (fields reordered or removed).

**Fix:** This requires a new Diamond deployment. See [[Technical Reference/Upgrading Facets]] for the upgrade safety rules.

---

## Useful Debug Commands

```bash
# Check Diamond facets live
cast call 0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7 \
  "facets()(tuple(address,bytes4[])[])" \
  --rpc-url $BASE_SEPOLIA_RPC

# Get specific facet for a function
cast call 0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7 \
  "facetAddress(bytes4)(address)" \
  $(cast sig "placeOrder(address,uint256,address,uint96,uint96,bool,uint8,uint40)") \
  --rpc-url $BASE_SEPOLIA_RPC

# Decode a revert error
cast decode-error <error-data>

# Check node status
cast call 0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7 \
  "getNode(bytes32)(address,string,uint256,uint256,bool,bool,string,string,string)" \
  <nodeHash> \
  --rpc-url $BASE_SEPOLIA_RPC
```

---

## Related Pages

- [[Technical Reference/Error Reference]]
- [[Technical Reference/Developer Quickstart]]
- [[Technical Reference/Deployment]]
