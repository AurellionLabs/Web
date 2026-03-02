---
tags: [reference, upgrades, diamond, deployment, devops]
---

# Upgrading Facets

[[🏠 Home]] > Technical Reference > Upgrading Facets

Step-by-step guide to safely upgrading, adding, or removing Aurellion Diamond facets without breaking existing state or users.

---

## When to Upgrade

| Situation                    | Action                                      |
| ---------------------------- | ------------------------------------------- |
| Bug fix in existing function | Replace facet (same selectors, new address) |
| Adding new feature/function  | Add facet or add selectors to existing      |
| Removing deprecated function | Remove selector                             |
| Breaking storage change      | New diamond deployment (not upgrade)        |
| Gas optimisation             | Replace facet                               |

---

## The Diamond Cut Process

All upgrades go through `DiamondCutFacet.diamondCut()`:

```solidity
function diamondCut(
    FacetCut[] calldata _diamondCut,
    address _init,      // Optional: address with init calldata
    bytes calldata _calldata  // Init calldata
) external onlyOwner;

struct FacetCut {
    address facetAddress;
    FacetCutAction action;    // Add | Replace | Remove
    bytes4[] functionSelectors;
}
```

---

## Step-by-Step: Replacing an Existing Facet

### Example: Upgrading CLOBCoreFacet with a bug fix

```bash
# 1. Write the new facet implementation
# Edit: contracts/diamond/facets/CLOBCoreFacet.sol

# 2. Compile
npx hardhat compile

# 3. Run tests against the new implementation
npx hardhat test test/clob/

# 4. Deploy the new facet implementation
npx hardhat run scripts/deploy-facet.ts --network baseSepolia
# Output: CLOBCoreFacet deployed at 0xNEWADDRESS

# 5. Get the function selectors for the facet
npx hardhat run scripts/get-selectors.ts --network baseSepolia \
  --contract CLOBCoreFacet
# Output: [0x12345678, 0xabcdef12, ...]

# 6. Execute the diamondCut (Replace action)
npx hardhat run scripts/diamond-cut.ts --network baseSepolia \
  --facetAddress 0xNEWADDRESS \
  --action Replace \
  --selectors 0x12345678,0xabcdef12,...

# 7. Verify the upgrade
npx hardhat run scripts/verify-facets.ts --network baseSepolia
# Confirms each selector maps to the correct facet address

# 8. Verify contract source on Basescan
npx hardhat verify --network baseSepolia 0xNEWADDRESS

# 9. Update chain-constants.ts
export const NEXT_PUBLIC_CLOB_CORE_FACET_ADDRESS = '0xNEWADDRESS';

# 10. Save deployment record
# deployments/baseSepolia-<timestamp>.json
```

---

## Step-by-Step: Adding a New Facet

```bash
# 1. Write the new facet
# Create: contracts/diamond/facets/NewFeatureFacet.sol

# 2. If new events: regenerate indexer schema
bun run generate:indexer
# Review: indexer/generated-schema.ts
# New event tables should appear

# 3. Compile and test
npx hardhat compile
npx hardhat test test/new-feature/

# 4. Deploy
npx hardhat run scripts/deploy-facet.ts --network baseSepolia

# 5. Get selectors (new function selectors only)
npx hardhat run scripts/get-selectors.ts --contract NewFeatureFacet

# 6. Add to Diamond
npx hardhat run scripts/diamond-cut.ts --network baseSepolia \
  --facetAddress 0xNEWFACET \
  --action Add \
  --selectors <selectors>

# 7. If new storage: add fields to end of AppStorage
# NEVER reorder, ONLY append

# 8. If initialisation needed:
npx hardhat run scripts/diamond-cut.ts --network baseSepolia \
  --facetAddress 0xNEWFACET \
  --action Add \
  --selectors <selectors> \
  --initContract NewFeatureFacet \   # Contract with init function
  --initFunction "initialize()"       # Called after cut

# 9. Add handlers to indexer
# Create: indexer/src/handlers/new-feature.ts
# Register in: indexer/src/handlers/index.ts

# 10. Redeploy indexer
docker compose -f docker-compose.prod.yml restart indexer
```

---

## Step-by-Step: Removing a Deprecated Function

```bash
# Remove selectors by setting facetAddress to address(0)
npx hardhat run scripts/diamond-cut.ts --network baseSepolia \
  --facetAddress 0x0000000000000000000000000000000000000000 \
  --action Remove \
  --selectors 0x12345678,0xabcdef12
```

After removal, calling those selectors on the Diamond will revert with:

```
Diamond: Function does not exist
```

---

## Storage Safety Rules

### The Golden Rules

1. ✅ **Append only** — new fields go at the END of `AppStorage`
2. ❌ **Never reorder** — changing field order shifts all subsequent slots
3. ❌ **Never remove** — mark as deprecated with a comment instead
4. ✅ **Use tombstone booleans** — `bool _deprecated_fieldName` to preserve slot
5. ✅ **New domains get new storage** — like `RWYStorage` with its own slot

### Checking Storage Layout

```bash
# Foundry storage layout inspection
forge inspect Diamond storage

# Hardhat storage layout (requires plugin)
npx hardhat storage-layout --contract Diamond
```

Compare before/after a change to verify no slots shifted.

---

## Facet Size Limits

Each facet must fit within the 24KB contract size limit:

```bash
# Check compiled contract sizes
npx hardhat compile --show-contract-sizes

# If too large, split into multiple facets:
# CLOBFacetV2 → CLOBCoreFacet + CLOBMatchingFacet + CLOBViewFacet
# Or extract logic into libraries (no size limit):
# CLOBMatchingFacet → uses OrderMatchingLib (library)
```

---

## Rollback Plan

If an upgrade introduces a bug:

1. Deploy the previous facet implementation (it should still be in git)
2. Execute `diamondCut` with `Replace` action, pointing back to old address
3. No state migration needed — AppStorage is unchanged

This is the key advantage of the Diamond pattern: rollbacks are instant and don't affect stored state.

---

## Upgrade Checklist

Before executing any `diamondCut` on mainnet:

- [ ] New facet tested with full test suite
- [ ] Storage layout verified (no slot shifts)
- [ ] New facet compiled size < 24KB
- [ ] Function selectors verified correct
- [ ] If new events: indexer schema regenerated and deployed
- [ ] If init function: init function tested in isolation
- [ ] Basescan verification ready
- [ ] `chain-constants.ts` update prepared
- [ ] Deployment record JSON ready
- [ ] Rollback plan documented
- [ ] Timelock satisfied (if `emergencyTimelock` > 0)

---

## Related Pages

- [[Architecture/Diamond Proxy Pattern]]
- [[Smart Contracts/Libraries/DiamondStorage]]
- [[Technical Reference/Deployment]]
