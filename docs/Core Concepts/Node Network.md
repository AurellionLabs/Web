---
tags: [concepts, nodes, network, infrastructure]
---

# Node Network

[[🏠 Home]] > Core Concepts > Node Network

Aurellion's node network is the physical infrastructure layer of the protocol. Nodes are verified storage and logistics locations that anchor real-world assets to the blockchain, provide custody, and enable the transfer of physical goods.

---

## What is a Node?

A **node** is a physical location operated by a registered entity that:

1. **Stores** physical commodities (warehouses, farms, markets, distribution centres)
2. **Mints** ERC-1155 tokens representing the goods they hold
3. **Lists** tokens for sale on the CLOB
4. **Participates** in the logistics chain as senders/receivers of journeys
5. **Earns fees** from order processing and logistics participation

---

## Node Types

| Type        | Description                   | Example                              |
| ----------- | ----------------------------- | ------------------------------------ |
| `WAREHOUSE` | General storage facility      | Urban logistics hub                  |
| `FARM`      | Agricultural production       | Livestock farm, crop field           |
| `MARKET`    | Trading hub with storage      | Livestock market, commodity exchange |
| `PROCESSOR` | Processing and transformation | Grain mill, abattoir                 |
| `PORT`      | Import/export terminal        | Shipping port facility               |
| `CUSTOM`    | Any other type                | Defined by operator                  |

---

## Node Registration Flow

```
Operator decides to join Aurellion
        │
        ▼
1. Register node: NodesFacet.registerNode(nodeType, capacity, lat, lng, addressName)
   → nodeHash generated (bytes32)
   → active=true, validNode=false
   → NodeRegistered event
        │
        ▼
2. Admin validates node (off-chain verification: location, capacity, legitimacy)
   → NodesFacet.validateNode(nodeHash)
   → validNode=true
        │
        ▼
3. Operator adds supported asset types:
   → NodesFacet.addSupportedAsset(nodeHash, token, tokenId, price, capacity)
   → SupportedAssetAdded event
        │
        ▼
4. Operator mints first tokens:
   → AssetsFacet.nodeMint(account, assetDef, amount, className, "")
   → MintedAsset event
        │
        ▼
5. Operator lists tokens on CLOB:
   → OrderRouterFacet.placeNodeSellOrder(...)
        │
        ▼
Node is now active and generating revenue
```

---

## Node Asset Inventory

Nodes maintain two types of inventory:

### External Inventory (ERC-1155 balances)

Standard ERC-1155 balance tracked in `erc1155Balances[tokenId][nodeAddress]`. This is the public balance visible to any ERC-1155 query.

### Internal Inventory (Node Token Balances)

An additional internal accounting layer tracked in:

```solidity
nodeTokenBalances[nodeHash][tokenId] = uint256
```

This tracks tokens that are "in the Diamond" under the node's management — used for:

- Validating node sell orders (`placeNodeSellOrder` checks this)
- Inter-node transfers
- Custody without requiring ERC-1155 transfers

---

## Multi-Node Ownership

An operator can own multiple nodes:

```
ownerNodes[operatorAddress] = [nodeHash1, nodeHash2, nodeHash3]
```

Each node has independent:

- Capacity tracking
- Asset support list
- Token inventory
- Location data

---

## Capacity Management

Each supported asset has a capacity:

```
NodeAsset {
  token: 0xABC...     (ERC-1155 contract)
  tokenId: 1          (asset type)
  price: 500 USDC     (per unit)
  capacity: 100       (available units)
}
```

When an order is placed against a node:

1. `reduceCapacityForOrder(nodeHash, token, tokenId, amount)` is called
2. Capacity decrements atomically: `capacity -= amount`
3. If `capacity < amount`: transaction reverts

Capacity is replenished by:

- Minting new tokens (when new physical goods arrive)
- Cancelling orders (capacity restored)
- Manual update via `updateNodeCapacity()`

---

## Fee Distribution

When an order is settled via `AuSysFacet.settleOrder()`, the 2% transaction fee is distributed proportionally across all nodes involved in the order's journey chain:

```
txFee = orderValue × 2% = 200 USDC (for a 10,000 USDC order)

Nodes in order: [Node A, Node B, Node C]
Each node receives: 200 / 3 ≈ 66.67 USDC
```

This incentivises nodes to participate in complex multi-hop deliveries.

---

## Supporting Documents

Nodes can attach compliance documents on-chain:

```typescript
type SupportingDocument = {
  url: string; // IPFS link or HTTPS URL
  title: string;
  description: string;
  documentType: string; // "LICENCE", "INSURANCE", "CERTIFICATE", "PHOTO"
  isFrozen: boolean; // Frozen docs cannot be removed
  timestamp: number;
  addedBy: string;
};
```

Documents are immutable if `isFrozen=true`. This enables regulatory compliance proof that cannot be deleted after the fact.

---

## Node Analytics

The Ponder indexer aggregates node data for the explorer:

```graphql
query NodeOverview($nodeHash: String!) {
  nodeRegisteredEventss(where: { nodeHash: $nodeHash }) {
    items {
      owner
      nodeType
      block_timestamp
    }
  }

  supportedAssetAddedEventss(where: { nodeHash: $nodeHash }) {
    items {
      token
      tokenId
      price
      capacity
    }
  }

  nodeFeeDistributedEventss(where: { node: $nodeHash }) {
    items {
      amount
      block_timestamp
    }
  }
}
```

---

## Node Explorer

The frontend's node explorer (`/node/explorer`) displays:

- Map view with all registered nodes (GPS coordinates)
- Node details: type, owner, supported assets, capacity
- Order history for each node
- Real-time availability

---

## Revenue Model for Node Operators

| Revenue Source          | Amount                  | When                           |
| ----------------------- | ----------------------- | ------------------------------ |
| CLOB sell orders        | Market price × quantity | When sell order fills          |
| Node fee share          | 2% txFee ÷ nodes        | When order settles             |
| RWY staking             | Yield from processing   | When RWY opportunity completes |
| Logistics participation | Part of bounty          | Per journey as sender/receiver |

---

## Related Pages

- [[Smart Contracts/Facets/NodesFacet]]
- [[Smart Contracts/Facets/AssetsFacet]]
- [[Core Concepts/Real World Asset Tokenisation]]
- [[Roles/Node Operator]]
- [[Frontend/Pages Reference]]
