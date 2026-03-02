# LibDiamond

Core library for EIP-2535 Diamond proxy pattern. Handles facet management and ownership.

## Overview

LibDiamond provides the underlying logic for:

- Diamond storage layout
- Facet addition, replacement, and removal
- Ownership management
- Function selector routing

Based on the reference implementation from Nick Mudge.

## Storage

### DiamondStorage Structure

```solidity
struct DiamondStorage {
    mapping(bytes4 => FacetAndPosition) selectorToFacetAndPosition;
    mapping(address => bytes4[]) facetFunctionSelectors;
    address[] facetAddresses;
    address contractOwner;
}
```

### Storage Position

```solidity
bytes32 constant DIAMOND_STORAGE_POSITION = keccak256('diamond.standard.diamond.storage');
```

## Key Functions

### `diamondStorage()`

Get the diamond storage slot.

```solidity
function diamondStorage() internal pure returns (DiamondStorage storage ds)
```

### `setContractOwner()`

Set the contract owner.

```solidity
function setContractOwner(address _newOwner) internal
```

### `contractOwner()`

Get current owner.

```solidity
function contractOwner() internal view returns (address contractOwner_)
```

### `enforceIsContractOwner()`

Revert if caller is not owner.

```solidity
function enforceIsContractOwner() internal view
```

### `diamondCut()`

Main function for modifying facets.

```solidity
function diamondCut(
    IDiamondCut.FacetCut[] memory _diamondCut,
    address _init,
    bytes memory _calldata
) internal
```

## Internal Functions

### `addFacet()`

Add new facet with selectors.

```solidity
function addFacet(bytes4[] memory _functionSelectors, address _facetAddress) internal
```

### `replaceFacet()`

Replace existing facet implementation.

```solidity
function replaceFacet(bytes4[] memory _functionSelectors, address _facetAddress) internal
```

### `removeFacet()`

Remove selectors from diamond.

```solidity
function removeFacet(bytes4[] memory _functionSelectors) internal
```

### `initializeDiamondCut()`

Call initialization function after facet cut.

```solidity
function initializeDiamondCut(address _init, bytes memory _calldata) internal
```

## Query Functions

### `facetAddress()`

Get facet for selector.

```solidity
function facetAddress(bytes4 _selector) internal view returns (address facetAddr_)
```

### `facetFunctionSelectors()`

Get selectors for facet.

```solidity
function facetFunctionSelectors(address _facetAddr) internal view returns (bytes4[] memory funcSelectors_)
```

### `facetAddresses()`

Get all facet addresses.

```solidity
function facetAddresses() internal view returns (address[] memory facetAddrs_)
```

### `selectorPosition()`

Get position of selector in facet.

```solidity
function selectorPosition(bytes4 _selector) internal view returns (uint16 selPos_)
```

### `selectors()`

Get all selectors in diamond.

```solidity
function selectors() internal view returns (bytes4[] memory selrs_)
```

## Events

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

## Usage Example

```solidity
// Add a new facet
bytes4[] memory selectors = new bytes4[](1);
selectors[0] = MyFunction.selector;

IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
cut[0] = IDiamondCut.FacetCut({
    facetAddress: address(newFacet),
    action: IDiamondCut.FacetCutAction.Add,
    functionSelectors: selectors
});

LibDiamond.diamondCut(cut, address(0), "");
```

## Security Considerations

- Always verify selectors don't overlap
- Use initialization for stateful upgrades
- Consider timelock for production changes

## Related

- [DiamondCutFacet](../Facets/DiamondCutFacet.md) - External interface
- [DiamondLoupeFacet](../Facets/DiamondLoupeFacet.md) - Inspection interface
- [EIP-2535](https://eips.ethereum.org/EIPS/eip-2535)
