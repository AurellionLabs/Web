# OwnershipFacet

Standard ownership management facet implementing two-step ownership transfer pattern.

## Overview

Provides basic ownership functionality for the diamond proxy. Uses a two-step transfer pattern where the new owner must accept ownership.

## Key Functions

### `initialize(address _owner)`

Initializes the contract with an owner. Called once during deployment.

```solidity
function initialize(address _owner) public initializer
```

### `owner()`

Returns the current owner address.

```solidity
function owner() public view returns (address)
```

### `transferOwnership(address _newOwner)`

Transfers ownership to a new account. The new owner must call `acceptOwnership()` to complete the transfer.

```solidity
function transferOwnership(address _newOwner) public
```

**Parameters:**
- `_newOwner` - Address of the new owner

**Requirements:**
- Caller must be current owner

### `acceptOwnership()`

Accepts the ownership transfer. Must be called by the new owner after `transferOwnership()`.

```solidity
function acceptOwnership() public pure
```

### `renounceOwnership()`

Renounces ownership, setting owner to `address(0)`. Irreversible.

```solidity
function renounceOwnership() public
```

**Warning:** After renouncing, there is no way to recover ownership unless the diamond was deployed with a different owner mechanism.

## Usage

```solidity
// Get current owner
address currentOwner = IOwnership(diamondAddress).owner();

// Transfer ownership (step 1)
IOwnership(diamondAddress).transferOwnership(newOwnerAddress);

// New owner accepts (step 2)
IOwnership(diamondAddress).acceptOwnership();
```

## Access Control

Most write functions in the diamond use `LibDiamond.enforceIsContractOwner()` which delegates to this facet:

```solidity
LibDiamond.enforceIsContractOwner();
```

## Related

- [LibDiamond](./LibDiamond.md) - Underlying library
- [DiamondCutFacet](./DiamondCutFacet.md) - For upgrading facets
