// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IDiamondCut } from '../interfaces/IDiamondCut.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { AppStorage } from '../storage/AppStorage.sol';

/**
 * @title DiamondCutFacet
 * @notice Required facet for managing facet additions, replacements, and removals
 * @dev Implements EIP-2535 Diamond Cut interface
 */
contract DiamondCutFacet is IDiamondCut, AppStorage {
    /// @notice Add/replace/remove any number of functions and optionally execute
    ///         an initialization function.
    /// @param _diamondCut Contains the facet addresses and function selectors
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and arguments
    function diamondCut(
        IDiamondCut.FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external override {
        LibDiamond.enforceIsContractOwner();

        for (uint256 i; i < _diamondCut.length; i++) {
            IDiamondCut.FacetCutAction action = _diamondCut[i].action;

            if (action == IDiamondCut.FacetCutAction.Add) {
                LibDiamond.addFacet(_diamondCut[i]);
            } else if (action == IDiamondCut.FacetCutAction.Replace) {
                LibDiamond.replaceFacet(_diamondCut[i]);
            } else if (action == IDiamondCut.FacetCutAction.Remove) {
                LibDiamond.removeFacet(_diamondCut[i]);
            }
        }

        emit DiamondCut(_diamondCut, _init, _calldata);

        // Execute initialization if provided
        if (_init != address(0)) {
            require(
                _init.code.length > 0,
                'DiamondCut: _init address has no code'
            );
            (bool success, ) = _init.delegatecall(_calldata);
            require(success, 'DiamondCut: _init function reverted');
        }
    }
}

