---
tags: [smart-contracts, facets, nodes, registry]
---

# NodesFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > NodesFacet

`NodesFacet.sol` manages the **registry of physical storage and logistics nodes** that form the backbone of Aurellion's real-world infrastructure. Nodes are verified physical locations (warehouses, farms, markets) that can store assets, mint tokens, and facilitate deliveries.

---

## Overview

| Property | Value                                                                |
| -------- | -------------------------------------------------------------------- |
| File     | `contracts/diamond/facets/NodesFacet.sol`                            |
| Inherits | `Initializable`                                                      |
| Storage  | [[Smart Contracts/Libraries/DiamondStorage]] — Node Registry section |
| Key role | `nodeAdmins` mapping for delegated node management                   |

---

## Node Data Structure

```solidity
struct Node {
    address owner;       // Node owner wallet
    string nodeType;     // E.g., "WAREHOUSE", "FARM", "MARKET"
    uint256 capacity;    // Total storage capacity
    uint256 createdAt;   // Registration timestamp
    bool active;         // Is the node operational?
    bool validNode;      // Has the node been validated by admin?
    string lat;          // GPS latitude
    string lng;          // GPS longitude
    string addressName;  // Human-readable location name
}
```

A node is **active** when registered. It becomes **validNode=true** when an admin validates it, unlocking the ability to mint tokens via `AssetsFacet.nodeMint()`.

---

## Functions

### Node Registration

#### `registerNode(string nodeType, uint256 capacity, string lat, string lng, string addressName) → bytes32 nodeHash`

Registers a new node for the caller (`msg.sender`).

**Process:**

1. Generates `nodeHash = keccak256(owner, block.timestamp, nodeType)`
2. Creates `Node` struct: `active=true`, `validNode=false`
3. Adds to `ownerNodes[owner]` and `nodeList`
4. Increments `totalNodes`

**Emits:** `NodeRegistered(nodeHash, owner, nodeType)`

---

#### `registerNodeForOwner(address owner, string nodeType, uint256 capacity, string lat, string lng, string addressName) → bytes32 nodeHash`

Admin-only registration on behalf of another address. Uses `nodeAdmins[msg.sender]` or `onlyOwner`.

---

### Node Management

#### `updateNodeLocation(bytes32 nodeHash, string lat, string lng, string addressName)`

Updates a node's GPS location. Callable by node owner or admin.

**Emits:** `UpdateLocation(addressName, lat, lng, nodeHash)`

#### `updateNodeOwner(bytes32 nodeHash, address newOwner)`

Transfers node ownership to a new address. Only callable by current owner.

**Emits:** `UpdateOwner(newOwner, nodeHash)`

#### `deactivateNode(bytes32 nodeHash)`

Deactivates a node. Only callable by node owner or admin.

**Emits:** `NodeDeactivated(nodeHash)`

#### `validateNode(bytes32 nodeHash)`

Admin-only. Sets `validNode=true`, enabling the node to mint assets.

#### `setNodeAdmin(address admin, bool status)`

Owner-only. Grants or revokes node admin privileges.

---

### Asset Support

Nodes declare which asset types they can store and at what price/capacity.

#### `addSupportedAsset(bytes32 nodeHash, address token, uint256 tokenId, uint256 price, uint256 capacity)`

Adds a new supported asset to a node.

**Validates:** Caller owns the node.

**Creates:** `NodeAsset` struct in `nodeAssets[nodeHash][assetIndex]`

**Emits:** `SupportedAssetAdded(nodeHash, token, tokenId, price, capacity)`

#### `updateSupportedAssets(bytes32 nodeHash, NodeAsset[] assets)`

Batch update of supported assets.

**Emits:** `SupportedAssetsUpdated(nodeHash, count)`

#### `updateNodeCapacity(bytes32 nodeHash, uint256[] quantities)`

Updates capacity for each supported asset.

**Emits:** `NodeCapacityUpdated(nodeHash, quantities)`

#### `reduceCapacityForOrder(bytes32 nodeHash, address token, uint256 tokenId, uint256 amount)`

Called by AuSysFacet/BridgeFacet to atomically reduce node capacity when an order is placed. Prevents overselling.

**Process:**

1. Finds matching asset in `nodeAssets[nodeHash]`
2. Validates `capacity >= amount`
3. Decrements capacity

---

### Token Inventory

Nodes maintain an internal token balance within the Diamond (distinct from ERC-1155 balances):

#### `depositTokensToNode(bytes32 nodeHash, uint256 tokenId, uint256 amount)`

Deposits ERC-1155 tokens from caller's wallet into a node's internal inventory.

**Emits:** `TokensDepositedToNode(nodeHash, tokenId, amount, depositor)`

#### `withdrawTokensFromNode(bytes32 nodeHash, uint256 tokenId, uint256 amount, address recipient)`

Withdraws tokens from a node's internal inventory to a recipient wallet.

**Validates:** Caller owns the node, sufficient balance.

**Emits:** `TokensWithdrawnFromNode(nodeHash, tokenId, amount, recipient)`

#### `transferTokensBetweenNodes(bytes32 fromNode, bytes32 toNode, uint256 tokenId, uint256 amount)`

Moves tokens between two nodes owned by the same address.

**Emits:** `TokensTransferredBetweenNodes(fromNode, toNode, tokenId, amount)`

#### `getNodeTokenBalance(bytes32 nodeHash, uint256 tokenId) → uint256`

Returns the internal token balance for a node.

---

### Supporting Documents

Nodes can attach supporting documents (compliance certs, licences, photos):

#### `addSupportingDocument(bytes32 nodeHash, string url, string title, string description, string documentType, bool isFrozen)`

Adds a document reference.

**Emits:** `SupportingDocumentAdded(nodeHash, url, title, description, documentType, isFrozen, timestamp, addedBy)`

#### `removeSupportingDocument(bytes32 nodeHash, string url)`

Removes a document reference.

**Emits:** `SupportingDocumentRemoved(nodeHash, url, timestamp, removedBy)`

---

### View Functions

#### `getNode(bytes32 nodeHash) → Node`

Returns full node data.

#### `getOwnerNodes(address owner) → bytes32[]`

Returns all node hashes owned by an address.

#### `getNodeAssets(bytes32 nodeHash) → NodeAsset[]`

Returns all supported assets for a node.

#### `getNodeCount() → uint256`

Returns total registered nodes.

#### `getAllNodes() → address[]`

Returns all node addresses in the registry.

---

## Events

| Event                                                            | Description           |
| ---------------------------------------------------------------- | --------------------- |
| `NodeRegistered(nodeHash, owner, nodeType)`                      | New node registered   |
| `NodeUpdated(nodeHash, nodeType, capacity)`                      | Node data updated     |
| `NodeDeactivated(nodeHash)`                                      | Node deactivated      |
| `UpdateLocation(addressName, lat, lng, node)`                    | Location updated      |
| `UpdateOwner(owner, node)`                                       | Ownership transferred |
| `UpdateStatus(status, node)`                                     | Node status changed   |
| `NodeCapacityUpdated(nodeHash, quantities)`                      | Capacity updated      |
| `SupportedAssetAdded(nodeHash, token, tokenId, price, capacity)` | Asset added           |
| `SupportedAssetsUpdated(nodeHash, count)`                        | Assets batch updated  |
| `TokensMintedToNode(nodeHash, tokenId, amount, minter)`          | Tokens minted to node |
| `TokensTransferredBetweenNodes(from, to, tokenId, amount)`       | Inter-node transfer   |
| `TokensWithdrawnFromNode(nodeHash, tokenId, amount, recipient)`  | Withdrawal            |
| `TokensDepositedToNode(nodeHash, tokenId, amount, depositor)`    | Deposit               |
| `SupportingDocumentAdded(nodeHash, url, ...)`                    | Document attached     |
| `SupportingDocumentRemoved(nodeHash, url, ...)`                  | Document removed      |

---

## Node Lifecycle

```
Register (active=true, validNode=false)
        ↓
Admin Validates (validNode=true)
        ↓
Add Supported Assets
        ↓
Deposit Tokens / Mint Tokens
        ↓
List tokens on CLOB (placeNodeSellOrder)
        ↓
Process Orders / Manage Journeys
        ↓
Deactivate (active=false)
```

---

## Related Pages

- [[Roles/Node Operator]]
- [[Smart Contracts/Facets/AssetsFacet]]
- [[Core Concepts/Node Network]]
- [[Frontend/Pages Reference]]
