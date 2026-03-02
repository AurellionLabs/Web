# DiamondCutFacet

Required facet for managing facet additions, replacements, and removals. Implements EIP-2535 Diamond Cut interface.

## Overview

The DiamondCutFacet is the only way to modify the diamond's facet composition. It enables:

- Adding new facets with functions
- Replacing existing facet implementations
- Removing functions from the diamond

This is a critical security component - only the contract owner should have access.

## Key Functions

### `diamondCut()`

Add/replace/remove any number of functions and optionally execute an initialization function.

```solidity
function diamondCut(
    IDiamondCut.FacetCut[] calldata _diamondCut,
    address _init,
    bytes calldata _calldata
) external override;
```

**Parameters:**

- `_diamondCut` - Array of FacetCut structs containing facet addresses and function selectors
- `_init` - Address of contract or facet to execute for initialization
- `_calldata` - Function call data for initialization

## FacetCut Structure

```solidity
struct FacetCut {
    address facetAddress;    // Address of facet to add/replace/remove
    FacetCutAction action;   // Add, Replace, or Remove
    bytes4[] functionSelectors; // Function selectors to modify
}
```

### Actions

| Action    | Description                           |
| --------- | ------------------------------------- |
| `Add`     | Add new facet with selectors          |
| `Replace` | Replace existing facet implementation |
| `Remove`  | Remove selectors from diamond         |

## Examples

### Adding a New Facet

```solidity
IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);

cut[0] = IDiamondCut.FacetCut({
    facetAddress: newFacetAddress,
    action: IDiamondCut.FacetCutAction.Add,
    functionSelectors: selectors
});

IDiamondCut(diamondAddress).diamondCut(cut, address(0), "");
```

### Replacing a Facet

```solidity
cut[0] = IDiamondCut.FacetCut({
    facetAddress: updatedFacetAddress,
    action: IDiamondCut.FacetCutAction.Replace,
    functionSelectors: selectors
});
```

### Removing Functions

```solidity
cut[0] = IDiamondCut.FacetCut({
    facetAddress: address(0),
    action: IDiamondCut.FacetCutAction.Remove,
    functionSelectors: selectors
});
```

## Initialization

For facet upgrades requiring initialization:

```solidity
// With initialization
IDiamondCut(diamondAddress).diamondCut(
    cut,
    initContractAddress,
    abi.encodeWithSignature("initialize(uint256)", 100)
);
```

## Security Considerations

- **Only owner** should call this function
- **Verify selectors** don't overlap with existing ones for Add actions
- **Test thoroughly** in testnet before production deployment
- Consider a **timelock** for production upgrades

## Related

- [DiamondLoupeFacet](./DiamondLoupeFacet.md) - For inspecting facets
- [Upgrading Facets](../Technical Reference/Upgrading Facets.md)
- [EIP-2535](https://eips.ethereum.org/EIPS/eip-2535)
