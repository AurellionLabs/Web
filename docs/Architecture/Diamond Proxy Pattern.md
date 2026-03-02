---
tags: [architecture, diamond, eip-2535, smart-contracts]
---

# Diamond Proxy Pattern (EIP-2535)

[[🏠 Home]] > [[Architecture/System Overview]] > Diamond Proxy Pattern

Aurellion's smart contract system is built on **EIP-2535 Diamonds**, a proxy pattern that allows a single Ethereum address to expose an unlimited number of functions by delegating to multiple implementation contracts called **facets**.

---

## Why Diamond?

Traditional upgradeable proxies (UUPS, Transparent) have a 24KB contract size limit and support only one implementation at a time. Diamonds solve both problems:

| Problem            | Traditional Proxy        | Diamond (EIP-2535)                 |
| ------------------ | ------------------------ | ---------------------------------- |
| Size limit         | 24KB hard cap            | Unlimited (spread across facets)   |
| Upgradeability     | Replace entire logic     | Surgical per-function upgrades     |
| Storage collisions | Risk with naive patterns | Solved by AppStorage at fixed slot |
| Introspection      | None                     | DiamondLoupeFacet                  |

---

## How It Works

```
User / Frontend
      │
      │  call: nodeMint(...)
      ▼
┌─────────────────────────────┐
│         Diamond.sol         │  ← Single address, permanent
│   fallback() {              │
│     selectorToFacetAddress  │  ← Lookup table: bytes4 → address
│     delegatecall(facet)     │  ← Execute in Diamond's storage context
│   }                         │
└─────────────────────────────┘
      │
      │  delegatecall
      ▼
┌─────────────────────────────┐
│       AssetsFacet.sol       │  ← Logic lives here
│   nodeMint(account, asset)  │  ← Reads/writes Diamond's storage
└─────────────────────────────┘
```

Every function call hits the Diamond's `fallback()`. The fallback reads `msg.sig` (the 4-byte function selector), looks it up in `selectorToFacetAndPosition`, and `delegatecall`s to the appropriate facet. Because `delegatecall` runs the facet's code in the Diamond's storage context, all facets share one unified state.

---

## Aurellion's Facets

| Facet                                                           | File                       | Selectors                                  |
| --------------------------------------------------------------- | -------------------------- | ------------------------------------------ |
| [[Smart Contracts/Facets/AssetsFacet\|AssetsFacet]]             | `AssetsFacet.sol`          | ERC-1155, nodeMint, custody                |
| [[Smart Contracts/Facets/CLOBCoreFacet\|CLOBCoreFacet]]         | `CLOBCoreFacet.sol`        | placeLimitOrder, cancelOrder               |
| [[Smart Contracts/Facets/CLOBMatchingFacet\|CLOBMatchingFacet]] | `CLOBMatchingFacet.sol`    | matchOrder, executeMatch                   |
| [[Smart Contracts/Facets/OrderRouterFacet\|OrderRouterFacet]]   | `OrderRouterFacet.sol`     | placeOrder, placeMarketOrder, cancelOrder  |
| [[Smart Contracts/Facets/NodesFacet\|NodesFacet]]               | `NodesFacet.sol`           | registerNode, addSupportedAsset            |
| [[Smart Contracts/Facets/AuSysFacet\|AuSysFacet]]               | `AuSysFacet.sol`           | createOrder, createJourney, packageSign    |
| [[Smart Contracts/Facets/BridgeFacet\|BridgeFacet]]             | `BridgeFacet.sol`          | createUnifiedOrder, bridgeTradeToLogistics |
| [[Smart Contracts/Facets/RWYStakingFacet\|RWYStakingFacet]]     | `RWYStakingFacet.sol`      | createOpportunity, stakeToOpportunity      |
| CLOBFacet (deprecated)                                          | `CLOBFacet.sol`            | Legacy view functions                      |
| CLOBFacetV2                                                     | `CLOBFacetV2.sol`          | Intermediate V2 logic                      |
| CLOBAdminFacet                                                  | `CLOBAdminFacet.sol`       | Admin controls, fee config                 |
| CLOBLogisticsFacet                                              | `CLOBLogisticsFacet.sol`   | Logistics-specific CLOB ops                |
| CLOBMEVFacet                                                    | `CLOBMEVFacet.sol`         | MEV protection, commit-reveal              |
| CLOBViewFacet                                                   | `CLOBViewFacet.sol`        | Read-only order book queries               |
| OrderEventFacet                                                 | `OrderEventFacet.sol`      | Order event emission                       |
| OrderMatchingFacet                                              | `OrderMatchingFacet.sol`   | Internal matching utilities                |
| OrdersFacet                                                     | `OrdersFacet.sol`          | Order CRUD operations                      |
| OperatorFacet                                                   | `OperatorFacet.sol`        | Operator registration & staking            |
| ERC1155ReceiverFacet                                            | `ERC1155ReceiverFacet.sol` | Receive ERC-1155 tokens                    |
| DiamondCutFacet                                                 | `DiamondCutFacet.sol`      | Add/replace/remove facets                  |
| DiamondLoupeFacet                                               | `DiamondLoupeFacet.sol`    | Introspect facets                          |
| OwnershipFacet                                                  | `OwnershipFacet.sol`       | Transfer contract ownership                |

---

## Storage Pattern

All facets share a single `AppStorage` struct accessed via a deterministic storage slot:

```solidity
bytes32 constant APP_STORAGE_POSITION = keccak256('diamond.app.storage');

function appStorage() internal pure returns (AppStorage storage s) {
    bytes32 position = APP_STORAGE_POSITION;
    assembly { s.slot := position }
}
```

This prevents storage collisions between facets. A second storage slot (`RWY_STORAGE_POSITION`) isolates RWY-specific state in `RWYStorage`, reducing the AppStorage struct size.

See [[Smart Contracts/Libraries/DiamondStorage]] for the complete storage layout.

---

## Upgrading Facets

Upgrades go through `DiamondCutFacet.diamondCut()`, which accepts an array of `FacetCut` structs:

```solidity
struct FacetCut {
    address facetAddress;   // New facet implementation
    FacetCutAction action;  // Add | Replace | Remove
    bytes4[] functionSelectors;  // Which selectors to update
}
```

Only the contract owner can call `diamondCut`. This allows:

- **Adding** new functionality (new selectors → new facet)
- **Replacing** existing logic (existing selectors → new facet address)
- **Removing** deprecated functions (selectors → address(0))

---

## Security Model

- `LibDiamond.enforceIsContractOwner()` guards all privileged operations
- `ReentrancyGuard` is used in BridgeFacet, CLOBCoreFacet, CLOBMatchingFacet, OrderRouterFacet, AuSysFacet
- RBAC roles (`ADMIN_ROLE`, `DRIVER_ROLE`, `DISPATCHER_ROLE`) are stored in AppStorage and checked per-call
- Circuit breakers in the CLOB pause trading if price moves exceed thresholds

---

## Related Pages

- [[Smart Contracts/Libraries/DiamondStorage]]
- [[Smart Contracts/Overview]]
- [[Architecture/System Overview]]
