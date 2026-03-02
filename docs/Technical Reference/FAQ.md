---
tags: [reference, faq, questions]
---

# Frequently Asked Questions

[[🏠 Home]] > Technical Reference > FAQ

---

## General

### What is Aurellion?

Aurellion is a decentralised marketplace for **real-world assets (RWA)** — physical commodities like livestock, grain, and gemstones. It lets anyone tokenise physical goods, trade them on a Central Limit Order Book (CLOB), and receive physical delivery — all trustlessly on-chain.

### What blockchain does Aurellion use?

Currently deployed on **Base Sepolia** (testnet, chain ID 84532). Base is an Ethereum L2 built by Coinbase using the Optimism stack — fast, cheap, and EVM-compatible.

### Do I need to know about blockchain to use Aurellion?

As a user, no. Privy's embedded wallets let you sign up with email or Google and have a wallet auto-created. Transactions are abstracted behind simple "Buy" and "Sell" buttons.

As an integrator, yes — you'll be working with ethers.js/viem, ERC-1155, and EVM basics.

---

## Trading

### What is the CLOB?

A Central Limit Order Book — the same market structure used by NYSE and Nasdaq, but fully on-chain. Buyers post bids, sellers post asks, and they match at the best available price in time-priority order.

### What's the difference between the CLOB and a P2P trade?

The **CLOB** is an open market where any buyer can match any seller. Prices are discovered through competition.

**P2P** is a direct trade between two specific addresses — useful when you've already agreed on a price off-chain and just need on-chain settlement.

### What's a Unified Order?

When a CLOB trade requires physical delivery, a **Unified Order** is created to track the combined lifecycle: from trade match → logistics setup → physical delivery → settlement. It links the digital trade to the physical journey.

### Can I sell tokens without physical delivery?

Yes. If both buyer and seller agree tokens can be transferred digitally (e.g., the buyer is at the same node), physical delivery can be skipped and tokens transferred directly. The logistics bridge is optional.

### What tokens can I trade?

Any token class that Aurellion admin has activated (e.g., LIVESTOCK, GRAIN, GEMSTONE). Each class can have multiple specific assets within it. All are ERC-1155 tokens.

### What is the quote token?

On testnet: **AURA** token (18 decimals, get it from the faucet at `/customer/faucet`).
On mainnet: **USDC** (6 decimals). All prices and payments are in the quote token.

---

## Nodes

### What do I need to become a Node Operator?

1. A physical storage location (warehouse, farm, market)
2. GPS coordinates and location name
3. Off-chain verification by the Aurellion team
4. Relevant licences (livestock dealer, warehouse operator, etc.)

Once registered and validated, you can mint tokens representing goods you hold in custody.

### Can one wallet own multiple nodes?

Yes. Each node gets a unique `nodeHash` and all are linked to `ownerNodes[yourAddress]`.

### What happens if a node goes offline?

The node's assets remain on-chain. Open orders stay in the CLOB. In-progress journeys continue with their assigned drivers. The node operator's reputation may be affected but there's no automatic slashing.

### How are node fees calculated?

2% of the order value (`txFee`) is split equally across all nodes listed in the order's `nodes[]` array. More nodes = smaller individual share.

---

## Drivers

### How do I become a driver?

You must be granted `DRIVER_ROLE` by an Aurellion admin — contact the team with proof of identity and transport capability.

### When do drivers get paid?

Immediately when `handOff(journeyId)` is called and the transaction confirms. No waiting for full order settlement.

### What if a delivery is disputed?

The admin can freeze the journey and investigate. Funds remain escrowed until resolution. The `CLOBLogisticsFacet` has an explicit `disputeOrder()` function with an on-chain reason field.

### Can a driver have multiple active journeys?

Yes, up to `MAX_DRIVER_JOURNEYS = 10` concurrent journeys.

---

## RWY Staking

### What makes RWY yield different from DeFi yields?

RWY yield comes from **real economic activity** — a grain processor milling wheat into flour, or livestock being processed. The profit is the difference between raw commodity value and processed product sale price. No token inflation, no lending — actual revenue from physical transformation.

### Can I lose money staking in RWY?

If the processed goods sell for less than the commodity's value (market decline), you may receive a lower yield than promised. The contract pays you based on **actual proceeds**, not promised yield. Principal is only at risk in extreme cases (operator fraud — mitigated by collateral requirement).

### What happens if an operator doesn't process the goods?

The opportunity can be cancelled by the owner, and all stakers receive their tokens back in full. Operators must post collateral (minimum 20% of opportunity value) that can be slashed.

### How is profit split?

```
Total profit → 1% to protocol → remaining split proportionally to stake size
```

If you staked 20% of the total, you receive 20% of 99% of the total profit.

---

## Technical

### Why use a Diamond proxy instead of standard upgradeable contracts?

The Diamond (EIP-2535) removes the 24KB size limit by splitting logic across multiple facets, allows surgical per-function upgrades without replacing the entire contract, and gives better organisation of large protocol codebases. See [[Architecture/Diamond Proxy Pattern]].

### How does the indexer work?

**Ponder** listens to all Diamond events and writes them to PostgreSQL. The frontend queries this via GraphQL instead of hitting the RPC directly — much faster and cheaper. See [[Indexer/Ponder Setup]].

### Are smart contract upgrades possible?

Yes. The Diamond owner can call `diamondCut()` to add, replace, or remove facets. All upgrades are transparent on-chain. AppStorage layout must remain backward compatible (append-only). See [[Technical Reference/Upgrading Facets]].

### Where is the source code?

The full codebase is in `/Users/aurellius/Documents/Web/` (private repo). Public GitHub link TBD at mainnet launch.

### Is there an audit?

Not yet — required before mainnet launch. Priority facets for audit: BridgeFacet, CLOBMatchingFacet, AuSysFacet, RWYStakingFacet. See [[Technical Reference/Security Model]].

---

## Fees

### What are the trading fees?

- Taker: 0.1% of trade value
- Maker: 0.05% of trade value
- Physical delivery bounty: 2% (to driver)
- Protocol fee on delivery: 0.25%
- RWY protocol cut: 1% of profits

Full breakdown: [[Technical Reference/Fee Structure]].

### Who receives the fees?

| Fee                   | Recipient                                        |
| --------------------- | ------------------------------------------------ |
| CLOB trading fees     | Accumulated in Diamond, withdrawn by owner       |
| LP fees               | Proportionally to liquidity providers            |
| Driver bounty         | Directly to driver on delivery                   |
| Protocol delivery fee | `feeRecipient` address (default: contract owner) |
| Node txFee            | Split across all nodes in the order              |
| RWY protocol cut      | Protocol treasury                                |

---

## Related Pages

- [[🏠 Home]]
- [[Glossary]]
- [[Technical Reference/Developer Quickstart]]
- [[Core Concepts/CLOB Trading]]
- [[Core Concepts/RWY Staking]]
