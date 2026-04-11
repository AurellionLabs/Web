---
tags: [concepts, tokenisation, rwa, erc1155, assets]
---

# Real World Asset Tokenisation

[[🏠 Home]] > Core Concepts > Real World Asset Tokenisation

Aurellion's tokenisation system converts physical commodities into on-chain ERC-1155 tokens. This page explains how an asset moves from the physical world to a tradeable digital representation — and back.

---

## What Can Be Tokenised?

Aurellion supports any commodity that can be classified and attributed. Currently defined classes include:

| Class       | Examples               | Attributes                               |
| ----------- | ---------------------- | ---------------------------------------- |
| `Metals`    | Gold, Silver, Cobalt   | weight, Oz, weight                       |
| `LIVESTOCK` | Goat, Sheep, Cow       | breed, age, weight, health cert          |
| `GRAIN`     | Wheat, Maize, Rice     | variety, moisture %, grade, harvest date |
| `GEMSTONE`  | Diamond, Ruby, Emerald | carat, cut, clarity, colour, cert ID     |
| `PRODUCE`   | Coffee, Cocoa, Spice   | origin, grade, processing method         |

New classes are added by the contract owner via `AssetsFacet.addSupportedClass()`.
Applications can be made for new classes.

---

## The Tokenisation Flow

```
Physical asset exists (e.g., 10 Oz of Gold at Node X, Nairobi)
         │
         ▼ Node operator intiates minting tokenized gold
         │
         ▼ ERC-1155 tokens minted:
         │
         ▼ Node ownership and custody established:
         │
         │
         ▼ Events emitted:
            MintedAsset(account, hash, tokenId, name, assetClass, className)
            CustodyEstablished(tokenId, account, amount)
         │
         ▼ Indexer picks up MintedAsset → assets table
         │
Tokens appears in node's dashboard
```

---

## Asset Definition Structure

An `AssetDefinition` carries the full description of the physical asset:

```solidity
struct AssetDefinition {
    string name;          // E.g., "East African Goat Grade A"
    string assetClass;    // E.g., "LIVESTOCK"
    Attribute[] attributes;
}

struct Attribute {
    string name;          // E.g., "breed"
    string[] values;      // E.g., ["Boer", "Nubian", "Kalahari Red"]
    string description;   // E.g., "Breed classification per FAO standards"
}
```

When a node mints, it selects a specific value for each attribute from the allowed `values` array. This creates a precise, standardised description that another party can verify.

---

## Token ID Determinism

The same `AssetDefinition` struct always produces the same token ID:

```
tokenId = uint256(keccak256(abi.encode(assetDefinition)))
```

This means:

- Two nodes minting the same type of asset get the same token ID
- Token IDs are globally consistent — 10 East African Grade A Goats from Kenya and 10 from Tanzania with matching attributes share a token ID
- This enables cross-node liquidity: a buyer can trade any token of the same ID regardless of origin

However, each minting event produces a unique **mint hash** (`keccak256(account, assetDefinition)`), which tracks which node minted which tokens.

---

## Custody Model

Custody represents physical control. In Aurellion:

- When tokens are minted, the minting node becomes the **custodian**
- Custody is tracked per-custodian: `tokenCustodianAmounts[tokenId][nodeAddress]`
- The total custody across all custodians: `tokenCustodyAmount[tokenId]`
- When goods are transferred to another node, custody updates

### Custody Events

| Situation        | Event                                                   |
| ---------------- | ------------------------------------------------------- |
| Tokens minted    | `CustodyEstablished(tokenId, custodian, amount)`        |
| Custody released | `CustodyReleased(tokenId, custodian, amount, redeemer)` |

---

## IPFS Metadata

Each mint hash is recorded in the `ipfsID` array. Off-chain metadata (photos, certificates, weight records) is stored on IPFS and linked via the token URI system:

```
tokenURI = baseURI + tokenId
```

The `erc1155URI` is set by the contract owner and points to an IPFS gateway or metadata API. Node operators upload supporting documents via `NodesFacet.addSupportingDocument()`.

---

## Multi-Node Minting

Multiple nodes can mint the same token ID (same asset definition). Each maintains separate custody:

```
Node Nairobi mints 10x tokenId=0xABC  → custodianAmounts[0xABC][nairobi] = 10
Node Mombasa mints 10x tokenId=0xABC  → custodianAmounts[0xABC][mombasa] = 10
Total supply tokenId=0xABC = 20
```

A buyer purchasing 5x tokenId=0xABC gets them from whichever node filled their CLOB order.

---

## From Token Back to Physical Asset

Settlement closes the loop:

1. Tokens are held in contract and can be traded.
2. User redeems tokens
3. Physical asset transported
4. Upon delivery, tokens transfer to users wallet

---

---

## Related Pages

- [[Smart Contracts/Facets/AssetsFacet]]
- [[Smart Contracts/Facets/NodesFacet]]
- [[Core Concepts/Node Network]]
- [[Core Concepts/Order Lifecycle]]
- [[Roles/Node Operator]]
