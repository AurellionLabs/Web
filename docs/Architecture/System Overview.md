---
tags: [architecture, overview]
---

# System Overview

[[🏠 Home]] > Architecture > System Overview

Aurellion is a full-stack decentralised application built across four primary layers: **smart contracts**, an **event indexer**, a **TypeScript domain/repository layer**, and a **Next.js frontend**. Each layer has a single, clear responsibility and communicates with adjacent layers through well-defined interfaces.

---

## Stack Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (App Router)                 │
│  Customer UI  │  Node Operator UI  │  Driver UI  │  Pool UI      │
└───────────────────────────┬──────────────────────────────────────┘
                            │ React Context / Hooks
┌───────────────────────────▼──────────────────────────────────────┐
│             Domain + Repository Layer (TypeScript)                │
│  OrderRepository  NodeRepository  CLOBRepository  RWYRepository  │
└───────────────────────────┬──────────────────────────────────────┘
              ┌─────────────┴─────────────┐
              │                           │
┌─────────────▼──────────────┐ ┌──────────▼────────────────────────┐
│   Ponder Indexer (GraphQL) │ │   Blockchain (Base / Base Sepolia)│
│  Event → Aggregate tables  │ │   Diamond Proxy (EIP-2535)        │
│  REST + GraphQL API        │ │   21 Facets  │  DiamondStorage     │
└────────────────────────────┘ └────────────────────────────────────┘
```

---

## Component Responsibilities

### Smart Contracts (Solidity)

The on-chain truth layer. A single **Diamond proxy** (EIP-2535) at one address hosts **21 facets**, each responsible for a domain slice:

| Facet                                                           | Domain                                       |
| --------------------------------------------------------------- | -------------------------------------------- |
| [[Smart Contracts/Facets/AssetsFacet\|AssetsFacet]]             | ERC-1155 tokenisation of physical assets     |
| [[Smart Contracts/Facets/CLOBCoreFacet\|CLOBCoreFacet]]         | Order book management, order placement       |
| [[Smart Contracts/Facets/CLOBMatchingFacet\|CLOBMatchingFacet]] | Price-time priority matching engine          |
| [[Smart Contracts/Facets/OrderRouterFacet\|OrderRouterFacet]]   | Unified entry point for all order operations |
| [[Smart Contracts/Facets/NodesFacet\|NodesFacet]]               | Node registry, capacity, asset support       |
| [[Smart Contracts/Facets/AuSysFacet\|AuSysFacet]]               | Logistics orchestration, journey management  |
| [[Smart Contracts/Facets/BridgeFacet\|BridgeFacet]]             | Bridges CLOB trades to physical logistics    |
| [[Smart Contracts/Facets/RWYStakingFacet\|RWYStakingFacet]]     | Real World Yield staking opportunities       |
| DiamondCutFacet                                                 | Facet upgrades                               |
| DiamondLoupeFacet                                               | Facet introspection                          |
| OwnershipFacet                                                  | Contract ownership                           |

All state lives in a single **AppStorage** struct accessed via a fixed storage slot, preventing storage collisions across upgrades. See [[Smart Contracts/Libraries/DiamondStorage]].

### Ponder Indexer

A TypeScript indexer that listens to all Diamond events and writes normalised data to a PostgreSQL database. Exposes a **GraphQL + REST API** that the frontend queries instead of hitting the chain directly.

- Zero RPC calls for reads on the hot path
- Events define the schema — adding a facet automatically extends the indexer
- See [[Indexer/Ponder Setup]] and [[Indexer/Schema and Queries]]

### Domain + Repository Layer

A clean separation between business logic (domain) and data access (repositories). Each domain area has its own folder under `/domain/` with TypeScript types, and a matching `/infrastructure/repositories/` file that translates between on-chain data and domain types.

- `OrderRepository` — fetch and manipulate orders/journeys
- `NodeRepository` — query the node network
- `CLOBRepository` — real-time order book data
- `RWYRepository` — staking opportunities
- `PoolRepository` — AMM pool data

### Next.js Frontend

A React/Next.js application with three distinct user roles, each with their own sub-application:

| Role          | Base Route   | Purpose                                     |
| ------------- | ------------ | ------------------------------------------- |
| Customer      | `/customer/` | Browse assets, trade on CLOB, manage stakes |
| Node Operator | `/node/`     | Register nodes, mint assets, manage orders  |
| Driver        | `/driver/`   | View assigned journeys, manage deliveries   |

Wallet connection is handled by **Privy** with embedded wallet support. State is distributed across React context providers. See [[Frontend/Providers]].

---

## Network

Aurellion currently operates on **Base Sepolia** (testnet) with the Diamond deployed at a single proxy address. The system is designed to be chain-agnostic via configuration in `chain-constants.ts`.

---

## Key Design Principles

1. **Single proxy address** — users and integrators never need to know which facet handles a function
2. **Events as source of truth** — the indexer derives all state from emitted events; on-chain state is the ground truth
3. **Domain isolation** — each facet manages its own domain; cross-domain calls go through well-defined interfaces
4. **Role-based access** — ADMIN_ROLE, DRIVER_ROLE, DISPATCHER_ROLE enforced at the contract level
5. **Gas efficiency** — `PackedOrder` uses 3 storage slots instead of 10; Red-Black Trees for O(log n) order book operations

---

## Related Pages

- [[Architecture/Diamond Proxy Pattern]]
- [[Architecture/Data Flow]]
- [[Smart Contracts/Overview]]
