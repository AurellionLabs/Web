---
tags: [roles, node, operator, infrastructure]
---

# Node Operator Role

[[🏠 Home]] > Roles > Node Operator

A **Node Operator** runs a physical location (warehouse, farm, market, processing facility) that participates in the Aurellion network. They are the bridge between the physical world and the blockchain — they hold real goods, mint tokens, and facilitate deliveries.

---

## Prerequisites

Before operating a node:

1. ✅ Physical location with verifiable address and GPS coordinates
2. ✅ Sufficient storage capacity for declared assets
3. ✅ Relevant licences (livestock dealer, warehouse operator, etc.)
4. ✅ Ability to provide supporting documents
5. ✅ Verified by Aurellion admin (off-chain process)

---

## Node Operator Routes

| Route                               | Description                            |
| ----------------------------------- | -------------------------------------- |
| `/node/dashboard`                   | Main node operator interface           |
| `/node/dashboard/assets/edit-price` | Update asset prices                    |
| `/node/register`                    | Register a new node                    |
| `/node/explorer`                    | Browse all nodes in the network        |
| `/node/overview`                    | Summary of all your nodes              |
| `/node/[nodeId]/orders`             | Orders associated with a specific node |
| `/node/rwy`                         | Your RWY opportunities                 |
| `/node/rwy/create`                  | Create a new RWY opportunity           |

---

## Getting Started

### 1. Register Node

```
Navigate to /node/register
Fill in:
  - Node type (WAREHOUSE, FARM, MARKET, ...)
  - Storage capacity
  - GPS coordinates (lat, lng)
  - Location name
  - Upload supporting documents

Call: NodesFacet.registerNode(nodeType, capacity, lat, lng, addressName)
→ nodeHash returned
→ Status: active=true, validNode=false (pending admin validation)
```

### 2. Await Validation

Aurellion admin reviews your application and physical location. Once approved:

```
Admin calls: NodesFacet.validateNode(nodeHash)
→ validNode=true
→ You can now mint tokens!
```

### 3. Declare Supported Assets

```
For each asset type you store:
NodesFacet.addSupportedAsset(nodeHash, tokenAddress, tokenId, pricePerUnit, capacity)

Example: 100 East African Goats at 500 USDC each
addSupportedAsset(nodeHash, auraAssetContract, goatTokenId, 500e18, 100)
```

### 4. Mint Tokens

```
When physical goods arrive at your node:
AssetsFacet.nodeMint(
  account: yourAddress,
  asset: AssetDefinition{name, assetClass, attributes},
  amount: 10,
  className: "LIVESTOCK",
  data: "0x"
)
→ ERC-1155 tokens minted to your address
→ Custody established
```

### 5. List on CLOB

```
OrderRouterFacet.placeNodeSellOrder(
  nodeOwner: yourAddress,
  baseToken: auraAssetContract,
  baseTokenId: goatTokenId,
  quoteToken: usdcAddress,
  price: 500e18,
  amount: 10,
  timeInForce: 0,  // GTC
  expiry: 0
)
→ Sell order in the CLOB at 500 USDC per goat
→ Buyers can now purchase
```

---

## Managing Orders

When a buyer purchases your listed tokens:

1. **Match occurs** — CLOB records trade
2. **UnifiedOrder created** — buyer initiates logistics
3. **createLogisticsOrder** — you (seller) trigger journey creation
4. **Journey assigned** — dispatcher assigns driver
5. **Sign for handoff** — call `packageSign(journeyId)` as sender
6. **Driver collects** — after driver signs, journey goes IN_TRANSIT
7. **Settlement** — once delivered, you receive payment

**Important:** Until you call `createLogisticsOrder()`, the buyer cannot proceed. Monitor your dashboard for pending orders.

---

## Asset and Price Management

### Update Prices

```
Via UI: /node/dashboard/assets/edit-price
Or directly: updateSupportedAssets(nodeHash, updatedAssetsArray)
```

### Update Capacity

```
When new stock arrives:
NodesFacet.updateNodeCapacity(nodeHash, [newQuantity1, newQuantity2, ...])
```

### Add New Asset Types

```
NodesFacet.addSupportedAsset(nodeHash, token, tokenId, price, capacity)
```

---

## Token Inventory Management

Tokens inside the Diamond system are tracked in the node's internal balance:

```
Deposit: NodesFacet.depositTokensToNode(nodeHash, tokenId, amount)
  → Moves tokens from your wallet into Diamond under your node

Withdraw: NodesFacet.withdrawTokensFromNode(nodeHash, tokenId, amount, recipient)
  → Moves tokens from Diamond back to a wallet

Transfer between nodes: NodesFacet.transferTokensBetweenNodes(fromNode, toNode, tokenId, amount)
  → Useful for multi-location operations
```

---

## Revenue Streams

| Source            | How                             | Amount                          |
| ----------------- | ------------------------------- | ------------------------------- |
| **CLOB Sales**    | When sell orders fill           | Market price × quantity         |
| **Node fee**      | Per settled order               | txFee / number of nodes         |
| **RWY**           | Create processing opportunities | Yield from operation profits    |
| **Logistics fee** | As sender in journeys           | Indirectly via order settlement |

---

## Running a Multi-Node Operation

Large operators can run multiple nodes:

```
ownerNodes[myAddress] = [warehouseNodeHash, farmNodeHash, marketNodeHash]
```

Each node is managed independently. The `/node/overview` page shows all your nodes in a single dashboard.

---

## Compliance and Documents

Upload required documents via:

```
NodesFacet.addSupportingDocument(
  nodeHash,
  url: "ipfs://QmXxx...",
  title: "Livestock Dealer Licence",
  description: "Annual licence from Ministry of Agriculture",
  documentType: "LICENCE",
  isFrozen: true  // Cannot be removed once frozen
)
```

Documents with `isFrozen=true` provide immutable compliance proof.

---

## Related Pages

- [[Core Concepts/Node Network]]
- [[Core Concepts/Real World Asset Tokenisation]]
- [[Smart Contracts/Facets/NodesFacet]]
- [[Smart Contracts/Facets/AssetsFacet]]
- [[Roles/Driver]]
