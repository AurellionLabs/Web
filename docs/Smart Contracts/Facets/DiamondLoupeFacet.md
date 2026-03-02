# DiamondLoupeFacet

Implements EIP-2535 Diamond Loupe interface for inspecting diamond state.

## Overview

The DiamondLoupeFacet provides read-only functions to query the diamond proxy's internal state. This is essential for debugging, frontend integrations, and verifying facet deployments.

## Key Functions

### `facets()`

Returns all facets and their function selectors.

```solidity
function facets() external view returns (Facet[] memory facets_)
```

**Returns:**

- `Facet[]` - Array of all facets with addresses and function selectors

### `facetFunctionSelectors(address _facetAddress)`

Gets all function selectors supported by a specific facet.

```solidity
function facetFunctionSelectors(address _facetAddress) external view returns (bytes4[] memory)
```

**Parameters:**

- `_facetAddress` - The facet contract address

**Returns:**

- `bytes4[]` - Array of function selectors

### `facetAddresses()`

Returns all facet addresses used by the diamond.

```solidity
function facetAddresses() external view returns (address[] memory)
```

### `facetAddress(bytes4 _selector)`

Returns the facet that supports the given selector.

```solidity
function facetAddress(bytes4 _selector) external view returns (address)
```

**Parameters:**

- `_selector` - The function selector

**Returns:**

- `address` - Facet address or `address(0)` if not found

### `selectorToFacetAndPosition(bytes4 _selector)`

Returns the facet and selector position for a given selector.

```solidity
function selectorToFacetAndPosition(bytes4 _selector) external view returns (address facetAddr_, uint16 selectorPos_)
```

## Usage Example

```solidity
// Get all facets
IDiamondLoupe.Facet[] memory allFacets = IDiamondLoupe(diamondAddress).facets();

// Find facet for a specific function
address facet = IDiamondLoupe(diamondAddress).facetAddress(this.someFunction.selector);
```

## Related

- [DiamondCutFacet](./DiamondCutFacet.md) - For modifying facets
- [EIP-2535](https://eips.ethereum.org/EIPS/eip-2535) - Diamond Standard
