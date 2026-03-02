---
tags: [frontend, pages, routes, navigation]
---

# Pages Reference

[[🏠 Home]] > [[Frontend/Application Structure]] > Pages Reference

Complete reference of all routes in the Aurellion application, their purpose, key components, and relevant data sources.

---

## Landing Page

| Route | File           | Description                                          |
| ----- | -------------- | ---------------------------------------------------- |
| `/`   | `app/page.tsx` | Landing page — protocol overview, connect wallet CTA |

---

## Customer Routes

All customer routes are under `app/(app)/customer/`.

| Route                                 | File                                 | Description                                                | Key Data                                      |
| ------------------------------------- | ------------------------------------ | ---------------------------------------------------------- | --------------------------------------------- |
| `/customer/dashboard`                 | `dashboard/page.tsx`                 | Portfolio overview: balances, active orders, recent trades | `CustomerProvider`, `OrderRepository`         |
| `/customer/trading`                   | `trading/page.tsx`                   | Browse all asset markets                                   | `PlatformProvider` (classes), `TradeProvider` |
| `/customer/trading/[id]`              | `trading/[id]/page.tsx`              | Market view: order book, price chart, recent trades        | `TradeProvider`, `CLOBRepository`             |
| `/customer/trading/[id]/order`        | `trading/[id]/order/page.tsx`        | Place buy/sell order for specific asset                    | `DiamondProvider`, `TradeProvider`            |
| `/customer/trading/[id]/chart`        | `trading/[id]/chart.tsx`             | Price history chart component                              | `CLOBRepository` (trade history)              |
| `/customer/trading/class/[className]` | `trading/class/[className]/page.tsx` | All tokens in a class (e.g., all GOAT markets)             | `PlatformProvider`, Ponder                    |
| `/customer/p2p`                       | `p2p/page.tsx`                       | P2P marketplace: browse open offers                        | `OrderRepository` (P2P offers)                |
| `/customer/p2p/create`                | `p2p/create/page.tsx`                | Create a new P2P offer                                     | `DiamondProvider`, `AuSysFacet`               |
| `/customer/p2p/market/[className]`    | `p2p/market/[className]/page.tsx`    | P2P offers filtered by asset class                         | Ponder indexer                                |
| `/customer/pools`                     | `pools/page.tsx`                     | AMM pool browser: all pools with TVL and APR               | `PoolsProvider`                               |
| `/customer/pools/[id]`                | `pools/[id]/page.tsx`                | Individual pool: add/remove liquidity, chart               | `PoolsProvider`                               |
| `/customer/pools/[id]/add-liquidity`  | `pools/[id]/add-liquidity/page.tsx`  | Add liquidity form                                         | `DiamondProvider`, `PoolsProvider`            |
| `/customer/pools/create-pool`         | `pools/create-pool/page.tsx`         | Create new AMM pool                                        | `DiamondProvider`                             |
| `/customer/rwy`                       | `rwy/page.tsx`                       | RWY opportunity browser                                    | `RWYRepository`, Ponder                       |
| `/customer/rwy/[id]`                  | `rwy/[id]/page.tsx`                  | RWY opportunity details + stake form                       | `DiamondProvider`, `RWYRepository`            |
| `/customer/rwy/my-stakes`             | `rwy/my-stakes/page.tsx`             | Your staking positions across all opportunities            | `RWYRepository`, `CustomerProvider`           |
| `/customer/faucet`                    | `faucet/page.tsx`                    | Testnet token faucet (Base Sepolia only)                   | Direct contract call                          |

---

## Node Operator Routes

All node routes are under `app/(app)/node/`.

| Route                               | File                              | Description                                     | Key Data                                |
| ----------------------------------- | --------------------------------- | ----------------------------------------------- | --------------------------------------- |
| `/node/dashboard`                   | `dashboard/page.tsx`              | Node management hub: your nodes, assets, orders | `NodesProvider`, `SelectedNodeProvider` |
| `/node/dashboard/assets/edit-price` | `dashboard/assets/edit-price.tsx` | Edit asset prices for node's supported assets   | `DiamondProvider`, `NodesFacet`         |
| `/node/register`                    | `register/page.tsx`               | Register a new node                             | `DiamondProvider`, `NodesFacet`         |
| `/node/explorer`                    | `explorer/page.tsx`               | Map view of all nodes in the network            | `NodesProvider`, Ponder                 |
| `/node/overview`                    | `overview/page.tsx`               | Summary of all nodes you own                    | `NodesProvider`                         |
| `/node/[nodeId]/orders`             | `[nodeId]/orders/page.tsx`        | Orders associated with a specific node          | `OrderRepository`                       |
| `/node/rwy`                         | `rwy/page.tsx`                    | Your RWY opportunities (as operator)            | `RWYRepository`                         |
| `/node/rwy/create`                  | `rwy/create/page.tsx`             | Create a new RWY processing opportunity         | `DiamondProvider`, `RWYStakingFacet`    |

---

## Driver Routes

| Route               | File                        | Description                                   | Key Data                       |
| ------------------- | --------------------------- | --------------------------------------------- | ------------------------------ |
| `/driver/dashboard` | `driver/dashboard/page.tsx` | All assigned journeys, sign actions, earnings | `DriverProvider`, `AuSysFacet` |

---

## Component Inventory (Node Dashboard)

The node dashboard has several sub-components:

| Component             | File                                  | Purpose                                           |
| --------------------- | ------------------------------------- | ------------------------------------------------- |
| `AssetAttributeInput` | `dashboard/asset-attribute-input.tsx` | Renders attribute inputs when minting a new asset |
| `AssetSelectionForm`  | `dashboard/asset-selection-form.tsx`  | Selects asset type from supported classes         |
| `EditNodeModal`       | `dashboard/edit-node-modal.tsx`       | Edit node metadata (location, name, capacity)     |
| `CapacityInput`       | `register/CapacityInput.tsx`          | Input component for setting node capacity         |
| `AssetSection`        | `register/AssetSection.tsx`           | Declare supported assets during node registration |

---

## Pool Components

| Component             | File                                            | Purpose                |
| --------------------- | ----------------------------------------------- | ---------------------- |
| `PoolChart`           | `customer/pools/[id]/chart.tsx`                 | Price chart for a pool |
| `ClaimRewardsButton`  | `customer/pools/[id]/claim-rewards-button.tsx`  | One-click fee claiming |
| `RemoveLiquidityForm` | `customer/pools/[id]/remove-liquidity-form.tsx` | Withdraw LP position   |

---

## Trading Components

| Component    | File                              | Purpose                  |
| ------------ | --------------------------------- | ------------------------ |
| `PriceChart` | `customer/trading/[id]/chart.tsx` | CLOB price history chart |

---

## Route Parameters

| Param         | Used In                   | Values                               |
| ------------- | ------------------------- | ------------------------------------ |
| `[id]`        | Trading, Pools, RWY       | Market ID (bytes32 hex) or pool ID   |
| `[nodeId]`    | Node orders               | Node hash (bytes32 hex)              |
| `[className]` | Trading class, P2P market | Asset class name (e.g., "LIVESTOCK") |

---

## Navigation Flow

```
/ (landing)
  │
  ├── Connect wallet
  │
  ├── /customer/dashboard
  │   ├── → /customer/trading (browse to trade)
  │   │   └── → /customer/trading/[id]/order (place order)
  │   ├── → /customer/p2p (P2P marketplace)
  │   ├── → /customer/pools (provide liquidity)
  │   └── → /customer/rwy (stake for yield)
  │
  ├── /node/dashboard
  │   ├── → /node/register (first time)
  │   ├── → /node/explorer (browse network)
  │   └── → /node/rwy/create (create opportunity)
  │
  └── /driver/dashboard
      └── (sign pickups, complete deliveries)
```

---

## Related Pages

- [[Frontend/Application Structure]]
- [[Frontend/Providers]]
- [[Roles/Customer]]
- [[Roles/Node Operator]]
- [[Roles/Driver]]
