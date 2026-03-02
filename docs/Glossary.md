---
tags: [glossary, reference, terminology]
---

# Glossary

[[🏠 Home]] > Glossary

Definitions for all terms used across Aurellion documentation and codebase.

---

## A

**AppStorage**
The single unified storage struct used by all Diamond facets. Accessed at a fixed storage slot (`keccak256('diamond.app.storage')`). See [[Smart Contracts/Libraries/DiamondStorage]].

**AURA Token**
The ERC-20 utility token on testnet (`0xe727f09fd8...`). Used as the quote token for CLOB trading on Base Sepolia. Will be replaced by USDC on mainnet.

**AuraAsset**
The ERC-1155 token contract for real-world assets. Now implemented as [[Smart Contracts/Facets/AssetsFacet]] within the Diamond.

**AuSys**
The logistics management system. Now implemented as [[Smart Contracts/Facets/AuSysFacet]] within the Diamond.

**AuStake**
The legacy staking contract. Superseded by [[Smart Contracts/Facets/RWYStakingFacet]].

**AurumNodeManager**
The legacy node registry contract. Superseded by [[Smart Contracts/Facets/NodesFacet]].

**Ask**
A sell order in the CLOB — the seller's asking price for an asset.

---

## B

**Base Sepolia**
Ethereum L2 testnet where Aurellion is currently deployed. Chain ID: 84532. [Explorer](https://sepolia.basescan.org).

**Bid**
A buy order in the CLOB — the buyer's offered price for an asset.

**Bounty**
ERC-20 payment made to a driver upon successful delivery. Set at 2% of the order value. Paid immediately when `handOff()` is called.

**BridgeFacet**
The facet that connects CLOB trades to physical logistics. Creates [[#Unified Order|UnifiedOrders]] and handles settlement. See [[Smart Contracts/Facets/BridgeFacet]].

---

## C

**Circuit Breaker**
An automatic market pause triggered when price movement exceeds a configured threshold. Protects against extreme volatility and manipulation. Managed by `CLOBAdminFacet`.

**Class**
An asset category (e.g., `LIVESTOCK`, `GRAIN`, `GEMSTONE`). Must be activated on-chain before assets of that class can be minted. Managed via `AssetsFacet.addSupportedClass()`.

**CLOB**
Central Limit Order Book. A trading mechanism where buy and sell orders are collected and matched by price-time priority. See [[Core Concepts/CLOB Trading]].

**CLOBCoreFacet**
Handles order placement and cancellation. See [[Smart Contracts/Facets/CLOBCoreFacet]].

**CLOBMatchingFacet**
The matching engine — finds counterpart orders and executes trades. See [[Smart Contracts/Facets/CLOBMatchingFacet]].

**Commit-Reveal**
A two-phase MEV protection mechanism for large orders. The trader commits a hash of their order, then reveals the actual parameters after a minimum block delay.

**Custody**
Physical control of an asset, tracked on-chain. When a node mints tokens, it becomes the custodian. Tracked in `tokenCustodianAmounts[tokenId][nodeAddress]`.

**Customer**
A user who buys, trades, or stakes assets. No special permissions required. See [[Roles/Customer]].

---

## D

**Diamond**
The EIP-2535 proxy contract at `0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7` (Base Sepolia). The single address through which all Aurellion smart contract interactions occur. See [[Architecture/Diamond Proxy Pattern]].

**DiamondCut**
The upgrade mechanism. `diamondCut()` adds, replaces, or removes function selectors from the Diamond's routing table.

**DiamondStorage**
Library that defines the `AppStorage` struct and the accessor function. See [[Smart Contracts/Libraries/DiamondStorage]].

**DISPATCHER_ROLE**
Permission that allows an address to assign drivers to journeys via `AuSysFacet.assignDriverToJourney()`.

**Driver**
A registered courier who transports physical assets between nodes and earns bounties. See [[Roles/Driver]].

**DRIVER_ROLE**
Permission that allows an address to be assigned journeys and call logistics functions.

---

## E

**EIP-2535**
Ethereum Improvement Proposal defining the Diamond proxy standard. Enables a single contract address to route calls to multiple implementation facets. [Spec](https://eips.ethereum.org/EIPS/eip-2535).

**ERC-1155**
Multi-token standard used for Aurellion's real-world asset tokens. A single contract can hold many token types. See [[Smart Contracts/Facets/AssetsFacet]].

**ERC-20**
Fungible token standard used for the quote token (USDC/AURA) in CLOB trading and for bounty/settlement payments.

**Escrow**
Funds locked in the Diamond contract pending settlement. Created when a buyer initiates a trade. Released upon delivery or refunded on cancellation.

**ETA**
Estimated Time of Arrival. A Unix timestamp stored on-chain with each journey representing the expected delivery time.

---

## F

**Facet**
An implementation contract within the Diamond architecture. Facets hold logic; the Diamond holds state. Examples: `AssetsFacet`, `CLOBCoreFacet`, `AuSysFacet`.

**Fee Recipient**
The address that receives protocol fees (0.25% of order value). Defaults to contract owner; configurable via `BridgeFacet`.

**Fill**
When a CLOB order matches with a counterpart order. A partial fill leaves remaining quantity in the book. A full fill removes the order.

**FOK (Fill or Kill)**
Time-In-Force option: the order must be entirely filled in one match or the entire transaction reverts.

---

## G

**GTC (Good Till Cancelled)**
Time-In-Force option: the order stays in the book until it is fully filled or manually cancelled by the maker.

**GTD (Good Till Date)**
Time-In-Force option: the order is automatically cancelled at the specified `expiry` timestamp.

---

## H

**handOff()**
Function called by a driver to complete delivery, collect bounty, and transition a journey to DELIVERED.

**Hash (Asset)**
`keccak256(abi.encode(account, assetDefinition))`. Unique identifier per mint event. Used for IPFS metadata linking and custody tracking.

---

## I

**IOC (Immediate Or Cancel)**
Time-In-Force option: fills as much as possible immediately, cancels any unfilled remainder.

**IPFS**
InterPlanetary File System. Used to store asset metadata (photos, certificates, weight records). Content-addressed via the mint hash.

---

## J

**Journey**
A single physical delivery leg from a sender to a receiver. One order can have up to 10 journeys for multi-hop routes. See [[Core Concepts/Journey and Logistics]].

---

## L

**Liquidity Pool**
An AMM pool that provides passive buy/sell liquidity for a token pair. LP token holders earn fees from trades routed through the pool.

**LP Token**
Fungible token representing a share of an AMM liquidity pool. Redeemable for the underlying assets proportionally.

---

## M

**Maker**
An order that rests in the order book and provides liquidity. Pays maker fee (0.05%).

**Market**
A trading pair defined by `(baseToken, baseTokenId, quoteToken)`. Identified by `keccak256(baseToken, baseTokenId, quoteToken)`.

**Mint Hash**
See [[#H|Hash (Asset)]].

**MEV (Maximal Extractable Value)**
Profit from reordering/inserting transactions. Mitigated in Aurellion's CLOB by commit-reveal for large orders and rate limiting.

---

## N

**Node**
A verified physical location (warehouse, farm, market) that can store, mint, and transfer physical assets. See [[Core Concepts/Node Network]] and [[Roles/Node Operator]].

**nodeHash**
`keccak256(owner, block.timestamp, nodeType)`. Unique identifier for a registered node.

**NodesFacet**
Manages node registration, validation, capacity, and asset support. See [[Smart Contracts/Facets/NodesFacet]].

---

## O

**Operator**
An approved entity that creates RWY opportunities (processors, manufacturers). Requires admin approval and collateral posting.

**Order (AuSys)**
A physical delivery order created in `AuSysFacet`. Tracks the logistics lifecycle with up to 10 journeys.

**Order (CLOB)**
A buy or sell limit/market order in the CLOB order book. Tracked as a `PackedOrder` in Diamond storage.

**OrderRouterFacet**
The recommended single entry point for all CLOB order operations. See [[Smart Contracts/Facets/OrderRouterFacet]].

---

## P

**P2P (Peer-to-Peer)**
Direct trading between two parties without the CLOB order book. See [[Core Concepts/P2P Trading]].

**PackedOrder**
Gas-optimised order storage struct using 3 EVM slots instead of 10+. Used in the V2 CLOB. See [[Smart Contracts/Facets/CLOBCoreFacet]].

**packageSign()**
Function called by sender or driver to record custody handoff signature. Both signatures required to transition a journey to IN_TRANSIT.

**ParcelData**
Struct containing geographic routing data for a delivery: `{startLat, startLng, endLat, endLng, startName, endName}`.

**Ponder**
TypeScript event indexer that listens to Diamond events and exposes a GraphQL API. See [[Indexer/Ponder Setup]].

**Price Level**
All orders at the same price in the CLOB. Managed as a FIFO queue within a Red-Black Tree node.

**Protocol Fee**
0.25% of order value taken at settlement. Sent to `feeRecipient`.

---

## Q

**Quote Token**
The ERC-20 token used as currency in CLOB trading (AURA on testnet, USDC planned for mainnet).

---

## R

**RBAC (Role-Based Access Control)**
Permission system using roles: `ADMIN_ROLE`, `DRIVER_ROLE`, `DISPATCHER_ROLE`. Stored in `ausysRoles[role][address]`.

**Red-Black Tree**
Self-balancing binary search tree used for O(log n) price level management in the CLOB V2. Provides best-price lookup without scanning the entire order book.

**Repository**
TypeScript class that abstracts data access. Reads from Ponder (GraphQL) for historical data and from the blockchain for real-time state. See [[Frontend/Providers]].

**RWA (Real-World Asset)**
A physical commodity represented as an on-chain token. Examples: livestock, grain, gemstones.

**RWY (Real World Yield)**
Staking mechanism where physical-asset tokens are committed to processing operations for yield. See [[Core Concepts/RWY Staking]].

---

## S

**Seller**
Party selling tokens in a trade. In a node context, the node operator listing assets on the CLOB.

**Settlement**
Final distribution of funds and tokens upon order completion. Seller receives payment, buyer receives tokens, driver receives bounty.

**Spread**
Difference between best ask and best bid prices. Indicates market liquidity — tight spread = liquid market.

---

## T

**Taker**
An order that matches against an existing resting order, consuming liquidity. Pays taker fee (0.1%).

**Token ID**
`uint256(keccak256(abi.encode(assetDefinition)))`. Deterministic ERC-1155 token identifier. Same asset definition always produces the same token ID regardless of minting node.

**TIF (Time-In-Force)**
Controls how long an order remains active. Options: GTC, IOC, FOK, GTD.

**txFee**
2% of order value charged by AuSys. Distributed proportionally across all nodes involved in the delivery chain.

---

## U

**Unified Order**
A `UnifiedOrder` struct in `BridgeFacet` that links a CLOB trade to a physical logistics order and tracks the combined lifecycle from trade match to physical settlement. See [[Core Concepts/Order Lifecycle]].

---

## V

**validNode**
Boolean flag in the `Node` struct. Set to `true` by admin after physical verification. Required for token minting via `nodeMint()`.

---

## W

**Wallet**
EVM-compatible wallet used to interact with Aurellion. Connected via Privy (supports MetaMask, Coinbase, embedded wallets).

---

## Related Pages

- [[🏠 Home]]
- [[Architecture/System Overview]]
- [[Smart Contracts/Overview]]
