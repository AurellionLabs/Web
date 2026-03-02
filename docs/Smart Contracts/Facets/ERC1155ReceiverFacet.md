# ERC1155ReceiverFacet

Enables the Diamond to receive ERC1155 tokens for order execution and custody.

## Overview

Implements the IERC1155Receiver interface, allowing the Diamond proxy to receive ERC1155 tokens via `safeTransferFrom`. This is essential for:

- Holding token assets for order execution
- Custody of base tokens during sell orders
- Order book management

## Interface

Inherits from IERC1155Receiver and IERC165.

## Key Functions

### `onERC1155Received()`

Called after a single ERC1155 transfer.

```solidity
function onERC1155Received(
    address operator,
    address from,
    uint256 id,
    uint256 value,
    bytes calldata data
) external pure returns (bytes4)
```

**Parameters:**

- `operator` - Address that initiated the transfer
- `from` - Address the tokens are transferred from
- `id` - Token ID
- `value` - Amount transferred
- `data` - Additional data

**Returns:**

- `IERC1155Receiver.onERC1155Received.selector`

### `onERC1155BatchReceived()`

Called after a batch ERC1155 transfer.

```solidity
function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] calldata ids,
    uint256[] calldata values,
    bytes calldata data
) external pure returns (bytes4)
```

### `supportsInterface()`

Query if a contract implements an interface.

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

**Supported Interfaces:**

- `IERC1155Receiver` (0x4e2312e0)
- `IERC165` (0x01ffc9a7)

## Why It's Needed

When users place sell orders, their tokens are transferred to the Diamond:

```solidity
// From seller's perspective
IERC1155(baseToken).safeTransferFrom(
    seller,
    diamondAddress,
    tokenId,
    amount,
    ""
);
```

The Diamond must implement `onERC1155Received` to accept these transfers.

## Security Considerations

- **No logic**: These functions are intentionally no-ops (return selector only)
- **No storage modification**: Prevents reentrancy attacks
- **Trust assumption**: Users must trust the Diamond contract logic to handle tokens properly

## Related

- [OrderRouterFacet](./OrderRouterFacet.md) - Order placement
- [CLOBFacet](./CLOBFacet.md) - CLOB order management
- [NodesFacet](./NodesFacet.md) - Node token management
