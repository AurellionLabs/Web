// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IOwnership } from '../interfaces/IOwnership.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title OwnershipFacet
 * @notice Recommended facet for ownership management and transfer
 * @dev Implements standard ownership pattern with two-step transfer
 */
contract OwnershipFacet is IOwnership, Initializable {
    function initialize(address _owner) public initializer {
        LibDiamond.setContractOwner(_owner);
    }

    /// @notice Returns the address of the current owner.
    function owner() public view override returns (address) {
        return LibDiamond.contractOwner();
    }

    /// @notice Transfers ownership of the contract to a new account (`newOwner`).
    function transferOwnership(address _newOwner) public override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.setContractOwner(_newOwner);
    }

    /// @notice Accepts ownership of the contract.
    function acceptOwnership() public pure override {}

    /// @notice Leaves the contract without an owner.
    function renounceOwnership() public override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.setContractOwner(address(0));
    }
}
