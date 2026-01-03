// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IOwnership } from '../interfaces/IOwnership.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { AppStorage } from '../storage/AppStorage.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title OwnershipFacet
 * @notice Recommended facet for ownership management and transfer
 * @dev Implements standard ownership pattern with two-step transfer
 */
contract OwnershipFacet is IOwnership, AppStorage, Initializable {
    function initialize(address _owner) public initializer {
        require(s.owner == address(0), 'Already initialized');
        s.owner = _owner;
        s.initialized = true;
    }

    function owner() external view override returns (address owner_) {
        owner_ = s.owner;
    }

    function transferOwnership(address _newOwner) external override {
        LibDiamond.enforceIsContractOwner();
        s.pendingOwner = _newOwner;
    }

    function transferOwnershipWithAcceptance(
        address _newOwner,
        address _pendingOwner
    ) external override {
        LibDiamond.enforceIsContractOwner();
        require(
            _pendingOwner == s.pendingOwner,
            'Not the pending owner'
        );
        require(
            _pendingOwner != address(0),
            'Cannot transfer to zero address'
        );

        address previousOwner = s.owner;
        s.owner = _newOwner;
        s.pendingOwner = address(0);

        emit OwnershipTransferred(previousOwner, _newOwner);
    }
}

