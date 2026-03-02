---
tags: [smart-contracts, facets, erc1155, assets, tokenisation]
---

# AssetsFacet

[[🏠 Home]] > [[Smart Contracts/Overview]] > Facets > AssetsFacet

`AssetsFacet.sol` is the full ERC-1155 implementation embedded inside the Aurellion Diamond. It handles all token operations — minting, transferring, custody — for real-world asset tokens. It mirrors the standalone `AuraAsset.sol` contract but operates within the shared Diamond storage.

---

## Overview

| Property       | Value                                                     |
| -------------- | --------------------------------------------------------- |
| File           | `contracts/diamond/facets/AssetsFacet.sol`                |
| Implements     | `IERC1155`, `IERC1155MetadataURI`                         |
| Storage        | [[Smart Contracts/Libraries/DiamondStorage]] `AppStorage` |
| Access Control | `validNode` modifier, `onlyOwner`                         |

---

## Core Concepts

### Token ID Generation

Token IDs are deterministically generated from asset definition data:

```solidity
tokenID = uint256(keccak256(abi.encode(asset)));
```

This means the same physical asset definition always produces the same token ID, enabling idempotent minting.

### Mint Hash

Each mint event produces a unique hash per account+asset combination:

```solidity
hash = keccak256(abi.encode(account, asset));
```

This hash is used as the key for IPFS metadata, custody tracking, and event indexing.

### Multi-Custodian Custody

Assets are held in custody by the minting node. Multiple nodes can mint the same tokenId; each tracks their custody independently:

```solidity
tokenCustodianAmounts[tokenId][account] += amount;  // Per-custodian
tokenCustodyAmount[tokenId] += amount;               // Global total
```

---

## Functions

### ERC-1155 Standard Functions

#### `balanceOf(address account, uint256 id) → uint256`

Returns the balance of `account` for token `id`. Reads from `erc1155Balances[id][account]`.

#### `balanceOfBatch(address[] accounts, uint256[] ids) → uint256[]`

Batch version of `balanceOf`. Reverts with `ERC1155InvalidArrayLength` if arrays differ in length.

#### `setApprovalForAll(address operator, bool approved)`

Sets `operator` as approved/revoked for all of `msg.sender`'s tokens.
Emits: `ApprovalForAll(msg.sender, operator, approved)`

#### `isApprovedForAll(address account, address operator) → bool`

Returns approval status for `operator` over `account`'s tokens.

#### `safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)`

Transfers `amount` of token `id` from `from` to `to`. Requires caller is `from` or approved operator.

#### `safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)`

Batch transfer. Same approval requirements.

#### `uri(uint256 id) → string`

Returns the base metadata URI (`erc1155URI`). Token-specific metadata at `{uri}{id}`.

#### `setURI(string newuri)`

Owner-only. Sets the base URI.

#### `totalSupply(uint256 id) → uint256`

Returns total minted supply for token `id`.

#### `exists(uint256 id) → bool`

Returns `totalSupply(id) > 0`.

---

### Node Minting

#### `nodeMint(address account, AssetDefinition asset, uint256 amount, string className, bytes data) → (bytes32 hash, uint256 tokenID)`

The primary entry point for tokenising physical assets. Only callable by verified node operators.

**Modifiers:** `validNode(msg.sender)`

**Process:**

1. Validates class is active: `isClassActive[keccak256(abi.encode(className))]`
2. Generates deterministic token ID: `uint256(keccak256(abi.encode(asset)))`
3. Generates mint hash: `keccak256(abi.encode(account, asset))`
4. Stores hash → class and hash → tokenId mappings
5. Appends hash to `ipfsID` array
6. Calls internal `_mint(account, tokenID, amount, data)`
7. Updates custody: `tokenCustodianAmounts[tokenId][account] += amount`
8. Updates global: `tokenCustodyAmount[tokenId] += amount`

**Emits:**

- `MintedAsset(account, hash, tokenId, name, assetClass, className)`
- `CustodyEstablished(tokenId, account, amount)`

**Reverts:**

- `InvalidNode()` — caller has no active valid node
- `ClassInactive()` — asset class is not active
- `AssetAlreadyExists()` — duplicate mint attempt

---

### Class Management

#### `addSupportedClass(string className)`

Owner-only. Activates a new asset class (e.g., "GOAT", "WHEAT", "DIAMOND").
Emits: `SupportedClassAdded(classNameHash, className)`

#### `removeSupportedClass(string className)`

Owner-only. Deactivates a class using tombstoning — the class is marked inactive but not removed from the array (preserves array indices for existing assets).
Emits: `SupportedClassRemoved(classNameHash, className)`

#### `getSupportedClasses() → string[]`

Returns all class names including tombstoned ones. Filter by `isClassActive` for active-only.

---

### Custody Functions

#### `redeemCustody(uint256 tokenId, uint256 amount, address custodian)`

Releases tokens from a custodian's escrow to the redeemer. Validates the redeemer is not the custodian themselves.
Emits: `CustodyReleased(tokenId, custodian, amount, redeemer)`

---

## Events

| Event                   | Parameters                                            | When                       |
| ----------------------- | ----------------------------------------------------- | -------------------------- |
| `MintedAsset`           | `account, hash, tokenId, name, assetClass, className` | Successful node mint       |
| `AssetAttributeAdded`   | `hash, attributeIndex, name, values, description`     | Attribute added to asset   |
| `CustodyEstablished`    | `tokenId, custodian, amount`                          | Tokens minted into custody |
| `CustodyReleased`       | `tokenId, custodian, amount, redeemer`                | Custody released           |
| `SupportedClassAdded`   | `classNameHash, className`                            | New class activated        |
| `SupportedClassRemoved` | `classNameHash, className`                            | Class deactivated          |
| `ApprovalForAll`        | `account, operator, approved`                         | Operator approval changed  |
| `TransferSingle`        | `operator, from, to, id, value`                       | Single token transfer      |
| `TransferBatch`         | `operator, from, to, ids, values`                     | Batch token transfer       |

---

## Errors

| Error                          | Condition                                  |
| ------------------------------ | ------------------------------------------ |
| `InvalidNode()`                | `msg.sender` has no active valid node      |
| `ClassInactive()`              | Asset class is deactivated                 |
| `ClassAlreadyExists()`         | Adding a class that already exists         |
| `ClassNotFound()`              | Removing a class that doesn't exist        |
| `AssetAlreadyExists()`         | Minting a duplicate asset                  |
| `InsufficientBalance()`        | Transfer amount exceeds balance            |
| `ExceedsCustodyAmount()`       | Redemption exceeds custody                 |
| `NoCustodian()`                | No custodian found for tokenId             |
| `CannotRedeemOwnCustody()`     | Custodian attempting to redeem own custody |
| `ERC1155InvalidReceiver`       | Recipient cannot receive ERC-1155          |
| `ERC1155InsufficientBalance`   | Standard ERC-1155 balance error            |
| `ERC1155MissingApprovalForAll` | Not approved to transfer                   |
| `ERC1155InvalidArrayLength`    | Batch arrays differ in length              |

---

## Security

- The `validNode` modifier iterates `ownerNodes[msg.sender]` to find any active+valid node. Nodes must be registered and marked `validNode=true` by an admin.
- Custody tracking prevents double-spending: tokens can only be transferred after custody is properly established.
- ERC-1155 transfer callbacks (`onERC1155Received`) are called for contract recipients.

---

## Integration

**Node Dashboard** uses `nodeMint` when a node operator registers a new asset. See [[Roles/Node Operator]] and [[Frontend/Pages Reference]].

**Indexer** listens to `MintedAsset` events to populate the assets table. See [[Indexer/Schema and Queries]].

---

## Related Pages

- [[Core Concepts/Real World Asset Tokenisation]]
- [[Smart Contracts/Facets/NodesFacet]]
- [[Smart Contracts/Libraries/DiamondStorage]]
- [[Roles/Node Operator]]
