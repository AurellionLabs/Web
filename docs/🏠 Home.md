---
tags: [home, index, navigation]
---

# 🌍 Aurellion Protocol Documentation

> **Aurellion** is a decentralised Real-World Asset (RWA) marketplace that enables physical commodities — livestock, grain, gemstones, raw materials — to be tokenised on-chain, traded on a Central Limit Order Book (CLOB), transported through a network of verified nodes and drivers, and settled automatically via smart contract.

---

## 🗺 Documentation Map

### Architecture

- [[Architecture/System Overview]] — 10,000-foot view of the full stack
- [[Architecture/Diamond Proxy Pattern]] — EIP-2535 modular contract architecture
- [[Architecture/Data Flow]] — How data moves from user action to on-chain settlement
- [[Architecture/Repository Pattern]] — Domain/repository/service separation
- [[Architecture/Services Layer]] — Infrastructure services: routing, price history, redemption
- [[Architecture/Indexer Architecture]] — Ponder event pipeline deep-dive

### Smart Contracts

- [[Smart Contracts/Overview]] — All contracts and their relationships
- **Facets**
  - [[Smart Contracts/Facets/AssetsFacet]] — ERC-1155 RWA tokenisation
  - [[Smart Contracts/Facets/CLOBCoreFacet]] — Order placement & order book
  - [[Smart Contracts/Facets/CLOBMatchingFacet]] — Matching engine & trade execution
  - [[Smart Contracts/Facets/CLOBViewFacet]] — Gas-free read-only order book queries
  - [[Smart Contracts/Facets/CLOBMEVFacet]] — Commit-reveal MEV protection
  - [[Smart Contracts/Facets/CLOBAdminFacet]] — Admin controls, fee config, circuit breakers
  - [[Smart Contracts/Facets/CLOBLogisticsFacet]] — ECDSA-verified driver logistics system ⭐ new
  - [[Smart Contracts/Facets/OrderRouterFacet]] — Single entry point for all orders ⭐ recommended
  - [[Smart Contracts/Facets/NodesFacet]] — Node registry & capacity management
  - [[Smart Contracts/Facets/AuSysFacet]] — Logistics orchestration
  - [[Smart Contracts/Facets/BridgeFacet]] — CLOB ↔ Logistics bridge
  - [[Smart Contracts/Facets/RWYStakingFacet]] — Real World Yield staking
  - [[Smart Contracts/Facets/OperatorFacet]] — Operator permissions & reputation
- **Libraries**
  - [[Smart Contracts/Libraries/DiamondStorage]] — Unified storage layout
  - [[Smart Contracts/Libraries/CLOBLib]] — CLOB utility functions

### Core Concepts

- [[Core Concepts/Real World Asset Tokenisation]] — How physical assets become tokens
- [[Core Concepts/Order Lifecycle]] — CLOB order from placement to settlement
- [[Core Concepts/Journey and Logistics]] — Physical delivery system
- [[Core Concepts/Node Network]] — Storage and logistics infrastructure
- [[Core Concepts/CLOB Trading]] — Central Limit Order Book mechanics
- [[Core Concepts/AMM Liquidity Pools]] — Passive liquidity and LP token mechanics
- [[Core Concepts/RWY Staking]] — Real World Yield opportunities
- [[Core Concepts/P2P Trading]] — Direct peer-to-peer trades

### User Roles

- [[Roles/Customer]] — Buy, trade, and stake as a customer
- [[Roles/Node Operator]] — Run a storage/logistics node
- [[Roles/Driver]] — Transport physical assets and earn bounties

### Frontend

- [[Frontend/Application Structure]] — Next.js app architecture
- [[Frontend/Providers]] — React context providers and their responsibilities
- [[Frontend/Pages Reference]] — Full route map of the application

### Indexer

- [[Indexer/Ponder Setup]] — Event indexer configuration
- [[Indexer/Schema and Queries]] — GraphQL schema and query patterns

### Public API

- [[Public API/Aurellion Core API Contract]] — Public HTTP contract for `aurellion-core`

### Technical Reference

- [[Technical Reference/Developer Quickstart]] — Working code examples for every operation ⭐ start here
- [[Technical Reference/FAQ]] — Common questions answered
- [[Technical Reference/Events Reference]] — All contract events
- [[Technical Reference/Error Reference]] — All custom errors with fix guidance
- [[Technical Reference/Order Status Reference]] — All status enums across all systems
- [[Technical Reference/Fee Structure]] — Every fee: rate, recipient, formula
- [[Technical Reference/Deployment]] — Live contract addresses and deployment history
- [[Technical Reference/Security Model]] — Threat model, access control, reentrancy, MEV
- [[Technical Reference/Gas Optimisation]] — PackedOrder, RB trees, batch calls, cost reference
- [[Technical Reference/Testing Guide]] — Hardhat, Foundry, Vitest, Playwright
- [[Technical Reference/Upgrading Facets]] — Safe upgrade playbook
- [[Technical Reference/Contract ABIs]] — ABI sources, TypeChain, encoding
- [[Technical Reference/Troubleshooting]] — Common errors and how to fix them

### Reference

- [[Glossary]] — A-Z of every term in the codebase

---

## ⚡ Quick Reference

| Concept                | Description                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- |
| **Diamond**            | `0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7` — single proxy for all interactions |
| **OrderRouterFacet**   | Recommended entry point for all order placement                                  |
| **AssetsFacet**        | Mints and manages ERC-1155 RWA tokens                                            |
| **CLOB**               | Central Limit Order Book — price-time priority matching                          |
| **Node**               | Verified physical storage location that mints and holds assets                   |
| **Driver**             | Registered courier that transports assets between nodes                          |
| **Journey**            | A single leg of physical delivery from sender to receiver                        |
| **Unified Order**      | Links a matched CLOB trade to physical logistics                                 |
| **RWY**                | Real World Yield — stake commodities for processing profits                      |
| **CLOBLogisticsFacet** | ECDSA-verified GPS-proof delivery system                                         |
| **Ponder**             | Event indexer powering the GraphQL query layer                                   |
| **Quote Token**        | AURA on testnet, USDC on mainnet                                                 |

---

## 🔢 Numbers at a Glance

| Metric                  | Value                         |
| ----------------------- | ----------------------------- |
| Network                 | Base Sepolia (Chain ID 84532) |
| Diamond deployed        | Block 36,030,424 (2026-01-08) |
| Total facets            | 21                            |
| Taker fee               | 0.1%                          |
| Maker fee               | 0.05%                         |
| Driver bounty           | 2% of order value             |
| Protocol delivery fee   | 0.25%                         |
| RWY protocol cut        | 1% of profit                  |
| Max journeys per order  | 10                            |
| Max nodes per order     | 20                            |
| Commit-reveal threshold | 10,000 quote tokens           |
| PackedOrder slots       | 3 (vs 10 in V1)               |

---

## 🔗 External Links

- [EIP-2535 Diamond Standard](https://eips.ethereum.org/EIPS/eip-2535)
- [Base Sepolia Explorer](https://sepolia.basescan.org)
- [Diamond: 0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7](https://sepolia.basescan.org/address/0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7)
- [Indexer GraphQL](https://indexer.aurellionlabs.com/graphql)
- [Aurellion Core Public API](https://prod-aurellion-core.up.railway.app)
- [OpenZeppelin ERC-1155](https://docs.openzeppelin.com/contracts/erc1155)
- [Ponder Docs](https://ponder.sh)
- [Base Documentation](https://docs.base.org)

---

_Documentation generated from the live codebase — 57 files, ~12,000 lines._
