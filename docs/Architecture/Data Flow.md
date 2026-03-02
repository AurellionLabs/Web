---
tags: [architecture, data-flow, events, indexer, clob, journey]
---

# Data Flow

[[🏠 Home]] > Architecture > Data Flow

Four primary data flows drive the Aurellion protocol. Each starts at the frontend, passes through smart contracts, emits events, gets indexed by Ponder, and is read back by the frontend.

---

## 1 — Asset Tokenisation Flow

```mermaid
sequenceDiagram
    participant NO as Node Operator
    participant FE as Frontend
    participant SC as Diamond (AssetsFacet)
    participant IDX as Ponder Indexer

    NO->>FE: Fill tokenisation form
    FE->>SC: nodeMint(account, assetDef, amount, class, data)
    SC->>SC: validNode() — check ownerNodes[msg.sender]
    SC->>SC: isClassActive[keccak256(class)]
    SC->>SC: tokenId = uint256(keccak256(abi.encode(asset)))
    SC->>SC: _mint(account, tokenId, amount, data)
    SC-->>FE: Emit MintedAsset(account, hash, tokenId, name, class)
    IDX->>IDX: Store in mintedAssetEvents table
    FE->>IDX: Query mintedAssetEventss
    IDX-->>FE: Token list with metadata
```

---

## 2 — CLOB Order Matching Flow

```mermaid
sequenceDiagram
    participant BU as Buyer
    participant SE as Seller
    participant OR as OrderRouterFacet
    participant CB as CLOBCoreFacet
    participant CM as CLOBMatchingFacet

    BU->>OR: placeOrder(tokenId, qty, price, BUY, GTC)
    OR->>CB: Validate & encode PackedOrder
    CB->>CB: Escrow AURA (price × qty)
    CB-->>OR: Emit RouterOrderPlaced

    SE->>OR: placeOrder(tokenId, qty, price, SELL, GTC)
    OR->>CM: Check order book — cross detected
    CM->>CM: Match at resting order price
    CM->>CM: Transfer tokens to buyer
    CM->>CM: Transfer AURA to seller (minus fees)
    CM-->>OR: Emit TradeExecuted
```

---

## 3 — Unified Order (Bridge + Logistics) Flow

```mermaid
graph TD
    A["Buyer places order<br/>BridgeFacet.createUnifiedOrder()"]
    B["TRADE_MATCHED<br/>CLOBMatchingFacet fills the order"]
    C["UNIFIED_LOGISTICS_CREATED<br/>AuSys / CLOBLogistics assigns route"]
    D["UNIFIED_IN_TRANSIT<br/>Driver picks up, GPS proof submitted"]
    E["UNIFIED_DELIVERED<br/>Delivery confirmed via EIP-712 sig"]
    F["UNIFIED_SETTLED<br/>Buyer receives tokens, seller receives AURA"]

    A --> B --> C --> D --> E --> F

    style A fill:#0a0a0a,stroke:#c5a55a,color:#c5a55a
    style B fill:#0a0a0a,stroke:#8b1a1a,color:#c06060
    style C fill:#0a0a0a,stroke:#8b1a1a,color:#c06060
    style D fill:#0a0a0a,stroke:#8b1a1a,color:#c06060
    style E fill:#0a0a0a,stroke:#c5a55a,color:#c5a55a
    style F fill:#080808,stroke:#2d6a2d,color:#5a9a5a
```

---

## 4 — RWY Staking Flow

```mermaid
graph TD
    OP["Node Operator<br/>createOpportunity()"]
    ST["Staker<br/>stakeOnOpportunity()"]
    FN["FUNDED<br/>collateral + stake ≥ target"]
    PR["Processing<br/>commodity in transit"]
    PD["PROFIT_DISTRIBUTED<br/>yield paid to stakers"]
    CN["CANCELLED<br/>underfunded → refund"]

    OP --> FN
    ST --> FN
    FN -->|"Success"| PR --> PD
    FN -->|"Underfunded"| CN

    style FN fill:#0a0a0a,stroke:#c5a55a,color:#c5a55a
    style PD fill:#080808,stroke:#2d6a2d,color:#5a9a5a
    style CN fill:#080808,stroke:#8b1a1a,color:#c06060
```

---

## Event → Database Mapping

| Event                  | Emitter           | Ponder Table                  |
| ---------------------- | ----------------- | ----------------------------- |
| `MintedAsset`          | AssetsFacet       | `mintedAssetEventss`          |
| `RouterOrderPlaced`    | OrderRouterFacet  | `routerOrderPlacedEventss`    |
| `TradeExecuted`        | CLOBMatchingFacet | `tradeExecutedEventss`        |
| `UnifiedOrderCreated`  | BridgeFacet       | `unifiedOrderCreatedEventss`  |
| `JourneyStatusUpdated` | AuSysFacet        | `journeyStatusUpdatedEventss` |
| `OpportunityCreated`   | RWYStakingFacet   | `opportunityCreatedEventss`   |
| `ProfitDistributed`    | RWYStakingFacet   | `profitDistributedEventss`    |

---

## Related Pages

- [[Architecture/System Overview]]
- [[Architecture/Indexer Architecture]]
- [[Core Concepts/Order Lifecycle]]
- [[Core Concepts/Journey and Logistics]]
