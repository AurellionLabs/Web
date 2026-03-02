---
tags: [smart-contracts, overview, diamond]
---

# Smart Contracts Overview

[[🏠 Home]] > Smart Contracts > Overview

All Aurellion on-chain logic lives inside a single **Diamond proxy** (EIP-2535). This page gives a complete map of every facet, library, interface, and storage structure.

---

## Contract Architecture

```
contracts/
├── diamond/
│   ├── Diamond.sol                    ← Proxy entry point
│   ├── facets/
│   │   ├── AssetsFacet.sol           ← ERC-1155 token management
│   │   ├── AuSysFacet.sol            ← Logistics orchestration
│   │   ├── BridgeFacet.sol           ← CLOB↔Logistics bridge
│   │   ├── CLOBAdminFacet.sol        ← Admin controls
│   │   ├── CLOBCoreFacet.sol         ← Order placement
│   │   ├── CLOBFacet.sol             ← Legacy (deprecated order fns)
│   │   ├── CLOBFacetV2.sol           ← V2 intermediate
│   │   ├── CLOBLogisticsFacet.sol    ← Logistics-integrated CLOB
│   │   ├── CLOBMatchingFacet.sol     ← Matching engine
│   │   ├── CLOBMEVFacet.sol          ← MEV protection
│   │   ├── CLOBViewFacet.sol         ← Read-only queries
│   │   ├── DiamondCutFacet.sol       ← Upgrade management
│   │   ├── DiamondLoupeFacet.sol     ← Introspection
│   │   ├── ERC1155ReceiverFacet.sol  ← Token reception
│   │   ├── NodesFacet.sol            ← Node registry
│   │   ├── OperatorFacet.sol         ← Operator permissions
│   │   ├── OrderEventFacet.sol       ← Event emission
│   │   ├── OrderMatchingFacet.sol    ← Internal matching
│   │   ├── OrderRouterFacet.sol      ← Single order entry point ⭐
│   │   ├── OrdersFacet.sol           ← Order CRUD
│   │   ├── OwnershipFacet.sol        ← Ownership transfer
│   │   └── RWYStakingFacet.sol       ← Real World Yield
│   ├── interfaces/
│   │   ├── IDiamondCut.sol
│   │   ├── IDiamondLoupe.sol
│   │   └── IERC173.sol
│   ├── libraries/
│   │   ├── CLOBLib.sol               ← CLOB utility functions
│   │   ├── DiamondStorage.sol        ← Unified AppStorage struct ⭐
│   │   ├── LibDiamond.sol            ← Diamond core logic
│   │   ├── OrderBookLib.sol          ← Order book operations
│   │   ├── OrderMatchingLib.sol      ← Matching algorithms
│   │   ├── OrderStatus.sol           ← Status constants
│   │   ├── OrderUtilsLib.sol         ← Order validation utilities
│   │   └── RWYStorage.sol            ← Isolated RWY state
│   └── storage/
│       └── DiamondStorage.sol
├── OrderBridge.sol                    ← Legacy bridge (superseded by BridgeFacet)
└── interfaces/
    └── (various)
```

---

## Facet Summary Table

| Facet                 | Status     | Key Functions                                                                           | Guards                                                  |
| --------------------- | ---------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **AssetsFacet**       | Active     | `nodeMint`, `balanceOf`, `safeTransferFrom`, `setCustodian`                             | `validNode`, `onlyOwner`                                |
| **CLOBCoreFacet**     | Active     | `placeLimitOrder`, `cancelOrder`, `initializeCLOBV2`                                    | `whenNotPaused`, `nonReentrant`, `checkRateLimit`       |
| **CLOBMatchingFacet** | Active     | `matchOrder`, `executeMatch`                                                            | `whenNotPaused`, `nonReentrant`                         |
| **OrderRouterFacet**  | Active ⭐  | `placeOrder`, `placeMarketOrder`, `cancelOrder`, `placeNodeSellOrder`                   | `nonReentrant`                                          |
| **NodesFacet**        | Active     | `registerNode`, `addSupportedAsset`, `updateNodeLocation`                               | `onlyOwner` (some)                                      |
| **AuSysFacet**        | Active     | `createOrder`, `createJourney`, `assignDriver`, `packageSign`, `handOff`, `settleOrder` | `nonReentrant`, `RBAC roles`                            |
| **BridgeFacet**       | Active     | `createUnifiedOrder`, `bridgeTradeToLogistics`, `createLogisticsOrder`, `settleOrder`   | `nonReentrant`, `Initializable`                         |
| **RWYStakingFacet**   | Active     | `createOpportunity`, `stakeToOpportunity`, `startProcessing`, `claimProfit`             | `onlyApprovedOperator`, `nonReentrant`, `whenNotPaused` |
| **CLOBAdminFacet**    | Active     | `setFees`, `pauseMarket`, `setCircuitBreaker`                                           | `onlyOwner`                                             |
| **CLOBViewFacet**     | Active     | `getOrderBook`, `getBestBid`, `getBestAsk`, `getSpread`                                 | None                                                    |
| **CLOBMEVFacet**      | Active     | `commitOrder`, `revealOrder`                                                            | `whenNotPaused`                                         |
| **OperatorFacet**     | Active     | `registerOperator`, `setOperatorReputation`                                             | `onlyOwner`                                             |
| **DiamondCutFacet**   | Active     | `diamondCut`                                                                            | `onlyOwner`                                             |
| **DiamondLoupeFacet** | Active     | `facets`, `facetFunctionSelectors`, `facetAddresses`                                    | None                                                    |
| **OwnershipFacet**    | Active     | `transferOwnership`, `owner`                                                            | `onlyOwner`                                             |
| **CLOBFacet**         | Deprecated | `placeBuyOrder`, `placeOrder` → redirects to OrderRouterFacet                           | —                                                       |

---

## Key Libraries

| Library              | Purpose                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------- |
| **DiamondStorage**   | Defines `AppStorage` struct at fixed slot. All facets read/write through `appStorage()`. |
| **RWYStorage**       | Isolated storage for RWY staking (separate slot, prevents AppStorage bloat).             |
| **CLOBLib**          | Price/amount calculation utilities, `calculateQuoteAmount`.                              |
| **OrderBookLib**     | Red-Black Tree operations for O(log n) price level management.                           |
| **OrderMatchingLib** | Price-time priority matching algorithm.                                                  |
| **OrderUtilsLib**    | Parameter validation, market creation.                                                   |
| **LibDiamond**       | Diamond cut logic, ownership, facet lookup.                                              |
| **OrderStatus**      | Status constants for Unified Orders (PENDING_TRADE, TRADE_MATCHED, etc.) and Journeys.   |

---

## Key Data Structures

See [[Smart Contracts/Libraries/DiamondStorage]] for the full `AppStorage` definition. Key structs:

### PackedOrder (CLOB V2)

```solidity
struct PackedOrder {
    // Slot 1: maker(160) | isBuy(1) | orderType(2) | status(2) | TIF(3) | nonce(88)
    uint256 makerAndFlags;
    // Slot 2: price(96) | amount(96) | filledAmount(64)
    uint256 priceAmountFilled;
    // Slot 3: expiry(40) | createdAt(40) | marketIndex(32) | baseToken(160)
    uint256 expiryCreatedMarket;
}
```

3 storage slots vs. 10+ for the legacy CLOBOrder — 70% storage reduction.

### UnifiedOrder

Links a CLOB trade to a physical logistics order:

```
UnifiedOrder {
  clobOrderId, clobTradeId, ausysOrderId,
  buyer, seller, sellerNode,
  token, tokenId, tokenQuantity, price,
  bounty, escrowedAmount,
  status (PENDING_TRADE → TRADE_MATCHED → IN_LOGISTICS → SETTLED),
  logisticsStatus,
  createdAt, matchedAt, deliveredAt, settledAt,
  deliveryData (ParcelData)
}
```

### AuSysOrder (Logistics)

```
AuSysOrder {
  id, token, tokenId, tokenQuantity, price,
  txFee, buyer, seller,
  journeyIds[], nodes[],
  requestedTokenQuantity,
  startLat, startLng, endLat, endLng,
  startName, endName,
  currentStatus (CREATED/PROCESSING/SETTLED/CANCELLED)
}
```

---

## Fee Structure

| Fee              | Amount                                   | Recipient                |
| ---------------- | ---------------------------------------- | ------------------------ |
| Taker fee        | Configurable bps (default: 10bps = 0.1%) | Protocol                 |
| Maker fee        | Configurable bps (default: 5bps = 0.05%) | Protocol                 |
| LP fee           | 5bps                                     | Liquidity providers      |
| Logistics bounty | 2% of order value                        | Driver                   |
| Protocol fee     | 0.25% of order value                     | `feeRecipient` address   |
| AuSys tx fee     | 2% of order value                        | Distributed across nodes |

---

## Related Pages

- [[Architecture/Diamond Proxy Pattern]]
- [[Smart Contracts/Libraries/DiamondStorage]]
- [[Smart Contracts/Facets/AssetsFacet]]
- [[Smart Contracts/Facets/CLOBCoreFacet]]
- [[Smart Contracts/Facets/BridgeFacet]]
